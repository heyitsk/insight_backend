// import { GoogleGenAI } from "@google/genai";
// import dotenv from "dotenv";
// dotenv.config();
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function askGemini(prompt) {
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
    console.error("Gemini error:", error);
    return `ERROR: ${error.message}`;
  }
}

//testing function
// async function askGemini(prompt) {
//   //   console.log("Mocked Gemini prompt:", prompt);
//   return "SELECT * FROM customer1;"; // or any static SQL/query
// }
// await askGemini();
module.exports = { askGemini };
