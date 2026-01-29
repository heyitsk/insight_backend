const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function askGeminiSQL(prompt) {
  try {
    const enhancedPrompt = `
    You are an expert SQL analyst. Generate ONLY the SQL query, no explanations.
    
    IMPORTANT RULES:
    1. Return ONLY valid SQL code
    2. Use proper SQL syntax for the database type
    3. Handle potential NULL values and data type mismatches
    4. Use appropriate JOINs when multiple tables are needed
    5. Add LIMIT clauses for potentially large result sets (default LIMIT 100)
    6. Use proper date formatting and comparisons
    7. Handle case-insensitive string comparisons when appropriate
    
    ${prompt}
    
    Return only the SQL query:`;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(enhancedPrompt);
    const text = result.response.text();

    console.log("initial response", text);
    const match = text.match(/```(?:sql)?\s*([\s\S]*?)\s*```/i);
    if (match) {
      const sql = match[1].trim();
      console.log("Extracted SQL:", sql);
      return sql;
    }
    return text;
  } catch (error) {
    console.error("Gemini SQL error:", error);
    return `ERROR: ${error.message}`;
  }
}

async function askGeminiExplanation(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("raw response", text);
    return text; // return full explanation + JSON block
  } catch (error) {
    console.error("Gemini explaination error:", error);
    return `ERROR: ${error.message}`;
  }
}

async function generateFollowUpQuestions(dataContext, conversationHistory) {
  try {
    const prompt = `
    Based on the following data analysis context and conversation history, generate 3 intelligent follow-up questions that would provide deeper business insights.
    
    Data Context:
    ${JSON.stringify(dataContext, null, 2)}
    
    Recent Conversation:
    ${conversationHistory}
    
    Generate questions that:
    1. Dig deeper into the current findings
    2. Explore related business metrics
    3. Identify potential opportunities or concerns
    4. Are specific and actionable
    
    Return ONLY a JSON array of strings:
    ["Question 1", "Question 2", "Question 3"]
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("follow up questions: ", text);

    // Try to parse JSON response
    try {
      const jsonMatch = text.match(/\[([\s\S]*?)\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(text);
    } catch (parseError) {
      console.warn("Failed to parse follow-up questions JSON:", parseError);
      return [
        "What trends do you see in this data?",
        "How does this compare to previous periods?",
        "What factors might be driving these results?",
      ];
    }
  } catch (error) {
    console.error("Follow-up questions error:", error);
    return [
      "Can you show me more details about the top results?",
      "What patterns do you notice in this data?",
      "How has this changed over time?",
    ];
  }
}

// New function for data exploration suggestions
async function generateExplorationSuggestions(schemaInfo, conversationSummary) {
  try {
    const prompt = `
Based on this database schema and conversation history, suggest 5 diverse analytical questions that would provide valuable business insights:

Database Schema:
${schemaInfo}

Previous Questions Context:
${conversationSummary || "No previous conversation"}

Generate questions covering different analytical approaches:
- Time-based analysis (trends, seasonality)
- Comparative analysis (rankings, comparisons)
- Statistical analysis (correlations, distributions)
- Business intelligence (KPIs, performance metrics)
- Data quality and anomaly detection

Return ONLY a JSON array of 5 questions:
["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]
`;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("exploration suggestions: ", text);

    try {
      const jsonMatch = text.match(/\[([\s\S]*?)\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(text);
    } catch (parseError) {
      console.warn("Failed to parse exploration suggestions:", parseError);
      return [
        "What are the top performing items this month?",
        "Show me trends over the last quarter",
        "Which categories have the highest growth?",
        "Are there any unusual patterns in the data?",
        "What's the distribution of key metrics?",
      ];
    }
  } catch (error) {
    console.error("Exploration suggestions error:", error);
    return [
      "What are the most important trends in my data?",
      "Show me the best and worst performing areas",
      "What correlations exist between different metrics?",
      "How has performance changed over time?",
      "What anomalies or outliers should I be aware of?",
    ];
  }
}

// Function to validate and improve SQL queries
async function validateAndImproveSQL(
  sqlQuery,
  schemaInfo,
  errorMessage = null
) {
  try {
    const prompt = `
    You are an expert SQL validator and optimizer. 
    
    Original SQL Query:
    ${sqlQuery}
    
    Database Schema:
    ${schemaInfo}
    
    ${errorMessage ? `Previous Error: ${errorMessage}` : ""}
    
    Please:
    1. Fix any syntax errors
    2. Ensure proper table/column references based on schema
    3. Add appropriate error handling (NULL checks, data type conversions)
    4. Optimize for performance if needed
    5. Add reasonable LIMIT if missing
    
    Return ONLY the corrected SQL query:
    `;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("improve sql: ", text);

    // Extract SQL from response
    const codeBlockMatch = text.match(/```(?:sql)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    return text.trim();
  } catch (error) {
    console.error("SQL validation error:", error);
    throw new Error(`SQL Validation Failed: ${error.message}`);
  }
}

module.exports = {
  askGeminiSQL,
  askGeminiExplanation,
  generateFollowUpQuestions,
  generateExplorationSuggestions,
  validateAndImproveSQL,
};
