import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Gemini sometimes wraps JSON in ```json ... ``` fences even when told not to — strip them defensively.
const cleanJsonResponse = (text) => {
    return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
};

/**
 * Analyzes a resume against a job description in a single Gemini call.
 * Returns { summary, matchScore }.
 *
 * @param {string} resumePath - absolute path to the resume PDF on disk
 * @param {string} jobDescriptionText - plain-text job description to match against
 */
export const analyzeResume = async (resumePath, jobDescriptionText) => {
    const fileBuffer = fs.readFileSync(resumePath);
    const pdfData = await pdfParse(fileBuffer);
    const resumeText = pdfData.text;

    if (!resumeText || resumeText.trim().length === 0) {
        throw new Error("Could not extract text from resume PDF");
    }

    const prompt = `
You are an expert technical recruiter assistant. Analyze the candidate's resume against the job description below and produce BOTH a recruiter-friendly summary AND a match score.

For the summary:
- Start with a professional summary of exactly 2-3 lines.
- After the summary, provide 4-5 bullet points, each a single line.
- Focus on education, technical skills, projects, experience, and notable achievements.
- Keep the entire summary section under 120 words.
- Do NOT use headings such as "Summary", "Key Highlights", or any other title.
- Do NOT include introductory or concluding remarks.
- Maintain a professional and concise tone.

For the match score:
- Score from 0 to 100 representing how well the resume matches the job description's required skills, experience level, and responsibilities.
- 90-100 = excellent match, 70-89 = strong match, 40-69 = partial match, below 40 = weak match.

Respond with ONLY valid JSON, no markdown code fences, no commentary before or after, in exactly this shape:
{
  "summary": "string",
  "matchScore": number
}

Job Description:
${jobDescriptionText || "No job description provided."}

Resume:
${resumeText}
`;

    const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });
    const rawText = result.text;

    if (!rawText) {
        throw new Error("Gemini returned an empty response (possibly blocked by safety filters)");
    }

    let parsed;
    try {
        parsed = JSON.parse(cleanJsonResponse(rawText));
    } catch (err) {
        throw new Error(`Failed to parse AI response as JSON: ${err.message}`);
    }

    const { summary, matchScore } = parsed;

    if (typeof summary !== "string" || summary.trim().length === 0) {
        throw new Error("AI response missing a valid summary");
    }

    let score = Number(matchScore);
    if (Number.isNaN(score)) {
        score = null; // don't silently store a wrong number if Gemini returns garbage
    } else {
        score = Math.min(100, Math.max(0, Math.round(score)));
    }

    return {
        summary,
        matchScore: score,
    };
};