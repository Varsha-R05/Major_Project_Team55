import json
import re

from llama.llama_client import ask_llama


# ==========================================
# JSON EXTRACTION
# ==========================================

def extract_json(response):

    if isinstance(response, dict):
        return response

    if not isinstance(response, str):
        raise ValueError("Invalid Llama response")

    response = response.strip()

    response = re.sub(
        r"^```(?:json)?\s*",
        "",
        response,
        flags=re.IGNORECASE
    )

    response = re.sub(r"\s*```$", "", response)

    try:
        return json.loads(response)

    except json.JSONDecodeError:

        start = response.find("{")
        end = response.rfind("}")

        if start == -1 or end == -1:
            raise ValueError("Llama did not return valid JSON")

        return json.loads(response[start:end + 1])


# ==========================================
# NORMALIZE STRING ARRAYS
# ==========================================

def normalize_string_list(value):

    if not isinstance(value, list):
        return []

    items = []

    for item in value:

        if isinstance(item, str) and item.strip():
            items.append(item.strip())

        elif isinstance(item, dict):

            # Support older object-based skill responses.
            text = (
                item.get("skill")
                or item.get("keyword")
                or item.get("text")
                or item.get("name")
            )

            if isinstance(text, str) and text.strip():
                items.append(text.strip())

    return items


# ==========================================
# NORMALIZE ATS SCORE
# ==========================================

def normalize_score(value):

    try:
        score = float(value)

        if not 0 <= score <= 100:
            return 0

        return round(score)

    except (ValueError, TypeError):
        return 0


# ==========================================
# RESUME ANALYZER
# ==========================================

def analyze_resume_with_llama(
    resume_text,
    job_description,
    target_role=""
):

    if not isinstance(resume_text, str) or not resume_text.strip():
        raise ValueError("Resume text is required")

    if not isinstance(job_description, str) or not job_description.strip():
        raise ValueError("Job description is required")

    resume_text = resume_text[:12000]
    job_description = job_description[:7000]

    # ======================================
    # DEBUG INFORMATION
    # ======================================

    print("\n========== RESUME TEXT ==========")
    print(resume_text[:2000])

    print("\n========== JOB DESCRIPTION ==========")
    print(job_description[:1500])

    print("\n========== TARGET ROLE ==========")
    print(target_role)

    # ======================================
    # LLAMA PROMPT
    # ======================================
    prompt = f"""
You are an expert ATS resume evaluator and technical recruiter.

Evaluate the resume against the target role and job description.

RESUME:
{resume_text}

TARGET ROLE:
{target_role}

JOB DESCRIPTION:
{job_description}

TASKS:
1. Identify relevant skills demonstrated in the resume.
2. Identify job-required skills not demonstrated.
3. Find relevant job-description keywords missing from the resume.
4. Calculate a realistic ATS score (0-100) based on skills,
   experience, projects, keywords, education, and qualifications.
5. Identify strengths supported by resume evidence.
6. Identify relevant skill gaps and weaknesses.
7. Provide practical improvement recommendations.

SKILL COMPARISON RULES:
- Review the entire resume, including experience, projects,
  education, certifications, and summary.
- Recognize equivalent technologies where appropriate
  (e.g., RESTful services demonstrate REST API knowledge).
- Include matching skills only when supported by resume evidence.
- Include missing skills only when job-relevant and not demonstrated.
- Do not invent skills, experience, or achievements.
- Do not automatically return empty matching_skills or missing_skills.
- Empty matching_skills is acceptable only when no relevant skills
  are demonstrated.
- Avoid duplicate or irrelevant skills and keywords.
- Do not contradict matching_skills with weaknesses or missing_skills.
- Recognize broader concepts demonstrated by specific technologies.
  For example, AWS experience demonstrates cloud platform experience.
- A missing keyword does not automatically mean the related skill is missing.

OUTPUT RULES:
- Return valid JSON only, with exactly these seven keys.
- ats_score must be an integer from 0 to 100.
- All other fields must be arrays of strings.
- Do not include any additional fields or explanations.

FORMAT:
{{
    "ats_score": 70,
    "matching_skills": ["Python", "React"],
    "missing_skills": ["Java", "Spring Boot"],
    "missing_keywords": ["Cloud Computing"],
    "strengths": ["Demonstrated software development experience."],
    "weaknesses": ["Cloud experience is not demonstrated."],
    "recommendations": ["Highlight relevant technical projects."]
}}

Do not return feedback, minor_improvements, experience_feedback,
improvement_suggestions, or suggested_bullet_points.
Do not include Markdown outside the JSON.
"""

    # ======================================
    # CALL LLAMA
    # ======================================

    response = ask_llama(
        prompt=prompt,
        max_tokens=2200,
        temperature=0.1
    )

    print("\n========== GENERATED RESPONSE ==========")
    print(response)

    # ======================================
    # PARSE JSON
    # ======================================

    result = extract_json(response)

    if not isinstance(result, dict):
        raise ValueError("Invalid analysis response")

    # ======================================
    # NORMALIZE RESPONSE
    # ======================================

    analysis = {
        "ats_score": normalize_score(
            result.get("ats_score")
        ),

        "matching_skills": normalize_string_list(
            result.get("matching_skills")
        ),

        "missing_skills": normalize_string_list(
            result.get("missing_skills")
        ),

        "missing_keywords": normalize_string_list(
            result.get("missing_keywords")
        ),

        "strengths": normalize_string_list(
            result.get("strengths")
        ),

        "weaknesses": normalize_string_list(
            result.get("weaknesses")
        ),

        "recommendations": normalize_string_list(
            result.get("recommendations")
        )
    }

    # ======================================
    # FINAL RESPONSE
    # ======================================

    print("\n========== FINAL ATS ANALYSIS ==========")
    print(json.dumps(analysis, indent=4))

    return analysis