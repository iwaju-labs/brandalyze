import re

def clean_text(text):
    """clean extracted text by removing extra whitespace and special characters"""
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\w\s.,!?:;\'"()-]', '', text)
    text = re.sub(r'\n+', '\n', text)
    return text.strip()

def chunk_by_sentences(text, max_chunk_size=1000):
    """split text into chunks by sentences"""
    sentences = re.split(r'[.!?]+', text)
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if len(current_chunk + sentence) <= max_chunk_size:
            current_chunk += sentence + ". "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + "."

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks

def chunk_by_paragraphs(text, max_chunk_size=1500):
    """split text into chunks by paragraph"""
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk + para <= max_chunk_size):
            current_chunk += para + "\n\n"
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para + "\n\n"

    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks