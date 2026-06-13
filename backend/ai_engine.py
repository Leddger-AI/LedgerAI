import os
import json
import google.generativeai as genai

# Configure Gemini API client if key is in env
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

PROMPT_TEMPLATE = """You are an expert HR cost intelligence agent. Your job is to analyze a calendar meeting's context and assign it to the most appropriate project from the provided taxonomy list.

Available Projects:
1. "Project Phoenix" - Core database upgrades and backend architecture.
2. "Client ABC Onboarding" - Frontend integration, user feedback, and client calls for ABC.
3. "Q4 Marketing Strategy" - Social media campaigns, ad design, and growth metrics.
4. "Internal Operations" - General standups, HR syncs, 1-on-1s, and administrative work.

Rules:
- Select exactly ONE project from the list. If it does not match 1, 2, or 3, default to "Internal Operations".
- Provide a confidence score between 0 and 100 based on keyword match strength.
- If the meeting context is highly ambiguous, set a low confidence score (< 50).

Your response must be a strict JSON object with no markdown wrappers:
{{
  "project_name": "Project Name",
  "confidence_score": 85,
  "reasoning": "Brief explanation of why this project was chosen."
}}

Meeting Context to Analyze:
Title: {title}
Description: {description}
Duration: {duration_minutes} minutes
Attendees Count: {attendees_count}
"""

def attribute_meeting(title: str, description: str = "", duration_minutes: int = 0, attendees_count: int = 0) -> dict:
    """
    Classifies a calendar event using the Gemini API.
    Falls back to a keyword-matching heuristic if GEMINI_API_KEY is not set.
    """
    if not api_key:
        import re
        title_lower = title.lower()
        desc_lower = description.lower() if description else ""
        
        def match_any(keywords):
            for kw in keywords:
                # Compile regex with word boundaries around the keyword
                pattern = rf'\b{re.escape(kw)}\b'
                if re.search(pattern, title_lower) or re.search(pattern, desc_lower):
                    return True
            return False
        
        # Keywords for Project Phoenix
        if match_any(["phoenix", "database", "backend", "db", "migration", "architecture"]):
            return {
                "project_name": "Project Phoenix",
                "confidence_score": 92,
                "reasoning": "Matching technical keyword (phoenix, database, architecture, or backend) detected in meeting details."
            }
        
        # Keywords for Client ABC Onboarding
        elif match_any(["abc", "onboarding", "client sync", "feedback", "client call"]):
            return {
                "project_name": "Client ABC Onboarding",
                "confidence_score": 89,
                "reasoning": "Matching client/onboarding keyword (abc, client, or onboarding) detected in meeting details."
            }
            
        # Keywords for Q4 Marketing Strategy
        elif match_any(["marketing", "campaign", "ad design", "social media", "growth"]):
            return {
                "project_name": "Q4 Marketing Strategy",
                "confidence_score": 85,
                "reasoning": "Matching marketing/growth keyword (marketing, campaign, or ad design) detected in meeting details."
            }
            
        # Default to Internal Operations
        else:
            return {
                "project_name": "Internal Operations",
                "confidence_score": 75,
                "reasoning": "Defaulted to Internal Operations as the meeting details do not contain project-specific keywords."
            }

    try:
        # Load the Gemini flash model
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = PROMPT_TEMPLATE.format(
            title=title,
            description=description,
            duration_minutes=duration_minutes,
            attendees_count=attendees_count
        )
        
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Clean markdown wrappers if returned by the LLM
        if text.startswith("```json"):
            text = text.split("```json")[1].split("```")[0].strip()
        elif text.startswith("```"):
            text = text.split("```")[1].split("```")[0].strip()
            
        return json.loads(text)
    except Exception as e:
        print(f"Error during Gemini API call: {e}")
        return {
            "project_name": "Internal Operations",
            "confidence_score": 30,
            "reasoning": f"AI Engine exception: {str(e)}. Defaulted to Internal Operations."
        }
