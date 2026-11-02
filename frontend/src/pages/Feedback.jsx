import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getReport } from "../services/api";

export default function Feedback() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // SAFE NUMBER
  // ==========================================

  const formatScore = (value) => {
    const score = Number(value);

    if (Number.isNaN(score)) {
      return "0.00";
    }

    return score.toFixed(2);
  };

  // ==========================================
  // LOAD REPORT
  // ==========================================

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const candidateId = state?.candidateId;
      const sessionId = state?.sessionId;

      if (!candidateId) {
        throw new Error("Candidate ID is missing.");
      }

      if (!sessionId) {
        throw new Error("Interview session ID is missing.");
      }

      // ==========================================
      // GET REPORT FROM BACKEND
      // ==========================================

      const data = await getReport(
        candidateId,
        sessionId
      );


      // ==========================================
      // VALIDATE RESPONSE
      // ==========================================

      if (!data) {
        throw new Error(
          "No interview report was returned."
        );
      }

      if (data.success === false) {
        throw new Error(
          data.error ||
            data.details ||
            "Failed to load interview report."
        );
      }

      // ==========================================
      // IMPORTANT:
      // BACKEND RETURNS:
      //
      // {
      //   success: true,
      //   candidateId: 5,
      //   sessionId: "...",
      //   report: {
      //      overall_score: 76.2,
      //      summary: "...",
      //      strengths: [],
      //      ...
      //   }
      // }
      //
      // THEREFORE USE data.report
      // ==========================================

      const backendReport =
        data.report || data;


      // ==========================================
      // NORMALIZE REPORT
      // ==========================================

      const normalizedReport = {

        // ----------------------------------------
        // SESSION
        // ----------------------------------------

        sessionId:
          data.sessionId ||
          data.session_id ||
          backendReport.sessionId ||
          sessionId,

        // ----------------------------------------
        // ROLE / COMPANY
        // ----------------------------------------

        role:
          backendReport.role ||
          data.role ||
          state?.role ||
          "General",

        company:
          backendReport.company ||
          data.company ||
          state?.company ||
          "General",

        // ----------------------------------------
        // SCORE
        // ----------------------------------------

        overallScore:
          backendReport.overall_score ??
          backendReport.overallScore ??
          backendReport.percentage ??
          0,

        // ----------------------------------------
        // CLASSIFICATION
        // ----------------------------------------

        classification:
          backendReport.classification ||
          backendReport.classifications?.Overall ||
          "Not Available",

        // ----------------------------------------
        // QUESTIONS
        // ----------------------------------------

        totalQuestions:
          backendReport.total_questions ??
          backendReport.totalQuestions ??
          state?.answers?.length ??
          0,

        // ----------------------------------------
        // CORRECT ANSWERS
        // ----------------------------------------

        correctAnswers:
          backendReport.correct_answers ??
          backendReport.correctAnswers ??
          data.correctAnswers ??
          state?.correctAnswers ??
          0,

        // ----------------------------------------
        // DURATION
        // ----------------------------------------

        durationMinutes:
          backendReport.duration_minutes ??
          backendReport.durationMinutes ??
          data.durationMinutes ??
          state?.durationMinutes ??
          0,

        // ----------------------------------------
        // DETAILED FEEDBACK
        // ----------------------------------------

        summary:
          backendReport.summary ||
          backendReport.overall_feedback ||
          backendReport.feedback ||
          "No detailed summary is available for this interview.",

        // ----------------------------------------
        // STRENGTHS
        // ----------------------------------------

        strengths:
          Array.isArray(
            backendReport.strengths
          )
            ? backendReport.strengths
            : [],

        // ----------------------------------------
        // WEAKNESSES
        // ----------------------------------------

        weaknesses:
          Array.isArray(
            backendReport.weaknesses
          )
            ? backendReport.weaknesses
            : [],

        // ----------------------------------------
        // RECOMMENDATIONS
        // ----------------------------------------

        recommendations:
          Array.isArray(
            backendReport.recommendations
          )
            ? backendReport.recommendations
            : [],

        // ----------------------------------------
        // FINAL ASSESSMENT
        // ----------------------------------------

        finalAssessment:
          backendReport.final_assessment ||
          backendReport.finalAssessment ||
          "No final assessment is available.",

        // ----------------------------------------
        // SCORE BREAKDOWN
        // ----------------------------------------

        scores:
          Array.isArray(
            backendReport.scores
          )
            ? backendReport.scores
            : [],

        // ----------------------------------------
        // EVALUATION METHOD
        // ----------------------------------------

        evaluationMethod:
          backendReport.evaluation_method ||
          backendReport.evaluationMethod ||
          {},
      };


      // ==========================================
      // CHECK THAT DETAILED FEEDBACK EXISTS
      // ==========================================

      setReport(normalizedReport);

    } catch (err) {

      console.error(
        "========== REPORT LOADING ERROR =========="
      );

      console.error(err);

      const message =
        err?.response?.data?.details ||
        err?.response?.data?.error ||
        err?.message ||
        "Unable to load your interview feedback.";

      setError(message);

    } finally {

      setLoading(false);

    }

  }, [state]);

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {

    if (
      !state?.candidateId ||
      !state?.sessionId
    ) {

      navigate(
        "/mock-interview",
        {
          replace: true,
        }
      );

      return;
    }

    loadReport();

  }, [
    state,
    navigate,
    loadReport,
  ]);

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">

        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mb-5" />

        <h2 className="text-xl font-bold text-gray-800">
          Loading your interview feedback...
        </h2>

      </div>
    );

  }

  // ==========================================
  // ERROR
  // ==========================================

  if (!report) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">

        <div className="bg-white max-w-md w-full p-10 rounded-2xl shadow-sm border border-gray-100 text-center">

          <div className="text-5xl mb-4">
            ⚠️
          </div>

          <h2 className="text-2xl font-bold text-gray-800">
            No Report Available
          </h2>

          <p className="text-gray-500 mt-3">
            {error ||
              "We could not load your interview feedback."}
          </p>

          <div className="flex flex-col gap-3 mt-7">

            <button
              onClick={loadReport}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition"
            >
              Try Again
            </button>

            <button
              onClick={() =>
                navigate("/mock-interview")
              }
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl font-bold transition"
            >
              Try Another Interview
            </button>

          </div>

        </div>

      </div>
    );

  }

  // ==========================================
  // REPORT DATA
  // ==========================================

  const overallScore =
    report.overallScore ?? 0;

  const classification =
    report.classification ||
    "Not Available";

  const totalQuestions =
    report.totalQuestions ?? 0;

  const correctAnswers =
    report.correctAnswers ?? 0;

  const durationMinutes =
    report.durationMinutes ?? 0;

  const summary =
    report.summary ||
    "No detailed summary is available for this interview.";

  const strengths =
    Array.isArray(report.strengths)
      ? report.strengths
      : [];

  const weaknesses =
    Array.isArray(report.weaknesses)
      ? report.weaknesses
      : [];

  const recommendations =
    Array.isArray(report.recommendations)
      ? report.recommendations
      : [];

  const finalAssessment =
    report.finalAssessment ||
    "No final assessment is available.";

  const scores =
    Array.isArray(report.scores)
      ? report.scores
      : [];

  const evaluationMethod =
    report.evaluationMethod || {};

  const role =
    report.role || "General";

  const company =
    report.company || "General";

  // ==========================================
  // CLASSIFICATION STYLE
  // ==========================================

  const getClassificationStyle = () => {

    const value =
      String(classification).toLowerCase();

    if (
      value.includes("excellent") ||
      value.includes("expert")
    ) {
      return "bg-green-600";
    }

    if (
      value.includes("very good") ||
      value.includes("good")
    ) {
      return "bg-blue-600";
    }

    if (
      value.includes("improvement") ||
      value.includes("average")
    ) {
      return "bg-yellow-500";
    }

    if (
      value.includes("beginner") ||
      value.includes("poor")
    ) {
      return "bg-red-500";
    }

    return "bg-gray-600";
  };

  // ==========================================
  // PRINT
  // ==========================================

  const handlePrint = () => {
    window.print();
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-10 px-4">

      <div className="max-w-5xl mx-auto">

        {/* ======================================
            HEADER
        ====================================== */}

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8">

          <div className="flex flex-col md:flex-row justify-between items-center gap-6">

            <div className="text-center md:text-left">

              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                Interview Feedback
              </h1>

              <p className="text-gray-500 mt-3 text-lg">

                <span className="font-semibold text-gray-700">
                  {role}
                </span>

                {" interview"}

                {company &&
                company !== "General"
                  ? ` at ${company}`
                  : ""}

              </p>

              <div className="flex flex-col md:flex-row gap-2 md:gap-5 mt-4 text-sm text-gray-400">

                <p>
                  Questions:{" "}
                  <span className="font-semibold text-gray-600">
                    {totalQuestions}
                  </span>
                </p>

                <p>
                  Correct:{" "}
                  <span className="font-semibold text-green-600">
                    {correctAnswers}
                  </span>
                </p>

                <p>
                  Duration:{" "}
                  <span className="font-semibold text-gray-600">
                    {durationMinutes} min
                  </span>
                </p>

                <p>
                  Session:{" "}
                  <span className="font-mono text-xs text-gray-500">
                    {report.sessionId}
                  </span>
                </p>

              </div>

            </div>

            {/* SCORE */}

            <div className="min-w-[210px] text-center bg-blue-50 px-8 py-6 rounded-3xl border border-blue-100">

              <p className="text-sm font-bold text-blue-600 uppercase tracking-wide">
                Overall Score
              </p>

              <p className="text-5xl font-black text-blue-700 mt-2">
                {formatScore(overallScore)}
              </p>

              <p className="text-gray-500 text-sm mt-1">
                out of 100
              </p>

              <div
                className={`mt-4 inline-block ${getClassificationStyle()} text-white px-5 py-1.5 rounded-full text-sm font-bold`}
              >
                {classification}
              </div>

            </div>

          </div>

        </div>


        {/* ======================================
            STRENGTHS + WEAKNESSES
        ====================================== */}

        <div className="grid md:grid-cols-2 gap-8 mb-8">

          {/* STRENGTHS */}

          <div className="bg-white rounded-3xl p-6 md:p-7 shadow-sm border border-gray-100">

            <h2 className="text-xl font-bold text-green-700 mb-5 flex items-center gap-2">
              <span>✓</span>
              Strong Areas
            </h2>

            {strengths.length > 0 ? (

              <ul className="space-y-4">

                {strengths.map(
                  (strength, index) => (

                    <li
                      key={`${String(strength)}-${index}`}
                      className="flex gap-3 text-gray-700"
                    >

                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                        ✓
                      </span>

                      <span className="leading-6">
                        {String(strength)}
                      </span>

                    </li>

                  )
                )}

              </ul>

            ) : (

              <p className="text-gray-500">
                No specific strengths were identified.
              </p>

            )}

          </div>

          {/* WEAKNESSES */}

          <div className="bg-white rounded-3xl p-6 md:p-7 shadow-sm border border-gray-100">

            <h2 className="text-xl font-bold text-red-600 mb-5 flex items-center gap-2">
              <span>!</span>
              Areas to Improve
            </h2>

            {weaknesses.length > 0 ? (

              <ul className="space-y-4">

                {weaknesses.map(
                  (weakness, index) => (

                    <li
                      key={`${String(weakness)}-${index}`}
                      className="flex gap-3 text-gray-700"
                    >

                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-500 flex items-center justify-center font-bold">
                        !
                      </span>

                      <span className="leading-6">
                        {String(weakness)}
                      </span>

                    </li>

                  )
                )}

              </ul>

            ) : (

              <p className="text-gray-500">
                No major weaknesses were identified.
              </p>

            )}

          </div>

        </div>

        {/* ======================================
            RECOMMENDATIONS
        ====================================== */}

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8">

          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Recommendations
          </h2>

          {recommendations.length > 0 ? (

            <div className="space-y-4">

              {recommendations.map(
                (recommendation, index) => (

                  <div
                    key={`${String(recommendation)}-${index}`}
                    className="flex gap-4 bg-blue-50 border border-blue-100 p-5 rounded-2xl"
                  >

                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                      {index + 1}
                    </div>

                    <p className="text-gray-700 leading-7">
                      {String(recommendation)}
                    </p>

                  </div>

                )
              )}

            </div>

          ) : (

            <p className="text-gray-500">
              No specific recommendations were generated.
            </p>

          )}

        </div>

        {/* ======================================
            FINAL ASSESSMENT
        ====================================== */}

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8">

          <h2 className="text-2xl font-bold text-gray-900 mb-5">
            Final Assessment
          </h2>

          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">

            <p className="text-gray-700 leading-8 whitespace-pre-line">
              {finalAssessment}
            </p>

          </div>

        </div>

        {/* ======================================
            SCORE BREAKDOWN
        ====================================== */}

        {scores.length > 0 && (

          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8">

            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Score Breakdown
            </h2>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[600px]">

                <thead>

                  <tr className="border-b-2 border-gray-100 text-gray-500 text-sm uppercase">

                    <th className="text-left py-4 px-3">
                      Question
                    </th>


                    <th className="text-center py-4 px-3">
                      Final Score
                    </th>

                  </tr>

                </thead>

                <tbody>
                  {scores.map((item, index) => (
                    <tr
                      key={item.question_number ?? index}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    >
                      <td className="py-5 px-3 font-semibold text-gray-700">
                        Q{item.question_number ?? index + 1}
                      </td>

                      <td className="text-center py-5 px-3">
                        <span className="inline-block bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full font-bold">
                          {formatScore(item.final_score)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>

            </div>


          </div>

        )}

        {/* ======================================
            ACTIONS
        ====================================== */}

        <div className="flex flex-col md:flex-row justify-center gap-4 pb-10 print:hidden">

          <button
            onClick={() =>
              navigate("/mock-interview")
            }
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg"
          >
            Try Another Interview
          </button>

          <button
            onClick={handlePrint}
            className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-xl font-bold transition-all"
          >
            Print / Save as PDF
          </button>

          <button
            onClick={() =>
              navigate("/dashboard")
            }
            className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-3 rounded-xl font-bold transition-all"
          >
            Dashboard
          </button>

        </div>

      </div>

    </div>
  );
}