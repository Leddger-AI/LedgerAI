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
    
    try:
        # Verify the integrity of the token and check signature
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token  # Contains user uid, email, display name, etc.
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired credentials: {str(e)}"
        )
