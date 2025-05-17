const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function askGeminiSQL(prompt) {
  try {
    const model = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: prompt,
    });

    console.log("initial response", model.text);
    const match = model.text.match(/```(?:sql)?\s*([\s\S]*?)\s*```/i);
    if (match) {
      const sql = match[1].trim();
      console.log("Extracted SQL:", sql);
      return sql;
    }
    return model.text;
  } catch (error) {
    console.error("Gemini SQL error:", error);
    return `ERROR: ${error.message}`;
  }
}

async function askGeminiExplanation(prompt) {
  try {
    const model = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: prompt,
    });

    console.log("raw response", model.text);
    return model.text; // return full explanation + JSON block
  } catch (error) {
    console.error("Gemini explain error:", error);
    return `ERROR: ${error.message}`;
  }
}

module.exports = { askGeminiSQL, askGeminiExplanation };
