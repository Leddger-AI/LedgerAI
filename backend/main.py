from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials as GoogleCredentials
from googleapiclient.discovery import build
from auth import get_current_user
from ai_engine import attribute_meeting

app = FastAPI(title="HR Cost Intelligence Engine API")

# Enable CORS for frontend client-side calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
                "aiReasoning": attribution.get("reasoning")
            })
            
        return {
            "status": "success",
            "firebaseUid": current_user.get("uid"),
            "email": current_user.get("email"),
            "range": "Past 7 Days",
            "count": len(formatted_events),
            "events": formatted_events
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving calendar data: {str(e)}"
        )
