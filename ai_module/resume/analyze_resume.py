from resume.resume_analyzer import analyze_resume_with_llama


def run_resume_analysis(
    resume_text,
    job_description,
    target_role=""
):
    if not isinstance(resume_text, str) or not resume_text.strip():
        raise ValueError("Resume text is required")

    if not isinstance(job_description, str) or not job_description.strip():
        raise ValueError("Job description is required")

    analysis = analyze_resume_with_llama(
        resume_text=resume_text,
        job_description=job_description,
        target_role=target_role
    )

    return {
        "success": True,
        "analysis": analysis
    }