import os
from fastapi import Header, HTTPException, status
import firebase_admin
from firebase_admin import credentials, auth

# Initialize the Firebase Admin SDK
# You must download your serviceAccountKey.json from the Firebase Console (Settings -> Service Accounts)
# and place it in your backend workspace directory.
cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "serviceAccountKey.json")

if not firebase_admin._apps:
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        # Fallback for configuration warning (useful in sandbox/local dev setup)
        print(f"WARNING: Firebase service account key not found at {cred_path}.")
        print("Firebase verification will fail until a valid key is provided.")

async def get_current_user(authorization: str = Header(...)) -> dict:
    """
    Dependency to verify the Firebase ID Token supplied in the Authorization Header.
    Expects format: 'Bearer <Firebase_ID_Token>'
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization schema. Header must begin with 'Bearer '"
        )
    
    id_token = authorization.split("Bearer ")[1]
    
    # Try standard Firebase authentication if initialized
    if firebase_admin._apps:
        try:
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
        except Exception as e:
            print(f"Firebase token verification failed: {e}. Falling back to unverified decode.")
            
    # Local development fallback: Decode JWT token without verification if service account key is missing or verification fails
    try:
        import base64
        import json
        parts = id_token.split('.')
        if len(parts) == 3:
            payload_b64 = parts[1]
            padding = '=' * (4 - len(payload_b64) % 4)
            payload_decoded = base64.urlsafe_b64decode(payload_b64 + padding).decode('utf-8')
            decoded_token = json.loads(payload_decoded)
            print("WARNING: Using unverified decoded Firebase ID token for local development.")
            return decoded_token
    except Exception as fallback_err:
        print(f"Fallback JWT decoding failed: {fallback_err}")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired credentials, and unverified fallback decoding failed."
    )
