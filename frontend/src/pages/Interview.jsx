import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  fetchQuestions,
  getNextQuestion,
  evaluateInterviewAnswer,
  evaluateInterview,
  transcribeAudio,
} from "../services/api";

const TOTAL_QUESTIONS = 5;

export default function Interview() {
  const location = useLocation();
  const navigate = useNavigate();

  // =====================================================
  // INTERVIEW CONFIG
  // =====================================================

  const interviewState = location.state || {};

  const {
    roleId,
    companyId,
    role = "General",
    company = "General",
    topic = "General",
    question_type = "Technical",
    category = "Conceptual",
    totalQuestions = TOTAL_QUESTIONS,
  } = interviewState;

  const TOTAL =
    Number(totalQuestions) || TOTAL_QUESTIONS;

  const firstQuestionLoaded = useRef(false);

  // =====================================================
  // STATE
  // =====================================================

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [evaluatedAnswers, setEvaluatedAnswers] = useState([]);
  const [history, setHistory] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  // =====================================================
  // UI STATE
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  //AUDIO STATE
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // =====================================================
  // GET CURRENT USER
  // =====================================================

  const getCurrentUser = () => {
    try {
      const savedUser = localStorage.getItem("user");

      return savedUser
        ? JSON.parse(savedUser)
        : null;
    } catch (error) {
      console.error("Failed to parse user:", error);
      return null;
    }
  };

  // =====================================================
  // LOAD FIRST QUESTION
  // =====================================================

  useEffect(() => {
    if (!roleId) {
      navigate("/mock-interview");
      return;
    }

    if (firstQuestionLoaded.current) {
      return;
    }

    firstQuestionLoaded.current = true;

    const loadFirstQuestion = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const savedInterview =
          sessionStorage.getItem("current_interview");

        let storedInterview = {};

        if (savedInterview) {
          try {
            storedInterview = JSON.parse(savedInterview);
          } catch {
            sessionStorage.removeItem("current_interview");
          }
        }

        const requestTopic =
          storedInterview.topic || topic;

        const requestQuestionType =
          storedInterview.question_type ||
          question_type;

        const requestCategory =
          storedInterview.category ||
          category;

        // =================================================
        // RESTORE EXISTING INTERVIEW
        // =================================================

        const savedQuestions =
          sessionStorage.getItem(
            "current_interview_questions"
          );

        const savedSessionId =
          sessionStorage.getItem(
            "current_interview_session_id"
          );

        const savedAnswers =
          sessionStorage.getItem(
            "current_interview_answers"
          );

        const savedEvaluations =
          sessionStorage.getItem(
            "current_interview_evaluations"
          );

        const savedHistory =
          sessionStorage.getItem(
            "current_interview_history"
          );

        if (savedQuestions && savedSessionId) {
          try {
            const parsedQuestions =
              JSON.parse(savedQuestions);

            if (
              Array.isArray(parsedQuestions) &&
              parsedQuestions.length > 0
            ) {
              setQuestions(parsedQuestions);
              setSessionId(savedSessionId);

              if (savedAnswers) {
                setAnswers(JSON.parse(savedAnswers));
              }

              if (savedEvaluations) {
                setEvaluatedAnswers(
                  JSON.parse(savedEvaluations)
                );
              }

              if (savedHistory) {
                setHistory(JSON.parse(savedHistory));
              }

              const parsedAnswers = savedAnswers
                ? JSON.parse(savedAnswers)
                : {};

              const unansweredIndex =
                parsedQuestions.findIndex(
                  (_, index) =>
                    !parsedAnswers[index]?.trim()
                );

              setCurrentIndex(
                unansweredIndex >= 0
                  ? unansweredIndex
                  : Math.min(
                      parsedQuestions.length - 1,
                      TOTAL - 1
                    )
              );

              return;
            }
          } catch (error) {
            console.error(
              "Failed to restore interview:",
              error
            );

            sessionStorage.removeItem(
              "current_interview_questions"
            );

            sessionStorage.removeItem(
              "current_interview_session_id"
            );

            sessionStorage.removeItem(
              "current_interview_answers"
            );

            sessionStorage.removeItem(
              "current_interview_evaluations"
            );

            sessionStorage.removeItem(
              "current_interview_history"
            );
          }
        }

        // =================================================
        // USER
        // =================================================

        const user = getCurrentUser();
        const candidateId = user?.id || null;

        if (!candidateId) {
          throw new Error(
            "User not found. Please login again."
          );
        }

        // =================================================
        // START TIME
        // =================================================

        // New interview = new start time
        sessionStorage.setItem(
          "current_interview_started_at",
          new Date().toISOString()
        );

        // =================================================
        // GENERATE FIRST QUESTION
        // =================================================

        const data = await fetchQuestions({
          roleId: Number(roleId),

          companyId:
            companyId
              ? Number(companyId)
              : null,

          topic: requestTopic,

          question_type: requestQuestionType,

          category: requestCategory,

          candidateId,
        });


        if (
          !data ||
          !data.success ||
          !data.question
        ) {
          throw new Error(
            data?.details ||
            data?.error ||
            "Invalid first question response."
          );
        }

        const firstQuestion = data.question;


        if (
          !firstQuestion.id &&
          !firstQuestion.question_id
        ) {
          throw new Error(
            "First question was returned without a database ID."
          );
        }

        const newSessionId = data.sessionId;

        if (!newSessionId) {
          throw new Error(
            "Session ID was not returned by the server."
          );
        }

        setQuestions([firstQuestion]);
        setSessionId(newSessionId);
        setCurrentIndex(0);

        setAnswers({});
        setEvaluatedAnswers([]);
        setHistory([]);

        // =================================================
        // SAVE SESSION
        // =================================================

        sessionStorage.setItem(
          "current_interview_questions",
          JSON.stringify([firstQuestion])
        );

        sessionStorage.setItem(
          "current_interview_session_id",
          newSessionId
        );

        sessionStorage.setItem(
          "current_interview_answers",
          JSON.stringify({})
        );

        sessionStorage.setItem(
          "current_interview_evaluations",
          JSON.stringify([])
        );

        sessionStorage.setItem(
          "current_interview_history",
          JSON.stringify([])
        );

      } catch (error) {
        console.error(
          "Failed to load first question:",
          error
        );

        const message =
          error?.response?.data?.details ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to load interview.";

        setErrorMessage(message);

        firstQuestionLoaded.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadFirstQuestion();
  }, [
    roleId,
    companyId,
    topic,
    question_type,
    category,
    navigate,
  ]);

  // =====================================================
  // INPUT
  // =====================================================

  const handleInputChange = (e) => {
    const value = e.target.value;

    setAnswers((prev) => {
      const updated = {
        ...prev,
        [currentIndex]: value,
      };

      sessionStorage.setItem(
        "current_interview_answers",
        JSON.stringify(updated)
      );

      return updated;
    });
  };
// Read the current interview question aloud
  const readQuestion = () => {
    const question = questions[currentIndex];
    const text = question?.question_text || question?.question || "";

    if (!text) {
      alert("No question available to read.");
      return;
    }

    if (!("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported by this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 0.9;

    window.speechSynthesis.speak(utterance);
  };

  // Stop reading the question
  const stopReading = () => {
    window.speechSynthesis?.cancel();
  };

  // Start recording the candidate's answer
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        alert("Audio recording is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        setAudioBlob(blob);

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        setIsRecording(false);
      };

      recorder.onerror = () => {
        alert("An error occurred while recording audio.");
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
      setAudioBlob(null);
    } catch (error) {
      console.error("Recording error:", error);
      alert("Could not access the microphone. Please allow microphone access.");
    }
  };

  // Stop recording the answer
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // Convert recorded speech into text using Whisper
  const handleTranscribe = async () => {
    if (!audioBlob) {
      alert("Please record your answer first.");
      return;
    }

    try {
      setIsTranscribing(true);

      const transcript = await transcribeAudio(audioBlob);

      if (!transcript.trim()) {
        alert("No speech was detected. Please record your answer again.");
        return;
      }

      setAnswers((prev) => {
        const updated = {
          ...prev,
          [currentIndex]: transcript,
        };

        sessionStorage.setItem(
          "current_interview_answers",
          JSON.stringify(updated)
        );

        return updated;
      });

      setAudioBlob(null);
      alert("Your answer has been transcribed successfully.");
    } catch (error) {
      console.error("Transcription error:", error);
      alert(error.message || "Failed to transcribe your answer.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // =====================================================
  // GET QUESTION ID
  // =====================================================

  const getQuestionId = (question) => {
    return (
      question?.id ??
      question?.question_id ??
      question?.questionId ??
      null
    );
  };

  // =====================================================
  // EVALUATE CURRENT ANSWER
  // =====================================================

  const evaluateCurrentAnswer = async ({
    currentQuestion,
    currentAnswer,
    candidateId,
  }) => {
    const currentQuestionId =
      getQuestionId(currentQuestion);


    if (!currentQuestionId) {
      throw new Error(
        "Question ID is missing."
      );
    }

    if (!sessionId) {
      throw new Error(
        "Interview session is missing."
      );
    }


    const evaluationResult =
      await evaluateInterviewAnswer({
        candidateId,

        sessionId,

        currentQuestionId,

        currentAnswer:
          currentAnswer.trim(),

        roleId:
          Number(roleId),

        companyId:
          companyId
            ? Number(companyId)
            : null,
      });


    if (
      !evaluationResult ||
      evaluationResult.success === false
    ) {
      throw new Error(
        evaluationResult?.error ||
        evaluationResult?.details ||
        "Answer evaluation failed."
      );
    }

    return {
      questionId: currentQuestionId,

      question:
        currentQuestion.question_text ||
        currentQuestion.question ||
        "",

      student_answer:
        currentAnswer.trim(),

      topic:
        currentQuestion.topic ||
        topic ||
        "General",

      final_score: Number(
        evaluationResult?.evaluation?.final_score ??
        evaluationResult?.evaluation?.score ??
        0
      ) || 0,

      feedback:
        evaluationResult?.evaluation?.feedback ||
        evaluationResult?.evaluation?.result ||
        "",
    };
  };

  // =====================================================
  // NEXT QUESTION
  // =====================================================

  const handleNext = async () => {
    try {
      setIsEvaluating(true);
      setErrorMessage("");

      const currentQuestion =
        questions[currentIndex];

      const currentAnswer =
        answers[currentIndex];

      if (!currentQuestion) {
        throw new Error(
          "Current question not found."
        );
      }

      if (
        !currentAnswer ||
        !currentAnswer.trim()
      ) {
        throw new Error(
          "Please provide an answer."
        );
      }

      if (!sessionId) {
        throw new Error(
          "Interview session not found."
        );
      }

      const user = getCurrentUser();
      const candidateId = user?.id || null;

      if (!candidateId) {
        throw new Error(
          "User not found. Please login again."
        );
      }

      // =================================================
      // EVALUATE CURRENT ANSWER
      // =================================================

      const evaluation =
        await evaluateCurrentAnswer({
          currentQuestion,
          currentAnswer,
          candidateId,
        });

      // =================================================
      // SAVE EVALUATION
      // =================================================

      const updatedEvaluations = [
        ...evaluatedAnswers,
        evaluation,
      ];

      setEvaluatedAnswers(
        updatedEvaluations
      );

      sessionStorage.setItem(
        "current_interview_evaluations",
        JSON.stringify(
          updatedEvaluations
        )
      );

      // =================================================
      // UPDATE HISTORY
      // =================================================

      const currentHistoryItem = {
        questionId:
          evaluation.questionId,

        question:
          evaluation.question,

        answer:
          evaluation.student_answer,

        topic:
          evaluation.topic,

        score:
          evaluation.final_score,

        difficulty:
          currentQuestion.difficulty ||
          "Medium",

        feedback:
          evaluation.feedback,
      };

      const updatedHistory = [
        ...history.filter(
          (item) =>
            item.questionId !==
            evaluation.questionId
        ),
        currentHistoryItem,
      ];

      setHistory(updatedHistory);

      sessionStorage.setItem(
        "current_interview_history",
        JSON.stringify(
          updatedHistory
        )
      );

      // =================================================
      // GET NEXT QUESTION
      // =================================================

      const nextResult =
        await getNextQuestion({
          candidateId,

          roleId:
            Number(roleId),

          companyId:
            companyId
              ? Number(companyId)
              : null,

          sessionId,

          currentQuestionId:
            evaluation.questionId,

          currentQuestion:
            currentQuestion.question_text ||
            currentQuestion.question ||
            "",

          currentAnswer:
            currentAnswer.trim(),

          topic:
            currentQuestion.topic ||
            topic ||
            "General",

          question_type:
            currentQuestion.question_type ||
            question_type,

          category:
            currentQuestion.category ||
            category,

          history:
            updatedHistory,
        });


      if (
        !nextResult ||
        !nextResult.success ||
        !nextResult.nextQuestion
      ) {
        throw new Error(
          nextResult?.details ||
          nextResult?.error ||
          "No next question returned."
        );
      }

      const nextQuestion =
        nextResult.nextQuestion;

      const nextQuestionId =
        getQuestionId(nextQuestion);


      if (!nextQuestionId) {
        throw new Error(
          "Backend returned next question without a database ID."
        );
      }

      const updatedQuestions = [
        ...questions,
        nextQuestion,
      ];

      setQuestions(updatedQuestions);

      sessionStorage.setItem(
        "current_interview_questions",
        JSON.stringify(
          updatedQuestions
        )
      );

      setCurrentIndex(
        currentIndex + 1
      );

    } catch (error) {
      console.error(
        "Next question failed:",
        error
      );

      const message =
        error?.response?.data?.details ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to generate next question.";

      setErrorMessage(message);

    } finally {
      setIsEvaluating(false);
    }
  };

  // =====================================================
  // FINAL SUBMIT
  // =====================================================

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");


      // =================================================
      // CURRENT QUESTION
      // =================================================

      const currentQuestion =
        questions[currentIndex];

      const currentAnswer =
        answers[currentIndex];

      if (!currentQuestion) {
        throw new Error(
          "Current question not found."
        );
      }

      if (
        !currentAnswer ||
        !currentAnswer.trim()
      ) {
        throw new Error(
          "Please answer the question before submitting."
        );
      }

      // =================================================
      // USER
      // =================================================

      const user = getCurrentUser();

      const candidateId =
        user?.id || null;

      if (!candidateId) {
        throw new Error(
          "User not found. Please login again."
        );
      }

      // =================================================
      // SESSION
      // =================================================

      // Use sessionStorage as a backup to React state
      const storedSessionId =
        sessionStorage.getItem(
          "current_interview_session_id"
        );

      const finalSessionId =
        sessionId || storedSessionId;

      if (!finalSessionId) {
        throw new Error(
          "Interview session not found."
        );
      }

      // =================================================
      // QUESTION ID
      // =================================================

      const currentQuestionId =
        getQuestionId(currentQuestion);

      if (!currentQuestionId) {
        throw new Error(
          "Question ID is missing."
        );
      }

      // =================================================
      // FINAL QUESTION EVALUATION
      // =================================================


      const evaluation =
        await evaluateCurrentAnswer({
          currentQuestion,
          currentAnswer,
          candidateId,
        });


      if (
        !evaluation ||
        evaluation.final_score === undefined
      ) {
        throw new Error(
          "Final question evaluation failed."
        );
      }

      // =================================================
      // SAVE FINAL EVALUATION
      // =================================================

      const updatedEvaluations = [
        ...evaluatedAnswers,
        evaluation,
      ];

      setEvaluatedAnswers(
        updatedEvaluations
      );

      sessionStorage.setItem(
        "current_interview_evaluations",
        JSON.stringify(
          updatedEvaluations
        )
      );

      // =================================================
      // SAVE FINAL HISTORY
      // =================================================

      const finalHistoryItem = {
        questionId:
          evaluation.questionId,

        question:
          evaluation.question,

        answer:
          evaluation.student_answer,

        topic:
          evaluation.topic,

        score:
          evaluation.final_score,

        difficulty:
          currentQuestion.difficulty ||
          "Medium",

        feedback:
          evaluation.feedback,
      };

      const updatedHistory = [
        ...history.filter(
          (item) =>
            item.questionId !==
            evaluation.questionId
        ),
        finalHistoryItem,
      ];

      setHistory(updatedHistory);

      sessionStorage.setItem(
        "current_interview_history",
        JSON.stringify(
          updatedHistory
        )
      );

      // =================================================
      // START TIME
      // =================================================

      const startedAt =
        sessionStorage.getItem(
          "current_interview_started_at"
        );


      // =================================================
      // FINALIZE INTERVIEW
      // =================================================


      const finalResult =
        await evaluateInterview({
          candidateId,

          sessionId:
            finalSessionId,

          roleId:
            roleId !== null &&
            roleId !== undefined &&
            roleId !== ""
              ? Number(roleId)
              : null,

          companyId:
            companyId !== null &&
            companyId !== undefined &&
            companyId !== ""
              ? Number(companyId)
              : null,

          testType:
            "interview",

          startedAt:
            startedAt || null,
        });



      // =================================================
      // VALIDATE RESPONSE
      // =================================================

      if (
        !finalResult ||
        finalResult.success !== true
      ) {
        throw new Error(
          finalResult?.error ||
          finalResult?.details ||
          "Failed to complete interview."
        );
      }

      // =================================================
      // VERIFY TEST ATTEMPT
      // =================================================

      if (
        !finalResult.attempt ||
        !finalResult.attempt.attempt_id
      ) {
        throw new Error(
          "Interview completed, but test attempt was not saved."
        );
      }


      // =================================================
      // NAVIGATE TO FEEDBACK
      // =================================================

      navigate("/feedback", {
        state: {
          report:
            finalResult.report || null,

          overallScore:
            finalResult.overallScore ??
            finalResult.score ??
            0,

          totalQuestions:
            finalResult.totalQuestions,

          correctAnswers:
            finalResult.correctAnswers,

          durationMinutes:
            finalResult.durationMinutes,

          candidateId,

          sessionId:
            finalSessionId,

          attempt:
            finalResult.attempt,
        },
      });

    } catch (error) {
      console.error(
        "\n========== FINAL INTERVIEW SUBMISSION FAILED =========="
      );

      console.error(
        "Message:",
        error?.message
      );

      console.error(
        "Error:",
        error
      );

      const message =
        error?.response?.data?.details ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to submit interview.";

      setErrorMessage(message);

      alert(message);

    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="p-10 text-center text-xl animate-pulse">
        Loading Questions...
      </div>
    );
  }

  // =====================================================
  // PROCESSING
  // =====================================================

  if (
    isEvaluating ||
    isSubmitting
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-10 text-center">

        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />

        <h2 className="text-2xl font-bold text-gray-800">
          {isSubmitting
            ? "Submitting your interview..."
            : "Evaluating your answer and generating the next question..."}
        </h2>

        <p className="text-gray-500 mt-2">
         Please wait while your response is being evaluated.
        </p>

      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (
    errorMessage &&
    questions.length === 0
  ) {
    return (
      <div className="p-10 max-w-xl mx-auto text-center">

        <div className="bg-red-50 border border-red-200 rounded-xl p-6">

          <h2 className="text-xl font-bold text-red-700 mb-3">
            Unable to load interview
          </h2>

          <p className="text-red-600 mb-5">
            {errorMessage}
          </p>

          <button
            onClick={() =>
              window.location.reload()
            }
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold"
          >
            Retry
          </button>

        </div>

      </div>
    );
  }

  // =====================================================
  // NO QUESTIONS
  // =====================================================

  if (questions.length === 0) {
    return (
      <div className="p-10 text-center">
        No questions found.
      </div>
    );
  }

  // =====================================================
  // CURRENT QUESTION
  // =====================================================

  const currentQuestion =
    questions[currentIndex];

  if (!currentQuestion) {
    return (
      <div className="p-10 text-center">
        Unable to load current question.
      </div>
    );
  }

  const questionText =
    currentQuestion.question_text ||
    currentQuestion.question ||
    "";

  const isLastQuestion =
    currentIndex === TOTAL - 1;

  const progress =
    ((currentIndex + 1) / TOTAL) * 100;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="p-10 max-w-2xl mx-auto shadow-xl rounded-2xl bg-white border mt-10">

      <div className="w-full bg-gray-200 h-2 rounded-full mb-6">

        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(
              progress,
              100
            )}%`,
          }}
        />

      </div>

      <div className="flex justify-between items-center mb-6">

        <h2 className="text-xl font-bold text-blue-700">
          Question{" "}
          {currentIndex + 1} of{" "}
          {TOTAL}
        </h2>

        <span className="text-sm text-gray-500 font-semibold">
          {currentQuestion.difficulty ||
            "Medium"}
        </span>

      </div>

      <div className="mb-8">

        <p className="text-2xl font-semibold text-gray-800 mb-4">
          {questionText}
        </p>
        
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            type="button"
            onClick={readQuestion}
            disabled={isRecording || isTranscribing}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            🔊 Read Question
          </button>

          <button
            type="button"
            onClick={stopReading}
            className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
          >
            ⏹ Stop Reading
          </button>
        </div>

        <textarea
          className="w-full p-4 border-2 rounded-xl focus:border-blue-500 outline-none transition-all resize-none"
          rows="6"
          placeholder="Type your response here..."
          value={
            answers[currentIndex] || ""
          }
          onChange={
            handleInputChange
          }
          disabled={
            isEvaluating ||
            isSubmitting
          }
        />

        
        <div className="flex flex-wrap gap-3 mt-4">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={isTranscribing || isEvaluating || isSubmitting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              🎙 Start Recording
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800"
            >
              ⏹ Stop Recording
            </button>
          )}

          <button
            type="button"
            onClick={handleTranscribe}
            disabled={!audioBlob || isTranscribing || isRecording}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isTranscribing ? "Transcribing..." : "📝 Transcribe Answer"}
          </button>
        </div>

        {isRecording && (
          <p className="mt-2 text-sm text-red-600">
            Recording your answer... Click Stop Recording when finished.
          </p>
        )}

        {audioBlob && !isRecording && (
          <p className="mt-2 text-sm text-green-600">
            Recording ready. Click Transcribe Answer to fill in your response.
          </p>
        )}


      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end">

        {isLastQuestion ? (

          <button
            onClick={handleSubmit}
            disabled={
              !answers[
                currentIndex
              ]?.trim() ||
              isSubmitting ||
              isRecording ||
              isTranscribing ||
              isEvaluating
            }
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Submit Interview ✅
          </button>

        ) : (

          <button
            onClick={handleNext}
            disabled={
              !answers[
                currentIndex
              ]?.trim() ||
              isEvaluating ||
              isRecording ||
              isTranscribing ||
              isSubmitting
            }
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Next Question ➔
          </button>

        )}

      </div>

    </div>
  );
}