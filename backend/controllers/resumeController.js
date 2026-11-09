import axios from "axios";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const PYTHON_BACKEND_URL = (
  process.env.AI_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");


// =====================
// Helper: Extract Analysis
// =====================
const extractAnalysis = (data) => {
  let current = data;

  for (let i = 0; i < 5; i++) {
    if (
      current &&
      typeof current === "object" &&
      !Array.isArray(current) &&
      current.ats_score !== undefined
    ) {
      return current;
    }

    if (!current || typeof current !== "object") {
      break;
    }

    current =
      current.analysis ||
      current.report ||
      current.data ||
      current.result;
  }

  return null;
};


// =====================
// Helper: Normalize Arrays
// =====================
const normalizeArray = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (item && typeof item === "object") {
        return String(
          item.skill ||
          item.keyword ||
          item.text ||
          item.name ||
          ""
        ).trim();
      }

      return "";
    })
    .filter(Boolean);
};


// =====================
// Generate Job Description
// =====================
export const generateJobDescription = async (req, res) => {
  const role = String(req.body?.role || "").trim();

  if (!role) {
    return res.status(400).json({
      success: false,
      error: "Please select a target role",
    });
  }

  try {
    const response = await axios.post(
      `${PYTHON_BACKEND_URL}/generate-job-description`,
      { role },
      { timeout: 60000 }
    );

    const jobDescription = response.data?.job_description;

    if (
      typeof jobDescription !== "string" ||
      !jobDescription.trim()
    ) {
      return res.status(502).json({
        success: false,
        error: "The AI service returned an invalid job description",
      });
    }

    return res.status(200).json({
      success: true,
      role,
      jobDescription: jobDescription.trim(),
    });

  } catch (error) {
    console.error(
      "Job description generation error:",
      error.response?.data || error.message
    );

    const isTimeout =
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT";

    return res.status(502).json({
      success: false,
      error: isTimeout
        ? "Job description generation timed out. Please try again."
        : "Unable to generate a job description right now.",
    });
  }
};


// =====================
// Extract Resume Text
// =====================
export const extractResumeText = async (req, res) => {
  try {
    const file = req.file;

    if (!file?.buffer) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    if (file.mimetype !== "application/pdf") {
      return res.status(400).json({
        success: false,
        error: "Please upload a PDF file",
      });
    }

    const data = await pdfParse(file.buffer);
    const extractedText = (data.text || "").trim();

    if (!extractedText) {
      return res.status(400).json({
        success: false,
        error: "Could not extract text from this PDF.",
      });
    }

    console.log("PDF TEXT EXTRACTED:", extractedText.length, "characters");

    return res.status(200).json({
      success: true,
      text: extractedText,
    });

  } catch (error) {
    console.error("PDF Parse Error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Failed to parse PDF",
    });
  }
};


// =====================
// Analyze Resume - ATS
// =====================
export const analyzeResume = async (req, res) => {
  try {
    const file = req.file;

    // Validate uploaded file.
    if (!file?.buffer) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    // Validate PDF.
    if (file.mimetype !== "application/pdf") {
      return res.status(400).json({
        success: false,
        error: "Please upload a PDF resume",
      });
    }

    // Extract PDF text.
    const data = await pdfParse(file.buffer);

    const extractedText = (data.text || "")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .trim();

    if (!extractedText) {
      return res.status(400).json({
        success: false,
        error: "Could not extract text from resume. Please try another PDF.",
      });
    }

    console.log(
      "EXTRACTED RESUME TEXT LENGTH:",
      extractedText.length
    );

    // Get target role.
    const role = String(
      req.body?.role || "Software Engineer"
    ).trim();

    // Get job description.
    const jobDescription = String(
      req.body?.job_description || ""
    ).trim();

    if (!jobDescription) {
      return res.status(400).json({
        success: false,
        error: "Please provide a job description",
      });
    }

    // Send resume to Python Llama API.
    const response = await axios.post(
      `${PYTHON_BACKEND_URL}/analyze-resume`,
      {
        text: extractedText,
        role,
        job_description: jobDescription,
      },
      {
        timeout: 150000,
      }
    );


    // Extract actual analysis object.
    const analysis = extractAnalysis(response.data);

    if (!analysis) {
      console.error("Could not extract analysis:", response.data);

      return res.status(502).json({
        success: false,
        error: "Invalid analysis response received from AI service",
      });
    }

    // Validate ATS score.
    const score = Number(analysis.ats_score);

    if (
      !Number.isFinite(score) ||
      score < 0 ||
      score > 100
    ) {
      console.error("Invalid ATS score:", analysis.ats_score);

      return res.status(502).json({
        success: false,
        error: "Invalid ATS score received from AI service",
      });
    }

    // Normalize all seven fields.
    const result = {
      ats_score: Math.round(score),

      matching_skills: normalizeArray(
        analysis.matching_skills
      ),

      missing_skills: normalizeArray(
        analysis.missing_skills
      ),

      missing_keywords: normalizeArray(
        analysis.missing_keywords
      ),

      strengths: normalizeArray(
        analysis.strengths
      ),

      weaknesses: normalizeArray(
        analysis.weaknesses
      ),

      recommendations: normalizeArray(
        analysis.recommendations
      ),
    };


    // Return complete ATS analysis.
    return res.status(200).json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error(
      "\n========== RESUME ANALYSIS ERROR =========="
    );

    console.error(
      error.response?.data || error.message
    );

    const isTimeout =
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT";

    return res.status(
      isTimeout ? 504 : error.response?.status || 500
    ).json({
      success: false,

      error: isTimeout
        ? "Resume analysis timed out. Please try again."
        : error.response?.data?.detail ||
          error.response?.data?.error ||
          "Resume analysis failed",
    });
  }
};
