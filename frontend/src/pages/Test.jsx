import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchVtuQuestions,
  submitAnswers,
  transcribeAudio,
} from "../services/api";

export default function Test() {
  const navigate = useNavigate();

  // Core State
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const saved = sessionStorage.getItem("vtu_test_questions");

        if (saved) {
          setQuestions(JSON.parse(saved));
        } else {
          const data = await fetchVtuQuestions();
          setQuestions(data);
          sessionStorage.setItem(
            "vtu_test_questions",
            JSON.stringify(data)
          );
        }
      } catch (err) {
        console.error("Failed to load VTU questions", err);
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => {
      window.speechSynthesis?.cancel();

      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleInputChange = (e) => {
    setAnswers({
      ...answers,
      [currentIndex]: e.target.value,
    });
  };

  // Read the current question aloud
  const readQuestion = () => {
    if (!currentQuestion?.question_text) return;

    if (!("speechSynthesis" in window)) {
      return alert("Text-to-speech is not supported by this browser.");
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      currentQuestion.question_text
    );

    utterance.lang = "en-IN";
    utterance.rate = 0.9;

    window.speechSynthesis.speak(utterance);
  };

  // Stop speaking
  const stopReading = () => {
    window.speechSynthesis?.cancel();
  };

  // Start recording an answer
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        return alert(
          "Microphone recording is not supported. Please use a recent browser on localhost or HTTPS."
        );
      }

      if (typeof MediaRecorder === "undefined") {
        return alert("Audio recording is not supported by this browser.");
      }

      window.speechSynthesis?.cancel();
      setAudioBlob(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const chunks = audioChunksRef.current;

        if (chunks.length > 0) {
          const blob = new Blob(chunks, {
            type: recorder.mimeType || "audio/webm",
          });

          setAudioBlob(blob);
        }

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setIsRecording(false);
      };

      recorder.onerror = () => {
        alert("An error occurred while recording audio.");
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);
      alert(
        "Could not access your microphone. Please allow microphone permission and try again."
      );
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // Send the recording to Whisper and fill the answer field
  const handleTranscribe = async () => {
    if (!audioBlob) {
      return alert("Please record your answer first.");
    }

    try {
      setIsTranscribing(true);

      const transcript = await transcribeAudio(audioBlob);

      if (!transcript.trim()) {
        return alert(
          "No speech was detected. Please record your answer again."
        );
      }

      setAnswers((prev) => ({
        ...prev,
        [currentIndex]: transcript,
      }));

      setAudioBlob(null);

      alert("Your answer has been transcribed successfully.");
    } catch (err) {
      console.error("Transcription failed:", err);
      alert(
        err.message ||
          "Could not transcribe your audio. Please try again."
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleNext = () => {
    if (!answers[currentIndex] || answers[currentIndex].trim() === "") {
      return alert(
        "Please provide an answer before moving to the next question."
      );
    }

    stopReading();
    setAudioBlob(null);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleSubmit = async () => {
    try {
      if (!answers[currentIndex] || answers[currentIndex].trim() === "") {
        return alert("Please answer the final question before submitting.");
      }

      setIsSubmitting(true);
      stopReading();

      const savedUser = localStorage.getItem("user");
      const user = savedUser ? JSON.parse(savedUser) : null;

      if (!user || !user.id) {
        alert("Please log in before submitting the test.");
        navigate("/login");
        return;
      }

      const payload = {
        candidateId: user.id,
        answers: questions.map((q, index) => ({
          questionId: q.id,
          answerText: answers[index] || "",
        })),
      };

      const result = await submitAnswers(payload);

      if (result && (result.sessionId || result.session_id)) {
        sessionStorage.removeItem("vtu_test_questions");

        navigate("/feedback", {
          state: {
            candidateId: payload.candidateId,
            sessionId: result.sessionId || result.session_id,
          },
        });
      } else {
        throw new Error("No session ID returned");
      }
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Submission failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="p-10 text-center text-xl animate-pulse">
        Loading VTU Questions...
      </div>
    );
  }

  // Submitting/Analyzing State
  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-10 text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-800">
          Analyzing your responses...
        </h2>
        <p className="text-gray-500 mt-2">
          Your VTU test is being evaluated. Please don't close this page.
        </p>
      </div>
    );
  }

  // No Questions Found
  if (questions.length === 0) {
    return <div className="p-10 text-center">No VTU questions found.</div>;
  }

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  // Main Test UI
  return (
    <div className="p-10 max-w-2xl mx-auto shadow-xl rounded-2xl bg-white border mt-10 mb-10">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-2 rounded-full mb-6">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / questions.length) * 100}%`,
          }}
        ></div>
      </div>

      {/* Counter */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-blue-700">
          Question {currentIndex + 1} of {questions.length}
        </h2>
      </div>

      {/* Question */}
      <div className="mb-8">
        <p className="text-2xl font-semibold text-gray-800 mb-4">
          {currentQuestion.question_text}
        </p>

        {/* Text-to-Speech */}
        <div className="flex flex-wrap gap-3 mb-5">
          <button
            type="button"
            onClick={readQuestion}
            className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-200"
          >
            🔊 Read Question
          </button>

          <button
            type="button"
            onClick={stopReading}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200"
          >
            ⏹ Stop Reading
          </button>
        </div>

        {/* Answer Input */}
        <textarea
          className="w-full p-4 border-2 rounded-xl focus:border-blue-500 outline-none transition-all"
          rows="6"
          placeholder="Type your response here or record your answer below..."
          value={answers[currentIndex] || ""}
          onChange={handleInputChange}
        />

        {/* Speech-to-Text */}
        <div className="mt-4 p-4 bg-gray-50 border rounded-xl">
          <h3 className="font-bold text-gray-800 mb-3">
            🎤 Answer using your voice
          </h3>

          <div className="flex flex-wrap gap-3">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={isTranscribing}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                🎙 Start Recording
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-900"
              >
                ⏹ Stop Recording
              </button>
            )}

            <button
              type="button"
              onClick={handleTranscribe}
              disabled={!audioBlob || isRecording || isTranscribing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {isTranscribing ? "Transcribing..." : "📝 Transcribe Answer"}
            </button>
          </div>

          {isRecording && (
            <p className="text-red-600 mt-3 text-sm font-medium">
              Recording in progress... Speak clearly, then stop recording.
            </p>
          )}

          {audioBlob && !isRecording && (
            <p className="text-green-700 mt-3 text-sm">
              Recording ready. Select Transcribe Answer to fill the answer box.
            </p>
          )}

          <p className="text-gray-500 text-sm mt-3">
            Review the transcribed text before moving to the next question.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end gap-4">
        {currentIndex > 0 && (
          <button
            onClick={() => {
              stopReading();
              setAudioBlob(null);
              setCurrentIndex((prev) => prev - 1);
            }}
            className="bg-gray-100 text-gray-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-200"
          >
            Previous
          </button>
        )}

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={isRecording || isTranscribing}
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg transition-all disabled:opacity-50"
          >
            Submit Test ✅
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={isRecording || isTranscribing}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition-all disabled:opacity-50"
          >
            Next Question ➔
          </button>
        )}
      </div>
    </div>
  );
}