# ============================================================
#  Project Name: brandalyze
#  File: tweet_analyzer.py
#  Author: dngi (https://twitter.com/_dngi)
#  Created: 2026-02-23
#  
#  Copyright (c) 2026 Dom G. (https://twitter.com/_dngi)
#  All rights reserved.
#
#  This file and its contents are confidential and
#  proprietary. Unauthorized copying, distribution,
#  modification, or use is strictly prohibited.
# ============================================================

import torch
import joblib
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pathlib import Path


class TweetAnalyzer:
    def __init__(self, models_dir='./models'):
        """
        Initialize the tweet analyzer with all three trained models.
        
        Args:
            models_dir: Directory containing the trained models
        """
        self.models_dir = Path(models_dir)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Load format classifier
        self.format_model = AutoModelForSequenceClassification.from_pretrained(
            self.models_dir / 'format_classifier_final'
        ).to(self.device)
        self.format_tokenizer = AutoTokenizer.from_pretrained(
            self.models_dir / 'format_classifier_final'
        )
        self.format_encoder = joblib.load(self.models_dir / 'format_label_encoder.pkl')
        
        # Load hook quality classifier
        self.hook_model = AutoModelForSequenceClassification.from_pretrained(
            self.models_dir / 'hook_classifier_final'
        ).to(self.device)
        self.hook_tokenizer = AutoTokenizer.from_pretrained(
            self.models_dir / 'hook_classifier_final'
        )
        self.hook_encoder = joblib.load(self.models_dir / 'hook_label_encoder.pkl')
        
        # Load closer type classifier
        self.closer_model = AutoModelForSequenceClassification.from_pretrained(
            self.models_dir / 'closer_classifier_final'
        ).to(self.device)
        self.closer_tokenizer = AutoTokenizer.from_pretrained(
            self.models_dir / 'closer_classifier_final'
        )
        self.closer_encoder = joblib.load(self.models_dir / 'closer_label_encoder.pkl')
        
        # Set models to eval mode
        self.format_model.eval()
        self.hook_model.eval()
        self.closer_model.eval()
    
    def analyze_tweet(self, text):
        """
        Analyze a tweet and return format, hook quality, and closer type predictions.
        
        Args:
            text: Tweet text to analyze
            
        Returns:
            dict: Dictionary containing predictions for format, hookQuality, and closerType
        """
        with torch.no_grad():
            # Format prediction
            format_inputs = self.format_tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=280,
                padding=True
            ).to(self.device)
            format_outputs = self.format_model(**format_inputs)
            format_pred = format_outputs.logits.argmax().item()
            format_probs = torch.softmax(format_outputs.logits, dim=1)[0]
            
            # Hook quality prediction
            hook_inputs = self.hook_tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=280,
                padding=True
            ).to(self.device)
            hook_outputs = self.hook_model(**hook_inputs)
            hook_pred = hook_outputs.logits.argmax().item()
            hook_probs = torch.softmax(hook_outputs.logits, dim=1)[0]
            
            # Closer type prediction
            closer_inputs = self.closer_tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=280,
                padding=True
            ).to(self.device)
            closer_outputs = self.closer_model(**closer_inputs)
            closer_pred = closer_outputs.logits.argmax().item()
            closer_probs = torch.softmax(closer_outputs.logits, dim=1)[0]
            
            return {
                'format': {
                    'label': self.format_encoder.inverse_transform([format_pred])[0],
                    'confidence': format_probs[format_pred].item()
                },
                'hookQuality': {
                    'label': self.hook_encoder.inverse_transform([hook_pred])[0],
                    'confidence': hook_probs[hook_pred].item()
                },
                'closerType': {
                    'label': self.closer_encoder.inverse_transform([closer_pred])[0],
                    'confidence': closer_probs[closer_pred].item()
                }
            }
    
    def analyze_batch(self, texts):
        """
        Analyze multiple tweets at once.
        
        Args:
            texts: List of tweet texts
            
        Returns:
            list: List of prediction dictionaries
        """
        return [self.analyze_tweet(text) for text in texts]


# Example usage
if __name__ == "__main__":
    analyzer = TweetAnalyzer()
    
    print("Tweet Analyzer - Enter a tweet to analyze (Ctrl+C to exit)\n")
    
    while True:
        try:
            tweet_text = input("Enter tweet: ").strip()
            
            if not tweet_text:
                print("Please enter some text.\n")
                continue
            
            result = analyzer.analyze_tweet(tweet_text)
            
            print(f"\nAnalysis Results:")
            print(f"Format: {result['format']['label']} ({result['format']['confidence']:.2%})")
            print(f"Hook Quality: {result['hookQuality']['label']} ({result['hookQuality']['confidence']:.2%})")
            print(f"Closer Type: {result['closerType']['label']} ({result['closerType']['confidence']:.2%})")
            print()
            
        except KeyboardInterrupt:
            print("\n\nExiting...")
            break
