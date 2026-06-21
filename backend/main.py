import os
import json
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials as GoogleCredentials
from googleapiclient.discovery import build
from google.auth.exceptions import RefreshError
from auth import get_current_user
from ai_engine import attribute_meeting
from pydantic import BaseModel
from google import genai
from google.genai import types

app = FastAPI(title="HR Cost Intelligence Engine API")

# Import and mount the Knowledge Base router
from knowledge_base.routes import router as kb_router
app.include_router(kb_router)

# Enable CORS for frontend client-side calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the Gemini GenAI client
# The Client will look for GEMINI_API_KEY environment variable by default.
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    client = genai.Client(api_key=api_key)
else:
    client = None

# 1. Pydantic Data Models
class MeetingPayload(BaseModel):
    title: str
    description: str
    duration_minutes: int
    attendees_count: int

class AttributionResponse(BaseModel):
    project_name: str
    confidence_score: int
    reasoning: str

def parse_iso_datetime(dt_str: str) -> datetime:
    """Helper to convert Google ISO datetime strings into Python datetime objects."""
    # Convert Zulu 'Z' suffix to standard offset format for python's fromisoformat
    cleaned = dt_str.replace("Z", "+00:00")
    return datetime.fromisoformat(cleaned)

@app.get("/api/calendar/events")
async def get_calendar_events(
    google_token: str = Query(..., description="Google OAuth Access Token from the frontend"),
    current_user: dict = Depends(get_current_user)
):
    """
    Fetches Google Calendar events from the past 7 days.
    Requires a valid Firebase ID Token in the Authorization header
    and the Google Access Token in query parameters.
    """
    try:
        # Build credential configuration for Google API
        google_creds = GoogleCredentials(token=google_token)
        
        # Instantiate Calendar service
        service = build("calendar", "v3", credentials=google_creds)
        
        # Define time window (Past 7 days up to present time)
        now_dt = datetime.utcnow()
        time_min = (now_dt - timedelta(days=7)).isoformat() + "Z"
        time_max = now_dt.isoformat() + "Z"
        
        # Call the Google Calendar events endpoint
        events_result = service.events().list(
            calendarId="primary",
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime"
        ).execute()
        
        events = events_result.get("items", [])
        formatted_events = []
        
        for event in events:
            # Parse times (All-day events fall back to date key)
            start_data = event.get("start", {})
            end_data = event.get("end", {})
            
            start_str = start_data.get("dateTime") or start_data.get("date")
            end_str = end_data.get("dateTime") or end_data.get("date")
            
            # Calculate duration in minutes (0 if parsing is not possible)
            duration_minutes = 0
            if start_data.get("dateTime") and end_data.get("dateTime"):
                try:
                    start_dt = parse_iso_datetime(start_str)
                    end_dt = parse_iso_datetime(end_str)
                    duration_minutes = int((end_dt - start_dt).total_seconds() / 60)
                except Exception as date_err:
                    print(f"Error parsing date strings: {date_err}")
            
            # Extract clean attendee list
            attendees = []
            for attendee in event.get("attendees", []):
                attendees.append({
                    "email": attendee.get("email"),
                    "name": attendee.get("displayName", "Unknown"),
                    "response": attendee.get("responseStatus")
                })
                
            # Perform AI cost attribution on the event context
            description = event.get("description", "")
            attribution = attribute_meeting(
                title=event.get("summary", "Untitled Meeting"),
                description=description,
                duration_minutes=duration_minutes,
                attendees_count=len(attendees)
            )
            
            # Use utility function to compute cost and review status
            # Default rate: $75.0/hour per attendee (min 1 for meeting organizer)
            attendees_count = len(attendees)
            total_attendee_hourly_rate = max(1, attendees_count) * 75.0
            cost_info = calculate_meeting_cost_and_status(
                duration_minutes=duration_minutes,
                total_attendee_hourly_rate=total_rate if 'total_rate' in locals() else total_attendee_hourly_rate,
                ai_confidence_score=attribution.get("confidence_score", 0)
            )
                
            formatted_events.append({
                "eventId": event.get("id"),
                "title": event.get("summary", "Untitled Meeting"),
                "description": description,
                "startTime": start_str,
                "endTime": end_str,
                "durationMinutes": duration_minutes,
                "attendees": attendees,
                "organizer": event.get("organizer", {}).get("email"),
                "aiProject": attribution.get("project_name"),
                "aiConfidence": attribution.get("confidence_score"),
                "aiReasoning": attribution.get("reasoning"),
                "cost": cost_info.get("total_cost", 0.0),
                "requiresHumanReview": cost_info.get("requires_human_review", False)
            })
            
        return {
            "status": "success",
            "firebaseUid": current_user.get("uid"),
            "email": current_user.get("email"),
            "range": "Past 7 Days",
            "count": len(formatted_events),
            "events": formatted_events
        }
        
    except RefreshError as re:
        raise HTTPException(
            status_code=401,
            detail="Google Access Token is expired or invalid. Please re-authenticate."
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving calendar data: {str(e)}"
        )

# 2. The Gemini AI Endpoint (/ai/attribute-meeting)
@app.post("/ai/attribute-meeting", response_model=AttributionResponse)
async def attribute_meeting_endpoint(payload: MeetingPayload):
    """
    FastAPI endpoint that classifies a meeting into a project taxonomy.
    Uses Structured Outputs feature (response_schema) of google-genai SDK.
    """
    # Fallback to local heuristic if client/API key is not configured
    if not api_key or client is None:
        fallback_res = attribute_meeting(
            title=payload.title,
            description=payload.description,
            duration_minutes=payload.duration_minutes,
            attendees_count=payload.attendees_count
        )
        return AttributionResponse(
            project_name=fallback_res.get("project_name", "Internal Operations"),
            confidence_score=fallback_res.get("confidence_score", 75),
            reasoning=fallback_res.get("reasoning", "Fallback heuristic attribution due to missing API Key.")
        )

    prompt = f"""
    Please analyze the following meeting details:
    Title: {payload.title}
    Description: {payload.description}
    Duration: {payload.duration_minutes} minutes
    Attendees Count: {payload.attendees_count}
    """

    system_instruction = (
        "You are an AI assistant tasked with classifying meeting details into one of the following four projects:\n"
        "1. Project Phoenix (database upgrades, backend architecture, migrations)\n"
        "2. Client ABC (client onboarding, sync meetings, user feedback)\n"
        "3. Q4 Marketing (social media campaigns, ad design, growth metrics)\n"
        "4. Internal Operations (general standups, HR syncs, 1-on-1s, administrative work)\n\n"
        "Pick the best matching project taxonomy code, assign a confidence score (0-100), and provide reasoning."
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AttributionResponse,
                system_instruction=system_instruction,
                temperature=0.1
            )
        )
        data = json.loads(response.text)
        return AttributionResponse(**data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gemini API invocation failure: {str(e)}"
        )

# 3. Cost Calculation & Graceful Degradation Logic
def calculate_meeting_cost_and_status(
    duration_minutes: int,
    total_attendee_hourly_rate: float,
    ai_confidence_score: int
) -> dict:
    """
    Calculates total meeting cost and flags human review requirement.
    """
    duration_hours = duration_minutes / 60.0
    total_cost = duration_hours * total_attendee_hourly_rate
    requires_human_review = ai_confidence_score < 60
    
    return {
        "total_cost": total_cost,
        "requires_human_review": requires_human_review
    }

from fastapi.responses import RedirectResponse
import urllib.request
import urllib.parse
from firebase_admin import firestore

@app.get("/api/github/callback")
async def github_callback(code: str, state: str = None, installation_id: str = None):
    """
    Callback endpoint for GitHub App OAuth.
    Exchanges the authorization code for a User Access Token.
    Saves credentials safely in Firestore under the Firebase user's UID.
    """
    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")
    frontend_base = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    if not client_id or not client_secret:
        return RedirectResponse(url=f"{frontend_base}/candidate-flow?error=missing_credentials")
        
    # Extract Firebase UID from state parameter (format: "nonce:firebase_uid")
    firebase_uid = "unknown"
    if state:
        state_parts = state.split(":")
        if len(state_parts) > 1:
            firebase_uid = state_parts[1]
            
    try:
        data = urllib.parse.urlencode({
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://github.com/login/oauth/access_token",
            data=data,
            headers={"Accept": "application/json"}
        )

        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            
        token = res_data.get("access_token")
        if not token:
            return RedirectResponse(url=f"{frontend_base}/candidate-flow?error=no_token")
            
        # Fetch user profile to retrieve the username
        user_req = urllib.request.Request(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {token}",
                "User-Agent": "LedgerAI-App"
            }
        )
        with urllib.request.urlopen(user_req) as user_response:
            user_info = json.loads(user_response.read().decode("utf-8"))
            github_username = user_info.get("login")
            
        # Save credentials safely in Firestore under the user's Firebase UID
        if firebase_uid != "unknown":
            try:
                db = firestore.client()
                db.collection("users").document(firebase_uid).set({
                    "github_access_token": token,
                    "github_username": github_username,
                    "installation_id": installation_id or "",
                    "updated_at": firestore.SERVER_TIMESTAMP
                }, merge=True)
            except Exception as fe:
                print(f"Firestore save error (continuing callback): {fe}")
            
        # Redirect back to frontend
        frontend_url = f"{frontend_base}/candidate-flow"
        params = {
            "githubUsername": github_username or "",
            "githubToken": token,
            "status": "connected"
        }
        if installation_id:
            params["installation_id"] = installation_id
            
        redirect_target = f"{frontend_url}?{urllib.parse.urlencode(params)}"
        return RedirectResponse(url=redirect_target)
        
    except Exception as e:
        print(f"Error during GitHub App OAuth callback: {e}")
        return RedirectResponse(url=f"{frontend_base}/candidate-flow?error={urllib.parse.quote(str(e))}")


