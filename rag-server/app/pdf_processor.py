"""PDF text extraction and chunking."""

from __future__ import annotations

import io
from dataclasses import dataclass

import pdfplumber
from langchain_text_splitters import RecursiveCharacterTextSplitter


@dataclass
class PageChunk:
    content: str
    page_number: int
    chunk_index: int


_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=100,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def extract_and_chunk(pdf_bytes: bytes) -> tuple[int, list[PageChunk]]:
    """
    Returns (page_count, chunks).
    Each chunk preserves the source page number.
    """
    chunks: list[PageChunk] = []
    global_index = 0

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        page_count = len(pdf.pages)
        for page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            text = text.strip()
            if not text:
                continue

            page_chunks = _splitter.split_text(text)
            for chunk_text in page_chunks:
                chunk_text = chunk_text.strip()
                if len(chunk_text) < 30:  # skip tiny fragments
                    continue
                chunks.append(
                    PageChunk(
                        content=chunk_text,
                        page_number=page_num,
                        chunk_index=global_index,
                    )
                )
                global_index += 1

    return page_count, chunks
