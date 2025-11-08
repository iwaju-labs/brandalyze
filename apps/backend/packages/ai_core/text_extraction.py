import pdfplumber
from docx import Document

def extract_text(filepath, file_type):
    """extract text conditionally from supported file types (TXT/MD/PDF/DOCX)"""
    if file_type in ("txt", "md"):
        return extract_text_file(filepath)
    elif file_type == "pdf":
        return extract_pdf_file(filepath)
    elif file_type == "docx":
        return extract_docx_file(filepath)
    else:
        return f"Unsupported file type: {file_type}"

def extract_text_file(filepath):
    """extract text from text files (TXT/MD)"""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            return content if content.strip() else "Error: the file is empty"
    except UnicodeDecodeError:
        with open(filepath, "r", encoding="latin-1") as f:
            content = f.read()
            return content if content.strip() else "Error: the file is empty"
    except Exception as e:
        return f"Error extracting text: {e}"
    
def extract_pdf_file(filepath):
    """extract text from PDFs"""
    try:
        with pdfplumber.open(filepath) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        return text
    except Exception as e:
        return f"Error extracting PDF: {e}"
    
def extract_docx_file(filepath):
    """extract text from DOCX files"""
    try:
        doc = Document(filepath)
        return "\n".join([para.text for para in doc.paragraphs])
    except Exception as e:
        return f"Error extracting DOCX: {e}"