import os
import json
import re
from typing import List
from pydantic import BaseModel

# Structured output Pydantic schema for Gemini
class TagResponse(BaseModel):
    tags: List[str]

# Setup GenAI client using new google-genai SDK
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Warning: Could not initialize Gemini client: {e}")
        client = None
else:
    client = None

def generate_semantic_tags(text: str, client_override = None) -> List[str]:
    """
    Generates 3 to 5 lowercase semantic tags (topics, themes, entities) from the text.
    Uses Gemini Structured Outputs if active, otherwise falls back to a TF-based heuristic.
    """
    active_client = client_override if client_override is not None else client

    # Fallback heuristic if Gemini client is not configured/available
    if not active_client:
        # Lowercase and clean words
        words = re.findall(r'\b[a-zA-Z]{5,15}\b', text.lower())
        
        # Standard english stopwords list + domain noise
        stopwords = {
            "about", "above", "after", "again", "against", "all", "and", "any", "are", 
            "because", "been", "before", "being", "below", "between", "both", "but", 
            "could", "did", "does", "doing", "down", "during", "each", "few", "for", 
            "from", "further", "had", "has", "have", "having", "here", "hers", "him", 
            "his", "how", "into", "itself", "more", "most", "once", "only", "other", 
            "ours", "out", "over", "own", "same", "she", "should", "some", "such", 
            "than", "that", "the", "their", "them", "then", "there", "these", "they", 
            "this", "those", "through", "under", "until", "very", "was", "were", 
            "what", "when", "where", "which", "while", "who", "whom", "why", "with", 
            "would", "your", "yours", "yourself", "yourselves", "slack", "message", 
            "thread", "channel", "conversation", "document", "ingest", "chunk"
        }
        
        filtered = [w for w in words if w not in stopwords]
        
        # Calculate term frequencies
        freq = {}
        for w in filtered:
            freq[w] = freq.get(w, 0) + 1
            
        # Sort and take top 4
        sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        tags = [item[0] for item in sorted_freq[:4]]
        
        if not tags:
            tags = ["general", "knowledge"]
            
        return tags

    # Prompt instructing Gemini to analyze the context and output tags
    prompt = f"""
    Analyze the following snippet of a document or Slack conversation. Extract 3 to 5 precise, lowercase semantic tags representing the key topics, tools, technologies, departments, or project codes discussed.
    
    Text snippet:
    ---
    {text[:4000]}
    ---
    """
    
    try:
        from google.genai import types
        response = active_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TagResponse,
                system_instruction=(
                    "You are a precise technical document categorizer. Generate between 3 and 5 short, "
                    "lowercase tags that summarize the core themes. Do not output anything else."
                ),
                temperature=0.1
            )
        )
        data = json.loads(response.text.strip())
        return [tag.lower().strip() for tag in data.get("tags", []) if tag.strip()][:5]
    except Exception as e:
        print(f"Error during semantic tag generation: {e}. Falling back to heuristic.")
        # Fall back recursively to heuristic by passing None as client override
        return generate_semantic_tags(text, client_override=False)
