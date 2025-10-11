import re

def clean_text(text):
    """clean extracted text by removing extra whitespace and special characters"""
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\w\s.,!?:;\'"()-]', '', text)
    text = re.sub(r'\n+', '\n', text)
    return text.strip()

def chunk_by_sentences(text, max_chunk_size=1000):
    sentences = re.split(r'([.!?]+)', text)
    
    proper_sentences = []
    for i in range(0, len(sentences)-1, 2):
        sentence = sentences[i].strip()
        punctuation = sentences[i+1] if i+1 < len(sentences) else ''
        if sentence:
            proper_sentences.append(sentence + punctuation)
    
    if not proper_sentences:
        return [text.strip()] if text.strip() else []
    
    chunks = []
    
    for sentence in proper_sentences:
        sentence = sentence.strip()
        if len(sentence) <= max_chunk_size:
            chunks.append(sentence)
        else:
            chunks.append(sentence[:max_chunk_size])
            remaining = sentence[max_chunk_size:]
            if remaining.strip():
                chunks.append(remaining.strip())
    
    return [chunk for chunk in chunks if chunk.strip()]

def chunk_by_paragraphs(text, max_chunk_size=1500):
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk + para) <= max_chunk_size:
            current_chunk += para + "\n\n"
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para + "\n\n"

    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

def process_text(text: str, max_chunk_size=1000, strategy="sentences"):
    if not text or len(text.strip()) < 3:
        return []
    
    if len(text) > 1_000_000:
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