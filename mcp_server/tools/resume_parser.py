"""Resume parsing from PDF and DOCX files."""

from pathlib import Path


def parse_pdf(file_path: str) -> dict:
    """Extract text and structure from a PDF resume."""
    import pdfplumber

    text_pages = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text_pages.append(page.extract_text() or "")

    full_text = "\n".join(text_pages)
    return _structure_resume(full_text, Path(file_path).name)


def parse_docx(file_path: str) -> dict:
    """Extract text and structure from a DOCX resume."""
    from docx import Document

    doc = Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    full_text = "\n".join(paragraphs)
    return _structure_resume(full_text, Path(file_path).name)


def parse_resume(file_path: str) -> dict:
    """Auto-detect format and parse resume."""
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        return parse_pdf(file_path)
    elif ext in (".docx", ".doc"):
        return parse_docx(file_path)
    else:
        # Plain text fallback
        text = Path(file_path).read_text(encoding="utf-8", errors="ignore")
        return _structure_resume(text, Path(file_path).name)


def _structure_resume(text: str, filename: str) -> dict:
    """Basic section extraction from resume text."""
    sections = {
        "raw_text": text,
        "filename": filename,
        "sections": {},
    }

    # Common section headers
    section_markers = [
        "experience", "education", "skills", "projects",
        "summary", "objective", "certifications", "publications",
        "languages", "awards", "volunteer",
    ]

    lines = text.split("\n")
    current_section = "header"
    sections["sections"][current_section] = []

    for line in lines:
        stripped = line.strip().lower()
        matched = False
        for marker in section_markers:
            if stripped.startswith(marker) or stripped.endswith(marker):
                current_section = marker
                sections["sections"][current_section] = []
                matched = True
                break
        if not matched and line.strip():
            sections["sections"].setdefault(current_section, []).append(line.strip())

    return sections
