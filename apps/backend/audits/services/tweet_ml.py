import torch
import joblib
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pathlib import Path
from django.conf import settings


class TweetMLAnalyzer:
    """
    ML-based tweet analyzer for format, hook quality, and closer type classification.
    Singleton pattern to avoid reloading models on every request.
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.models_dir = Path(settings.BASE_DIR) / 'ml_data' / 'models'
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        self._load_models()
        self._initialized = True
    
    def _load_models(self):
        """Load all three classification models."""
        # Format classifier
        self.format_model = AutoModelForSequenceClassification.from_pretrained(
            self.models_dir / 'format_classifier_final'
        ).to(self.device)
        self.format_tokenizer = AutoTokenizer.from_pretrained(
            self.models_dir / 'format_classifier_final'
        )
        self.format_encoder = joblib.load(self.models_dir / 'format_label_encoder.pkl')
        
        # Hook quality classifier
        self.hook_model = AutoModelForSequenceClassification.from_pretrained(
            self.models_dir / 'hook_classifier_final'
        ).to(self.device)
        self.hook_tokenizer = AutoTokenizer.from_pretrained(
            self.models_dir / 'hook_classifier_final'
        )
        self.hook_encoder = joblib.load(self.models_dir / 'hook_label_encoder.pkl')
        
        # Closer type classifier
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
    
    def analyze(self, text: str) -> dict:
        """
        Analyze tweet text and return predictions for all three classifiers.
        
        Args:
            text: Tweet text to analyze
            
        Returns:
            dict with format, hookQuality, and closerType predictions
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
                    'confidence': round(format_probs[format_pred].item(), 4)
                },
                'hookQuality': {
                    'label': self.hook_encoder.inverse_transform([hook_pred])[0],
                    'confidence': round(hook_probs[hook_pred].item(), 4)
                },
                'closerType': {
                    'label': self.closer_encoder.inverse_transform([closer_pred])[0],
                    'confidence': round(closer_probs[closer_pred].item(), 4)
                }
            }


# Singleton instance getter
def get_tweet_analyzer():
    return TweetMLAnalyzer()
