import time
import json
import re
from typing import List, Optional
from openai import OpenAI
import fitz  # PyMuPDF

from models import ExtractedClause, ExtractionResult, ClauseType
from prompts import COVENANT_EXTRACTION_PROMPT, RAG_SYSTEM_PROMPT, RAG_USER_PROMPT


class ExtractionPipeline:
    """Core pipeline for extracting bond covenants from PDF documents."""

    def __init__(self, openai_api_key: str):
        self.client = OpenAI(api_key=openai_api_key)
        self.model = "gpt-4o"

    def extract_text_from_pdf(self, file_path: str) -> tuple[List[str], int]:
        """Extract text from PDF, returning list of page texts and page count."""
        doc = fitz.open(file_path)
        pages = []
        for page in doc:
            text = page.get_text("text")
            pages.append(text)
        doc.close()
        return pages, len(pages)

    def chunk_text(self, pages: List[str], chunk_size: int = 8000) -> List[dict]:
        """Chunk page text into manageable segments with metadata."""
        chunks = []
        current_chunk = ""
        current_pages = []

        for page_num, page_text in enumerate(pages, start=1):
            if len(current_chunk) + len(page_text) > chunk_size:
                if current_chunk:
                    chunks.append({
                        "text": current_chunk,
                        "pages": current_pages,
                        "page_start": current_pages[0] if current_pages else page_num
                    })
                current_chunk = page_text
                current_pages = [page_num]
            else:
                current_chunk += "\n" + page_text
                current_pages.append(page_num)

        if current_chunk:
            chunks.append({
                "text": current_chunk,
                "pages": current_pages,
                "page_start": current_pages[0] if current_pages else 1
            })

        return chunks

    def _extract_clauses_from_chunk(self, text: str, page_start: int) -> List[ExtractedClause]:
        """Call OpenAI to extract covenant clauses from a text chunk."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You extract bond covenants from legal documents."},
                {"role": "user", "content": COVENANT_EXTRACTION_PROMPT.format(text=text[:8000])},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )

        raw = response.choices[0].message.content
        data = json.loads(raw)
        items = data if isinstance(data, list) else data.get("clauses", [])

        clauses = []
        for item in items:
            clauses.append(ExtractedClause(
                clause_type=item.get("clause_type", "other"),
                category=item.get("category", "other"),
                raw_text=item.get("raw_text", "")[:1000],
                normalized_value=item.get("normalized_value"),
                confidence_score=float(item.get("confidence_score", 0.5)),
                page_number=item.get("page_number", page_start),
                section_reference=item.get("section_reference"),
            ))

        return clauses

    def _deduplicate(self, clauses: List[ExtractedClause]) -> List[ExtractedClause]:
        """Remove near-duplicate clauses by raw text similarity."""
        seen = set()
        unique = []
        for clause in clauses:
            key = re.sub(r'\s+', ' ', clause.raw_text[:100].lower()).strip()
            if key not in seen:
                seen.add(key)
                unique.append(clause)
        return unique

    def run(self, document_id: str, file_path: str) -> ExtractionResult:
        """Run the full extraction pipeline on a PDF document."""
        start_time = time.time()

        pages, total_pages = self.extract_text_from_pdf(file_path)
        chunks = self.chunk_text(pages)

        all_clauses = []
        for chunk in chunks:
            try:
                clauses = self._extract_clauses_from_chunk(
                    chunk["text"],
                    chunk["page_start"]
                )
                all_clauses.extend(clauses)
            except Exception as e:
                print(f"Error extracting from chunk: {e}")
                continue

        unique_clauses = self._deduplicate(all_clauses)
        elapsed = time.time() - start_time

        return ExtractionResult(
            document_id=document_id,
            clauses=unique_clauses,
            total_pages=total_pages,
            extraction_time_seconds=elapsed,
            model_used=self.model,
        )


class RAGPipeline:
    """Retrieval-Augmented Generation pipeline for covenant Q&A."""

    def __init__(self, openai_api_key: str):
        self.client = OpenAI(api_key=openai_api_key)
        self.model = "gpt-4o"

    def build_context(self, clauses: List[dict], question: str, top_k: int = 5) -> str:
        """Build context string from relevant clauses."""
        # Simple keyword-based retrieval (production would use vector search)
        question_lower = question.lower()
        scored = []
        for clause in clauses:
            score = 0
            raw_text = clause.get("raw_text", "").lower()
            for word in question_lower.split():
                if len(word) > 3 and word in raw_text:
                    score += 1
            scored.append((score, clause))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_clauses = [c for _, c in scored[:top_k]]

        context_parts = []
        for i, clause in enumerate(top_clauses, 1):
            context_parts.append(
                f"[Clause {i}]\n"
                f"Type: {clause.get('clause_type')}\n"
                f"Category: {clause.get('category')}\n"
                f"Section: {clause.get('section_reference', 'N/A')}\n"
                f"Page: {clause.get('page_number', 'N/A')}\n"
                f"Text: {clause.get('raw_text', '')}\n"
                f"Threshold: {clause.get('normalized_value', 'N/A')}\n"
            )

        return "\n---\n".join(context_parts)

    def answer(self, clauses: List[dict], question: str,
               history: List[dict], top_k: int = 5) -> dict:
        """Generate a citation-backed answer to a covenant question."""
        context = self.build_context(clauses, question, top_k)
        history_str = "\n".join([
            f"{m['role'].upper()}: {m['content']}"
            for m in history[-6:]  # last 3 exchanges
        ])

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": RAG_SYSTEM_PROMPT},
                {"role": "user", "content": RAG_USER_PROMPT.format(
                    context=context,
                    history=history_str,
                    question=question
                )},
            ],
            temperature=0.2,
        )

        answer_text = response.choices[0].message.content
        tokens = response.usage.total_tokens

        return {
            "answer": answer_text,
            "model_used": self.model,
            "tokens_used": tokens,
            "sources": [
                {
                    "clause_type": c.get("clause_type"),
                    "section_reference": c.get("section_reference"),
                    "page_number": c.get("page_number"),
                }
                for c in self.build_context(clauses, question, top_k).split("---")
                if c  # placeholder, real impl would return actual clause metadata
            ][:top_k]
        }
