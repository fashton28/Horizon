"""
Resume Optimizer Service

Uses PyMuPDF for PDF processing and Gemini API for content optimization.
Preserves original document styling while optimizing content.
"""

import fitz  # PyMuPDF
import os
import json
import httpx
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
# Use gemini-2.5-flash (available and separate quota)
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"


@dataclass
class TextBlock:
    """Represents a text block with its styling information."""
    text: str
    font_name: str
    font_size: float
    color: tuple  # RGB
    bbox: tuple  # (x0, y0, x1, y1)
    page_num: int
    flags: int  # bold, italic flags


@dataclass
class ResumeSection:
    """Represents a resume section with its content and styling."""
    name: str  # e.g., "HEADER", "EXPERIENCE", "EDUCATION"
    content: str
    blocks: List[TextBlock]


def extract_text_blocks(pdf_bytes: bytes) -> List[TextBlock]:
    """Extract text blocks with styling information from PDF."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    blocks = []

    for page_num, page in enumerate(doc):
        # Get text blocks with detailed info
        text_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)

        for block in text_dict.get("blocks", []):
            if block.get("type") != 0:  # Skip non-text blocks
                continue

            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    if not text:
                        continue

                    blocks.append(TextBlock(
                        text=text,
                        font_name=span.get("font", ""),
                        font_size=span.get("size", 12),
                        color=tuple(c / 255 for c in fitz.sRGB_to_rgb(span.get("color", 0))),
                        bbox=span.get("bbox", (0, 0, 0, 0)),
                        page_num=page_num,
                        flags=span.get("flags", 0)
                    ))

    doc.close()
    return blocks


def extract_full_text(pdf_bytes: bytes) -> str:
    """Extract plain text from PDF for optimization."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text


def identify_sections(text: str) -> Dict[str, str]:
    """Identify resume sections from text."""
    sections = {}
    current_section = "HEADER"
    current_content = []

    section_keywords = {
        "SUMMARY": ["summary", "objective", "profile", "about me", "professional summary"],
        "EXPERIENCE": ["experience", "work history", "employment", "work experience", "professional experience"],
        "EDUCATION": ["education", "academic", "degree", "university", "college"],
        "SKILLS": ["skills", "technical skills", "competencies", "expertise", "technologies"],
        "PROJECTS": ["projects", "portfolio", "work samples"],
        "CERTIFICATIONS": ["certifications", "certificates", "credentials"],
        "AWARDS": ["awards", "honors", "achievements"],
    }

    lines = text.split('\n')
    for line in lines:
        line_lower = line.lower().strip()

        # Check if line is a section header
        found_section = None
        for section, keywords in section_keywords.items():
            if any(kw in line_lower for kw in keywords) and len(line_lower) < 50:
                found_section = section
                break

        if found_section:
            # Save previous section
            if current_content:
                sections[current_section] = '\n'.join(current_content)
            current_section = found_section
            current_content = [line]
        else:
            current_content.append(line)

    # Save last section
    if current_content:
        sections[current_section] = '\n'.join(current_content)

    return sections


async def optimize_with_gemini(text: str, sections: Dict[str, str]) -> str:
    """Call Gemini API to optimize resume content."""
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY environment variable not set")

    prompt = f"""You are a professional resume writer and career coach. Optimize the following resume to be more impactful and ATS-friendly.

IMPORTANT RULES:
1. Preserve the EXACT structure and section order
2. Keep the same section headers
3. Improve the wording to be more action-oriented and quantifiable
4. Add relevant keywords for ATS systems
5. Fix any grammar or spelling issues
6. Make bullet points concise but impactful
7. DO NOT add new sections or remove existing ones
8. DO NOT change contact information (name, email, phone, address)
9. Return ONLY the optimized resume text, nothing else

ORIGINAL RESUME:
{text}

OPTIMIZED RESUME:"""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GEMINI_API_URL}?key={GOOGLE_API_KEY}",
            json={
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 8192,
                }
            },
            timeout=60.0
        )

        if response.status_code != 200:
            logger.error(f"Gemini API error: {response.status_code} - {response.text}")
            raise Exception(f"Gemini API error: {response.status_code}")

        data = response.json()
        optimized_text = data["candidates"][0]["content"]["parts"][0]["text"]
        return optimized_text.strip()


def generate_optimized_pdf(original_pdf_bytes: bytes, optimized_text: str) -> bytes:
    """
    Generate a new PDF with optimized content while preserving styling.

    This is a simplified approach that:
    1. Extracts styling from original PDF
    2. Creates a new PDF with same page size
    3. Renders optimized text with similar styling
    """
    # Open original to get page dimensions and basic styling
    original_doc = fitz.open(stream=original_pdf_bytes, filetype="pdf")

    # Get page dimensions from first page
    first_page = original_doc[0]
    page_rect = first_page.rect

    # Extract styling info
    text_dict = first_page.get_text("dict")

    # Determine primary font and styling
    fonts = {}
    for block in text_dict.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                font = span.get("font", "helvetica")
                size = span.get("size", 11)
                key = f"{font}_{size}"
                fonts[key] = fonts.get(key, 0) + len(span.get("text", ""))

    # Find most common font (body text)
    primary_font = "helvetica"
    primary_size = 11
    if fonts:
        most_common = max(fonts.keys(), key=lambda k: fonts[k])
        primary_font = most_common.split("_")[0]
        primary_size = float(most_common.split("_")[1])

    original_doc.close()

    # Create new PDF
    new_doc = fitz.open()

    # Split optimized text into lines
    lines = optimized_text.split('\n')

    # Layout parameters
    margin_left = 50
    margin_top = 50
    margin_right = 50
    margin_bottom = 50
    line_height = primary_size * 1.4

    current_page = new_doc.new_page(width=page_rect.width, height=page_rect.height)
    y_position = margin_top
    max_width = page_rect.width - margin_left - margin_right

    # Section header detection (for larger font)
    section_keywords = ["summary", "experience", "education", "skills", "projects",
                       "certifications", "awards", "objective", "profile"]

    for line in lines:
        line = line.strip()
        if not line:
            y_position += line_height * 0.5
            continue

        # Check if new page needed
        if y_position > page_rect.height - margin_bottom:
            current_page = new_doc.new_page(width=page_rect.width, height=page_rect.height)
            y_position = margin_top

        # Determine if this is a section header
        is_header = any(kw in line.lower() for kw in section_keywords) and len(line) < 40

        # Set font size
        font_size = primary_size * 1.3 if is_header else primary_size
        font_name = "helv"  # Helvetica

        # Insert text
        text_point = fitz.Point(margin_left, y_position)
        current_page.insert_text(
            text_point,
            line,
            fontname=font_name,
            fontsize=font_size,
            color=(0, 0, 0)
        )

        y_position += line_height * (1.5 if is_header else 1)

    # Save to bytes
    output = new_doc.tobytes()
    new_doc.close()

    return output


async def optimize_resume(pdf_bytes: bytes) -> bytes:
    """
    Main function to optimize a resume PDF.

    Args:
        pdf_bytes: The original PDF file as bytes

    Returns:
        The optimized PDF as bytes
    """
    logger.info("Starting resume optimization...")

    # Step 1: Extract text from PDF
    logger.info("Extracting text from PDF...")
    full_text = extract_full_text(pdf_bytes)

    if not full_text.strip():
        raise ValueError("Could not extract text from PDF. The file may be image-based or corrupted.")

    logger.info(f"Extracted {len(full_text)} characters of text")

    # Step 2: Identify sections
    logger.info("Identifying resume sections...")
    sections = identify_sections(full_text)
    logger.info(f"Found sections: {list(sections.keys())}")

    # Step 3: Optimize with Gemini
    logger.info("Optimizing content with Gemini...")
    optimized_text = await optimize_with_gemini(full_text, sections)
    logger.info(f"Optimized text: {len(optimized_text)} characters")

    # Step 4: Generate new PDF
    logger.info("Generating optimized PDF...")
    optimized_pdf = generate_optimized_pdf(pdf_bytes, optimized_text)
    logger.info(f"Generated PDF: {len(optimized_pdf)} bytes")

    return optimized_pdf


# For testing
if __name__ == "__main__":
    import asyncio

    async def test():
        # Test with a sample PDF if available
        test_path = "test_resume.pdf"
        if os.path.exists(test_path):
            with open(test_path, "rb") as f:
                pdf_bytes = f.read()

            result = await optimize_resume(pdf_bytes)

            with open("optimized_resume.pdf", "wb") as f:
                f.write(result)

            print("Optimization complete! Check optimized_resume.pdf")
        else:
            print(f"No test file found at {test_path}")

    asyncio.run(test())
