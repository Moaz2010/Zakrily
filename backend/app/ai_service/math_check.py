"""AI-08: vision call -> structured JSON -> normalized final-answer compare.

Stub implementation. Real version sends image_bytes to a vision-capable model,
parses {final_answer, steps[]}, normalizes, and compares to Question.correct_answer.
`unreadable` is a first-class verdict, not an error.
"""

from app.core.storage import upload_math_image


def check_math(image_bytes: bytes, question_id: int) -> dict:
    image_url = upload_math_image(image_bytes)
    return {
        "verdict": "unreadable",
        "feedback": "[stub] Math check not yet implemented — real vision call goes here.",
        "extracted": {"final_answer": None, "steps": [], "image_url": image_url},
    }
