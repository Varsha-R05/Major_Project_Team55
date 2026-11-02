import json
import logging
import re
import traceback
from typing import List

from llama.llama_client import ask_llama


# =========================================================
# JSON PARSER
# =========================================================

def parse_feedback_json(response: str) -> dict:
    """
    Parse the final interview feedback JSON.

    Handles:
    - Empty responses
    - Markdown code fences
    - Extra text before or after JSON
    - Missing closing braces, if JSON strings are complete

    Does not attempt to reconstruct a response truncated inside
    a quoted string.
    """

    if not response:
        raise ValueError("Empty feedback response")

    response_text = str(response).strip()

    # Remove Markdown code fences
    response_text = re.sub(
        r"^\s*```(?:json)?\s*",
        "",
        response_text,
        flags=re.IGNORECASE,
    )

    response_text = re.sub(
        r"\s*```\s*$",
        "",
        response_text,
    ).strip()

    # Locate the first JSON object
    start = response_text.find("{")

    if start == -1:
        raise ValueError(
            f"No JSON object found: {response_text[:500]}"
        )

    json_text = response_text[start:].strip()

    # First attempt: parse without modification
    try:
        parsed = json.loads(json_text)

        if not isinstance(parsed, dict):
            raise ValueError(
                "Feedback JSON must be an object"
            )

        return parsed

    except json.JSONDecodeError as original_error:
        pass

    # -----------------------------------------------------
    # Count braces outside quoted strings
    # -----------------------------------------------------

    open_braces = 0
    close_braces = 0

    in_string = False
    escaped = False

    for char in json_text:

        if escaped:
            escaped = False
            continue

        if char == "\\" and in_string:
            escaped = True
            continue

        if char == '"':
            in_string = not in_string
            continue

        if not in_string:

            if char == "{":
                open_braces += 1

            elif char == "}":
                close_braces += 1

    # -----------------------------------------------------
    # Recover missing closing braces
    # -----------------------------------------------------

    if (
        not in_string
        and open_braces > close_braces
    ):

        missing_braces = (
            open_braces - close_braces
        )

        repaired_json = (
            json_text
            + ("}" * missing_braces)
        )

        try:
            parsed = json.loads(repaired_json)

            if not isinstance(parsed, dict):
                raise ValueError(
                    "Feedback JSON must be an object"
                )

            logging.warning(
                "Recovered feedback JSON by adding %s "
                "missing closing brace(s).",
                missing_braces,
            )

            return parsed

        except json.JSONDecodeError as repair_error:

            raise ValueError(
                "Feedback JSON repair failed. "
                f"Original error: {original_error}. "
                f"Repair error: {repair_error}. "
                f"Raw response: {response_text[:1000]}"
            ) from repair_error

    # -----------------------------------------------------
    # Try extracting a complete JSON object
    # -----------------------------------------------------

    decoder = json.JSONDecoder()

    try:

        parsed, _ = decoder.raw_decode(
            response_text[start:]
        )

        if not isinstance(parsed, dict):
            raise ValueError(
                "Feedback JSON must be an object"
            )

        return parsed

    except json.JSONDecodeError as extraction_error:

        raise ValueError(
            "Could not parse feedback JSON. "
            f"Error: {extraction_error}. "
            f"Raw response: {response_text[:1000]}"
        ) from extraction_error


# =========================================================
# FEEDBACK FIELD VALIDATION
# =========================================================

def normalize_feedback(parsed: dict, defaults: dict) -> dict:
    """
    Ensure feedback has the expected keys and value types.
    """

    summary = parsed.get(
        "summary",
        defaults["summary"],
    )

    strengths = parsed.get(
        "strengths",
        defaults["strengths"],
    )

    weaknesses = parsed.get(
        "weaknesses",
        defaults["weaknesses"],
    )

    recommendations = parsed.get(
        "recommendations",
        defaults["recommendations"],
    )

    final_assessment = parsed.get(
        "final_assessment",
        defaults["final_assessment"],
    )

    # Normalize text fields
    if not isinstance(summary, str):
        summary = defaults["summary"]

    if not isinstance(final_assessment, str):
        final_assessment = defaults["final_assessment"]

    # Normalize list fields
    if not isinstance(strengths, list):
        strengths = defaults["strengths"]

    if not isinstance(weaknesses, list):
        weaknesses = defaults["weaknesses"]

    if not isinstance(recommendations, list):
        recommendations = defaults["recommendations"]

    # Keep only non-empty strings
    strengths = [
        str(item).strip()
        for item in strengths
        if isinstance(item, str) and item.strip()
    ]

    weaknesses = [
        str(item).strip()
        for item in weaknesses
        if isinstance(item, str) and item.strip()
    ]

    recommendations = [
        str(item).strip()
        for item in recommendations
        if isinstance(item, str) and item.strip()
    ]

    return {
        "summary": summary.strip(),

        "strengths": strengths,

        "weaknesses": weaknesses,

        "recommendations": recommendations,

        "final_assessment": final_assessment.strip(),
    }


# =========================================================
# FINAL INTERVIEW REPORT
# =========================================================

def generate_interview_report(
    role: str,
    company: str,
    questions: List[dict],
    evaluations: List[dict],
):
    """
    Generate ONE detailed final interview feedback report.

    This function does NOT evaluate answers.

    /evaluate is responsible for:
        - llm_score
        - smith_waterman_score
        - final_score

    This function is responsible for:
        - overall interview analysis
        - strengths
        - weaknesses
        - recommendations
        - final assessment
    """

    try:

        # =================================================
        # NO EVALUATIONS
        # =================================================

        if not evaluations:

            return {
                "success": False,

                "overall_score": 0,

                "percentage": 0,

                "classification": "No Evaluation",

                "total_questions": 0,

                "summary": "No answers were submitted.",

                "strengths": [],

                "weaknesses": [],

                "recommendations": [],

                "final_assessment":
                    "No interview performance could be evaluated.",

                "scores": [],
            }

        # =================================================
        # CALCULATE OVERALL SCORE
        # =================================================

        scores = []

        for evaluation in evaluations:

            score = float(
                evaluation.get(
                    "final_score",
                    0,
                )
            )

            score = max(
                0,
                min(score, 100),
            )

            scores.append(score)

        overall_score = round(
            sum(scores) / len(scores),
            2,
        )

        # =================================================
        # PREPARE INTERVIEW DATA
        # =================================================

        interview_data = []

        for index, evaluation in enumerate(evaluations):

            question = ""

            if index < len(questions):

                question = questions[index].get(
                    "question",
                    "",
                )

            interview_data.append({

                "question": question,

                "student_answer": evaluation.get(
                    "student_answer",
                    "",
                ),

                "llm_score": evaluation.get(
                    "llm_score",
                    0,
                ),

                "smith_waterman_score": evaluation.get(
                    "smith_waterman_score",
                    0,
                ),

                "final_score": evaluation.get(
                    "final_score",
                    0,
                ),
            })

        # =================================================
        # FINAL LLM FEEDBACK PROMPT
        # =================================================

        prompt = f"""
You are an expert technical interview evaluator.

Create ONE final interview report based ONLY on the
provided interview data and already-calculated scores.

Role: {role}
Company: {company}
Total Questions: {len(evaluations)}
Overall Score: {overall_score}/100

Interview data:
{json.dumps(interview_data, separators=(",", ":"))}

Analyze the candidate's overall:
- technical knowledge
- strengths
- weaknesses
- answer quality
- interview readiness
- areas needing improvement
- practical recommendations
- final assessment

Rules:
- Do NOT score or re-evaluate individual answers.
- Use the provided scores exactly as given.
- Do NOT give question-by-question feedback.
- Do NOT invent skills or weaknesses.
- Base everything only on the supplied questions, answers and scores.
- Keep the report concise but useful.
- Return ONLY valid JSON.
- Use exactly the five keys shown below.
- All values must have the correct JSON types.
- Do not include Markdown or code fences.
- Do not include text before or after the JSON.
- Ensure every string is complete.
- Ensure the JSON object ends with a closing brace.

Return exactly this structure:

{{
    "summary": "Overall performance analysis",
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "recommendations": ["recommendation 1", "recommendation 2"],
    "final_assessment": "Final interview assessment"
}}
"""

        # =================================================
        # CALL LLAMA
        # =================================================

        llm_response = ask_llama(
            prompt,
            max_tokens=800,
            temperature=0.3,
            response_format="json",
        )

        # =================================================
        # DEFAULT FEEDBACK
        # =================================================

        feedback = {
            "summary":
                "Detailed AI feedback could not be generated.",

            "strengths": [],

            "weaknesses": [],

            "recommendations": [],

            "final_assessment":
                "The interview score was calculated successfully.",
        }

        # =================================================
        # PARSE LLM RESPONSE
        # =================================================

        if llm_response:

            try:

                parsed = parse_feedback_json(
                    llm_response
                )

                feedback = normalize_feedback(
                    parsed,
                    feedback,
                )

            except Exception as error:

                logging.error(
                    "Final feedback JSON parsing error: %s",
                    error,
                )

                logging.error(
                    "Raw LLM response: %s",
                    llm_response,
                )

        else:

            logging.warning(
                "Llama returned an empty final feedback response."
            )

        # =================================================
        # CLASSIFICATION
        # =================================================

        if overall_score >= 85:

            classification = "Excellent"

        elif overall_score >= 75:

            classification = "Very Good"

        elif overall_score >= 65:

            classification = "Good"

        elif overall_score >= 50:

            classification = "Needs Improvement"

        else:

            classification = "Beginner"

        # =================================================
        # SCORE INFORMATION
        # =================================================

        score_details = []

        for index, evaluation in enumerate(evaluations):

            score_details.append({

                "question_number": index + 1,

                "llm_score": round(
                    float(
                        evaluation.get(
                            "llm_score",
                            0,
                        )
                    ),
                    2,
                ),

                "smith_waterman_score": round(
                    float(
                        evaluation.get(
                            "smith_waterman_score",
                            0,
                        )
                    ),
                    2,
                ),

                "final_score": round(
                    float(
                        evaluation.get(
                            "final_score",
                            0,
                        )
                    ),
                    2,
                ),
            })

        # =================================================
        # FINAL RESPONSE
        # =================================================

        return {

            "success": True,

            "overall_score":
                overall_score,

            "percentage":
                overall_score,

            "classification":
                classification,

            "total_questions":
                len(evaluations),

            "summary":
                feedback["summary"],

            "strengths":
                feedback["strengths"],

            "weaknesses":
                feedback["weaknesses"],

            "recommendations":
                feedback["recommendations"],

            "final_assessment":
                feedback["final_assessment"],

            "scores":
                score_details,

            "evaluation_method": {

                "llm_weight":
                    "80%",

                "smith_waterman_weight":
                    "20%",

                "formula":
                    "Final Score = (LLM Score × 0.80) + "
                    "(Smith-Waterman Score × 0.20)",

                "overall_score":
                    "Average of all individual final scores",
            },

            "role":
                role,

            "company":
                company,
        }

    except Exception as error:

        logging.error(
            traceback.format_exc()
        )

        return {

            "success": False,

            "overall_score": 0,

            "percentage": 0,

            "classification":
                "Evaluation Error",

            "total_questions":
                len(evaluations)
                if evaluations
                else 0,

            "summary":
                "Unable to generate final interview feedback.",

            "strengths": [],

            "weaknesses": [],

            "recommendations": [],

            "final_assessment":
                "An error occurred while generating the final report.",

            "scores": [],

            "error":
                str(error),
        }