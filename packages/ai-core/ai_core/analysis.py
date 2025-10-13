import openai
from typing import Dict, List, Any
from .embeddings import EmbeddingGenerator, calculate_brand_alignment_score

class BrandAnalyzer:
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
        self.embedding_generator = EmbeddingGenerator(api_key)

    def analyze_brand_alignment(self,
                                new_text: str,
                                brand_samples: List[str],
                                max_requests_per_hour: int = 10) -> Dict[str, Any]:
        """
        Analyze how well the new text aligns with brand voice samples
        """
        try:
            new_text_embedding = self.embedding_generator.generate_embedding(
                new_text, max_requests_per_hour
            )

            if not new_text_embedding:
                return {"error": "Failed to generate embedding for new text"}

            brand_embeddings = []
            for sample in brand_samples:
                embedding = self.embedding_generator.generate_embedding(
                    sample, max_requests_per_hour
                )

                if embedding:
                    brand_embeddings.append(embedding)
                
            if not brand_embeddings:
                return {"error": "Failed to generate brand embeddings"}
            
            alignment_score = calculate_brand_alignment_score(
                new_text_embedding, brand_embeddings
            )

            feedback = self._generate_feedback(new_text, brand_samples, alignment_score)

            return {
                "alignment_score": alignment_score,
                "feedback": feedback,
                "brand_samples_analyzed": len(brand_embeddings),
                "analysis_successful": True
            }
        
        except Exception as e:
            return {"error": f"Analysis failed: {str(e)}"}
        
    def _generate_feedback(self, new_text: str, brand_samples: List[str], score: float) -> Dict[str, Any]:
        """Generate AI feedback about brand alignment"""
        brand_context = "\n".join([f"Brand Sample {i+1}: {sample[:200]}..."
                                   for i, sample in enumerate(brand_samples[:3])])
        
        prompt = f"""
        Analyze the brand alignment of the new text against the brand samples.

        Brand Samples:
        {brand_context}

        New Text to Analyze:
        {new_text}

        Alignment Score: {score}/100

        Provide feedback in this format:
        1. Key tone differences (if any)
        2. Style consistency analysis
        3. Specific suggestions for improvements
        4. What's working well

        Keep feedback concise and actionable. Focus on tone, voice, and style.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.3
            )

            return {
                "ai_feedback": response.choices[0].message.content,
                "tone_analysis": self._extract_tone_score(score),
                "suggestions_count": response.choices[0].message.content.count('\n') + 1
            }
        except Exception as e:
            return {
                "ai_feedback": f"AI feedback unavailable {str(e)}",
                "tone_analysis": self._extract_tone_score(score), 
                "suggestions_count": 0
            }
    
    def _extract_tone_score(self, alignment_score: float) -> str:
        """Convert alignment score to tone description"""
        if alignment_score >= 85:
            return "Excellent brand alignment"
        elif alignment_score >= 70:
            return "Good brand alignment"
        elif alignment_score >= 55:
            return "Moderate brand alignment"
        elif alignment_score >= 40:
            return "Poor brand alignment"
        else:
            return "Very poor brand alignment"