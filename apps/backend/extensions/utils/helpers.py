"""
Utility functions for extension analysis and content processing.
"""
def extract_key_insights(analysis_text):
    """Extract 3 key insights from analysis text"""
    if not analysis_text:
        return ["Analysis completed successfully"]

    # Simple extraction - look for numbered points or bullet points
    lines = analysis_text.split("\n")
    insights = []

    for line in lines:
        line = line.strip()
        if line and (
            line.startswith("•")
            or line.startswith("-")
            or line.startswith("*")
            or any(line.startswith(f"{i}.") for i in range(1, 10))
        ):
            # Clean up the line
            cleaned = line.lstrip("•-*123456789. ").strip()
            if cleaned and len(cleaned) > 10:  # Meaningful insight
                insights.append(cleaned)

        if len(insights) >= 3:
            break

    # Fallback if no structured insights found
    if not insights:
        sentences = analysis_text.replace("\n", " ").split(".")
        for sentence in sentences[:3]:
            sentence = sentence.strip()
            if len(sentence) > 20:
                insights.append(sentence + ".")

    return insights[:3] if insights else ["Brand analysis completed successfully"]
