"""
Utility functions for loading prompts and data from text files
"""
import os
from pathlib import Path
from typing import List
from functools import lru_cache

# Base paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROMPTS_DIR = BACKEND_DIR / 'prompts'
DATA_DIR = BACKEND_DIR / 'data'


@lru_cache(maxsize=32)
def load_prompt(filename: str) -> str:
    """
    Load a prompt template from the prompts directory.
    Results are cached for performance.
    
    Args:
        filename: Name of the prompt file (e.g., 'brand_alignment_analysis.txt')
    
    Returns:
        The prompt template as a string
    """
    filepath = PROMPTS_DIR / filename
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read().strip()
    except FileNotFoundError:
        raise FileNotFoundError(f"Prompt file not found: {filepath}")
    except Exception as e:
        raise Exception(f"Error loading prompt from {filepath}: {e}")


@lru_cache(maxsize=32)
def load_data_list(filename: str) -> List[str]:
    """
    Load a list of items from a data file (one item per line).
    Results are cached for performance.
    
    Args:
        filename: Name of the data file (e.g., 'x_high_performing_themes.txt')
    
    Returns:
        List of strings, one per line (empty lines and comments are ignored)
    """
    filepath = DATA_DIR / filename
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = [
                line.strip() 
                for line in f.readlines() 
                if line.strip() and not line.strip().startswith('#')
            ]
            return lines
    except FileNotFoundError:
        raise FileNotFoundError(f"Data file not found: {filepath}")
    except Exception as e:
        raise Exception(f"Error loading data from {filepath}: {e}")


def format_prompt(template: str, **kwargs) -> str:
    """
    Format a prompt template with the given keyword arguments.
    
    Args:
        template: The prompt template string
        **kwargs: Variables to substitute in the template
    
    Returns:
        Formatted prompt string
    """
    return template.format(**kwargs)
