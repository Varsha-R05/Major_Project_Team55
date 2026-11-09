import { useState } from "react";
import axios from "axios";
import { generateJobDescription } from "../services/api";

export default function ResumeAnalyzer() {
  const roles = [
    "Backend Developer",
    "Frontend Developer",
    "Full Stack Developer",
    "Java Developer",
    "Python Developer",
    "Software Engineer",
    "Data Scientist",
    "Data Analyst",
    "Data Engineer",
    "Machine Learning Engineer",
    "AI Engineer",
    "DevOps Engineer",
    "Cloud Engineer",
    "Android Developer",
    "iOS Developer",
    "Mobile Developer",
    "QA Engineer",
    "Cyber Security Engineer",
    "UI UX Designer",
    "Database Administrator",
    "Business Analyst",
    "Product Manager"
  ];

  const [file, setFile] = useState(null);
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingJd, setGeneratingJd] = useState(false);
  const [result, setResult] = useState(null);

  // Normalize API values into arrays of strings.
  const normalizeArray = (value) => {
    if (!Array.isArray(value)) return [];

    return value
      .map((item) => {
        if (typeof item === "string") return item;

        if (item && typeof item === "object") {
          return item.skill || item.keyword || item.text || item.name || "";
        }

        return "";
      })
      .filter(Boolean);
  };

  // Generate job description.
  const handleGenerateJobDescription = async () => {
    if (!role) {
      alert("Please select target role first");
      return;
    }

    setGeneratingJd(true);

    try {
      const data = await generateJobDescription(role);

      if (!data?.jobDescription?.trim()) {
        throw new Error("Generated job description was empty");
      }

      setJd(data.jobDescription);
    } catch (error) {
      console.error("Job description generation failed:", error);

      alert(
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        "Unable to generate job description"
      );
    } finally {
      setGeneratingJd(false);
    }
  };

  // Analyze resume.
  const handleAnalyze = async () => {
    if (!file) {
      alert("Please upload your resume PDF");
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Please upload a valid PDF file");
      return;
    }

    if (!role) {
      alert("Please select target role");
      return;
    }

    if (!jd.trim()) {
      alert("Please provide a job description");
      return;
    }

    const formData = new FormData();

    formData.append("file", file);
    formData.append("role", role);
    formData.append("job_description", jd);

    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/resume/analyze-resume`,
        formData,
        {
          timeout: 150000
        }
      );

      const data = response.data;


      if (data?.success === false) {
        throw new Error(data.error || data.detail || "Resume analysis failed");
      }

      // Support flat and nested API response structures.
      const analysis =
      data?.analysis?.analysis ||
      data?.analysis ||
      data?.report?.analysis ||
      data?.report ||
      data?.data?.analysis ||
      data?.data ||
      data;


      if (!analysis || typeof analysis !== "object") {
        throw new Error("Invalid analysis response received");
      }

      const score = Number(analysis.ats_score);

      if (!Number.isFinite(score) || score < 0 || score > 100) {
        throw new Error("Invalid ATS score received");
      }

      const matchingSkills = normalizeArray(analysis.matching_skills);
      const missingSkills = normalizeArray(analysis.missing_skills);
      const missingKeywords = normalizeArray(analysis.missing_keywords);


      // Store normalized ATS analysis.
      setResult({
        ats_score: score,
        matching_skills: matchingSkills,
        missing_skills: missingSkills,
        missing_keywords: missingKeywords,
        strengths: normalizeArray(analysis.strengths),
        weaknesses: normalizeArray(analysis.weaknesses),
        recommendations: normalizeArray(analysis.recommendations)
      });

    } catch (error) {
      console.error("Resume analysis error:", error);

      alert(
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        "Resume analysis failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // Score label.
  const getScoreLabel = (score) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 65) return "Good Match";
    if (score >= 45) return "Moderate Match";
    return "Needs Improvement";
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 65) return "text-blue-600";
    if (score >= 45) return "text-yellow-600";
    return "text-red-600";
  };

  // Reusable result section.
  const renderListSection = (
    title,
    subtitle,
    items,
    icon,
    color,
    bgColor,
    borderColor
  ) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className={`${bgColor} p-3 rounded-xl`}>
            <span className="text-xl">{icon}</span>
          </div>

          <div>
            <h3 className={`text-xl font-bold ${color}`}>
              {title}
            </h3>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>

          <span className="ml-auto bg-gray-100 text-gray-700 text-sm font-semibold px-3 py-1 rounded-full">
            {items.length}
          </span>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className={`${bgColor} ${borderColor} border p-4 rounded-xl text-gray-700 leading-relaxed`}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 text-gray-900 px-4 py-10 sm:px-8">

      {/* HEADER */}
      <div className="max-w-6xl mx-auto text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Resume Analyzer
        </h1>

        <p className="text-gray-500 mt-4 text-base sm:text-lg max-w-2xl mx-auto">
          Check your ATS compatibility, compare your skills
          with job requirements, and discover ways to improve
          your resume.
        </p>
      </div>

      {/* INPUT CARD */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-lg border border-gray-200 p-6 sm:p-9 space-y-7">

        {/* TARGET ROLE */}
        <div>
          <label className="block mb-2 font-semibold text-gray-700">
            Target Role
          </label>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={loading}
            className="w-full p-4 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none transition"
          >
            <option value="">Select Target Role</option>

            {roles.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* JOB DESCRIPTION */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <label className="font-semibold text-gray-700">
              Job Description
              <span className="text-red-500 ml-1">*</span>
            </label>

            <button
              type="button"
              onClick={handleGenerateJobDescription}
              disabled={generatingJd || loading}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400 transition"
            >
              {generatingJd ? "Generating..." : "✦ Generate Job Description"}
            </button>
          </div>

          <textarea
            rows="7"
            value={jd}
            disabled={loading}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the job description here..."
            className="w-full p-4 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none resize-y transition"
          />
        </div>

        {/* RESUME UPLOAD */}
        <div>
          <label className="block mb-2 font-semibold text-gray-700">
            Upload Resume (PDF)
          </label>

          <div className="border-2 border-dashed border-purple-300 rounded-2xl p-6 text-center bg-purple-50 hover:bg-purple-100 transition">
            <div className="text-4xl mb-3">📄</div>

            <input
              type="file"
              accept=".pdf,application/pdf"
              disabled={loading}
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];

                if (
                  selectedFile &&
                  selectedFile.type !== "application/pdf"
                ) {
                  alert("Please select a PDF file");
                  e.target.value = "";
                  setFile(null);
                  return;
                }

                setFile(selectedFile || null);
                setResult(null);
              }}
              className="w-full text-sm file:bg-purple-600 file:text-white file:border-0 file:px-5 file:py-2 file:rounded-lg file:mr-4 cursor-pointer"
            />

            {file && (
              <div className="mt-4 inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                <span>✓</span>
                {file.name}
              </div>
            )}
          </div>
        </div>

        {/* ANALYZE BUTTON */}
        <button
          onClick={handleAnalyze}
          disabled={loading || generatingJd}
          className="w-full py-4 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 transition shadow-lg"
        >
          {loading ? "Analyzing Your Resume..." : "Analyze Resume 🚀"}
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="max-w-5xl mx-auto mt-10 bg-white rounded-2xl p-8 text-center shadow-sm border">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>

          <h3 className="text-lg font-bold text-gray-800">
            Analyzing your resume
          </h3>

          <p className="text-gray-500 text-sm mt-2">
            Comparing your skills and experience with the job requirements...
          </p>
        </div>
      )}

      {/* RESULTS */}
      {result && !loading && (
        <div className="max-w-6xl mx-auto mt-12 space-y-6">

          {/* RESULTS HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-3xl font-extrabold">
                Analysis Results
              </h2>

              <p className="text-gray-500 mt-1">
                Your personalized ATS resume evaluation
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-purple-700">
              {role}
            </div>
          </div>

          {/* ATS SCORE */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-7 sm:p-10">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-gray-500 font-semibold mb-2">
                  Overall ATS Score
                </p>

                <div className={`text-6xl sm:text-7xl font-extrabold ${getScoreColor(result.ats_score)}`}>
                  {result.ats_score}
                  <span className="text-3xl text-gray-400">/100</span>
                </div>

                <div className={`inline-block mt-4 px-4 py-2 rounded-full text-sm font-bold ${
                  result.ats_score >= 80
                    ? "bg-green-100 text-green-700"
                    : result.ats_score >= 65
                    ? "bg-blue-100 text-blue-700"
                    : result.ats_score >= 45
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {getScoreLabel(result.ats_score)}
                </div>

              </div>

              {/* SCORE PROGRESS */}
              <div>
                <div className="flex justify-between mb-3">
                  <span className="font-semibold text-gray-700">
                    Resume Compatibility
                  </span>

                  <span className="font-bold text-purple-700">
                    {result.ats_score}%
                  </span>
                </div>

                <div className="w-full h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-1000"
                    style={{ width: `${result.ats_score}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </div>

          {/* SKILL COMPARISON */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* MATCHING SKILLS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-xl text-xl">
                    ✓
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-green-700">
                      Matching Skills
                    </h3>

                    <p className="text-sm text-gray-500">
                      Skills found in your resume
                    </p>
                  </div>
                </div>

                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                  {result.matching_skills.length}
                </span>
              </div>

              {result.matching_skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.matching_skills.map((item, index) => (
                    <span
                      key={index}
                      className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      ✓ {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 bg-gray-50 rounded-xl p-4 text-sm">
                  No matching skills identified.
                </p>
              )}
            </div>

            {/* MISSING SKILLS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-3 rounded-xl text-xl">
                    !
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-red-700">
                      Missing Skills
                    </h3>

                    <p className="text-sm text-gray-500">
                      Skills not demonstrated
                    </p>
                  </div>
                </div>

                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">
                  {result.missing_skills.length}
                </span>
              </div>

              {result.missing_skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.missing_skills.map((item, index) => (
                    <span
                      key={index}
                      className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      ✕ {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 bg-gray-50 rounded-xl p-4 text-sm">
                  No missing skills identified.
                </p>
              )}
            </div>
          </div>

          {/* MISSING KEYWORDS */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-orange-100 p-3 rounded-xl text-xl">
                🔎
              </div>

              <div>
                <h3 className="text-xl font-bold text-orange-700">
                  Missing ATS Keywords
                </h3>

                <p className="text-sm text-gray-500">
                  Relevant terms absent from your resume
                </p>
              </div>

              <span className="ml-auto bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">
                {result.missing_keywords.length}
              </span>
            </div>

            {result.missing_keywords.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {result.missing_keywords.map((item, index) => (
                  <span
                    key={index}
                    className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-full text-sm font-semibold"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 bg-gray-50 rounded-xl p-4 text-sm">
                No significant missing keywords identified.
              </p>
            )}
          </div>

          {/* STRENGTHS */}
          {renderListSection(
            "Resume Strengths",
            "What your resume does well",
            result.strengths,
            "✓",
            "text-green-700",
            "bg-green-50",
            "border-green-200"
          )}

          {/* WEAKNESSES */}
          {renderListSection(
            "Areas to Improve",
            "Gaps affecting your job alignment",
            result.weaknesses,
            "!",
            "text-red-700",
            "bg-red-50",
            "border-red-200"
          )}

          {/* RECOMMENDATIONS */}
          {renderListSection(
            "Recommendations",
            "Actionable ways to improve your resume",
            result.recommendations,
            "✦",
            "text-purple-700",
            "bg-purple-50",
            "border-purple-200"
          )}

        </div>
      )}
    </div>
  );
}