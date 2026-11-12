import re
from dataclasses import dataclass
from typing import Iterable

from app.models.models import Attachment

_TOKEN_RE = re.compile(r"[a-zA-Z0-9\u0900-\u097F]{2,}")


@dataclass
class RetrievedChunk:
    filename: str
    chunk_index: int
    score: float
    text: str


def chunk_text(text: str, *, chunk_size: int = 1200, overlap: int = 180) -> list[str]:
    """Split extracted document text into overlapping semantic windows."""
    cleaned = text.strip()
    if not cleaned:
        return []
    if len(cleaned) <= chunk_size:
        return [cleaned]

    chunks: list[str] = []
    start = 0
    step = max(200, chunk_size - overlap)
    while start < len(cleaned):
        end = min(len(cleaned), start + chunk_size)
        slice_text = cleaned[start:end].strip()
        if slice_text:
            chunks.append(slice_text)
        if end >= len(cleaned):
            break
        start += step
    return chunks


def _score_chunk(query_terms: set[str], chunk_body: str) -> float:
    if not query_terms:
        return 1.0
    body_lower = chunk_body.lower()
    chunk_terms = set(_TOKEN_RE.findall(body_lower))
    overlap = len(query_terms & chunk_terms)
    phrase_bonus = sum(1.5 for term in query_terms if term in body_lower)
    return float(overlap * 2.0 + phrase_bonus)


def retrieve_relevant_chunks(
    query: str,
    attachments: Iterable[Attachment],
    *,
    top_k: int = 6,
) -> list[RetrievedChunk]:
    """Retrieve the highest-scoring document excerpts across attached files."""
    query_terms = set(_TOKEN_RE.findall(query.lower()))
    candidates: list[RetrievedChunk] = []

    for att in attachments:
        if not att.extracted_text:
            continue
        chunks = chunk_text(att.extracted_text)
        for idx, body in enumerate(chunks, start=1):
            score = _score_chunk(query_terms, body)
            # Keep first chunk slightly boosted so doc overview/metadata is available
            if idx == 1:
                score += 0.75
            candidates.append(
                RetrievedChunk(
                    filename=att.filename,
                    chunk_index=idx,
                    score=score,
                    text=body,
                )
            )

    candidates.sort(key=lambda c: c.score, reverse=True)
    return candidates[:top_k]


def format_rag_context(chunks: list[RetrievedChunk]) -> str:
    if not chunks:
        return ""
    blocks = []
    for ch in chunks:
        blocks.append(f"[Source: {ch.filename} | Section {ch.chunk_index}]\n{ch.text}")
    return "\n\n---\n\n".join(blocks)
