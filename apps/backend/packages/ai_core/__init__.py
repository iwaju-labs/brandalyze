"""AI core package for Brandalyze"""

from .embeddings import EmbeddingGenerator, cosine_similarity, calculate_brand_alignment_score
from .analysis import BrandAnalyzer
from .text_extraction import extract_text, extract_text_file, extract_pdf_file, extract_docx_file
from .text_processing import clean_text, chunk_by_sentences, chunk_by_paragraphs, process_text
from .prompts import get_analysis_prompt, get_brand_profile_prompt

__all__ = [
    "EmbeddingGenerator",
    "cosine_similarity", 
    "calculate_brand_alignment_score",
    "BrandAnalyzer",
    "extract_text",
    "extract_text_file",
    "extract_pdf_file", 
    "extract_docx_file",
    "clean_text",
    "chunk_by_sentences",
    "chunk_by_paragraphs",
    "process_text",
    "get_analysis_prompt",
    "get_brand_profile_prompt",
]
