import re
from typing import Optional

from fastapi import HTTPException, status

_UNSAFE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(
            r"\b(porn|porno|pornography|xxx|nsfw|hentai|erotic|erotica|nude|nudes|nudity|"
            r"naked|topless|stripper|striptease|explicit\s+sex|sexual\s+intercourse|"
            r"blowjob|handjob|boobs|tits|pussy|vagina|penis|cock|dick|anal\s+sex|"
            r"sex\s+video|sex\s+photo|sex\s+image|sexy\s+nude|camgirl|onlyfans|"
            r"ganda\s+photo|gandi\s+photo|ganda\s+pic|nangi|nanga|chudai|randi|"
            r"child\s+sexual|underage\s+sex|csam|loli|shota)\b",
            re.IGNORECASE,
        ),
        "Explicit sexual, pornographic, nude, or NSFW requests are strictly prohibited under SURAJ AI safety rules.",
    ),
]


def check_prompt_safety(text: Optional[str]) -> Optional[str]:
    """Return a policy violation reason if the prompt contains prohibited NSFW/explicit content."""
    if not text or not text.strip():
        return None
    for pattern, reason in _UNSAFE_PATTERNS:
        if pattern.search(text):
            return reason
    return None


def enforce_content_safety(text: Optional[str]) -> None:
    """Raise HTTP 400 CONTENT_POLICY_VIOLATION if the prompt violates SURAJ AI safety rules."""
    reason = check_prompt_safety(text)
    if reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "CONTENT_POLICY_VIOLATION",
                "message": reason,
            },
        )

