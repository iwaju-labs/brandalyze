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

def process_text(text: str, max_chunk_size=1000, strategy="sentences"):
    """main text processing function with edge case handling"""
    if not text or len(text.strip()) < 10:
        return [""]
    
    if len(text) > 1_000_000: #1MB limit
        text = text[:1_000_000] + "...[truncated]"

    cleaned_text = clean_text(text)

    # choose chunking strategy
    if strategy == "sentences":
        return chunk_by_sentences(cleaned_text, max_chunk_size)
    elif strategy == "paragraphs":
        return chunk_by_paragraphs(cleaned_text, max_chunk_size)
    else:
        return [cleaned_text[i:i+max_chunk_size] 
            for i in range(0, len(cleaned_text), max_chunk_size)]