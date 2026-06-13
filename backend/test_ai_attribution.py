import sys
from ai_engine import attribute_meeting

def run_test():
    test_cases = [
        {
            "title": "Phoenix Database Upgrade Sync",
            "desc": "Discussion about backend PostgreSQL database migrations and schema updates for the upgrade.",
            "duration": 60,
            "attendees": 4
        },
        {
            "title": "Client ABC Kickoff Meeting",
            "desc": "Sync with the Client ABC onboarding team to collect initial user feedback.",
            "duration": 45,
            "attendees": 3
        },
        {
            "title": "Q4 Social Media Growth & Campaigns",
            "desc": "Ad designs reviews, growth metrics, and visual strategies for next quarter.",
            "duration": 90,
            "attendees": 5
        },
        {
            "title": "Weekly Team Catch-up & General Standup",
            "desc": "Status update and administrative alignment for the operations team.",
            "duration": 30,
            "attendees": 8
        },
        {
            "title": "Ambiguous Coffee Chat",
            "desc": "Just catching up.",
            "duration": 15,
            "attendees": 2
        }
    ]
    
    print("==================================================")
    print("Testing HR Cost Intelligence Engine AI Attribution")
    print("==================================================")
    
    for idx, case in enumerate(test_cases, 1):
        print(f"\nTest #{idx}: '{case['title']}'")
        res = attribute_meeting(
            title=case['title'],
            description=case['desc'],
            duration_minutes=case['duration'],
            attendees_count=case['attendees']
        )
        print(f"  -> Assigned Project:  {res.get('project_name')}")
        print(f"  -> Confidence Score:  {res.get('confidence_score')}%")
        print(f"  -> Choice Reasoning:  {res.get('reasoning')}")

if __name__ == "__main__":
    run_test()
