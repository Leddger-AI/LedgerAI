import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

// Replace these configuration options with your actual Firebase project settings
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId: "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID"
};

// Initialize Firebase Client
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * Initiates Google login with Google Calendar scopes via Firebase
 * @returns {Promise<{user: any, firebaseIdToken: string, googleAccessToken: string}>}
 */
export const loginWithGoogleAndCalendar = async () => {
  const provider = new GoogleAuthProvider();
  
  // Request Google Calendar read-only access scope
  provider.addScope("https://www.googleapis.com/auth/calendar.events.readonly");
  
  try {
    const result = await signInWithPopup(auth, provider);
    
    // Capture the Google OAuth credentials
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const googleAccessToken = credential?.accessToken;
    
    if (!googleAccessToken) {
      throw new Error("Failed to retrieve Google Access Token from login credentials.");
    }
    
    // Capture the Firebase ID Token for backend authentication
    const firebaseIdToken = await result.user.getIdToken();
    
    return {
      user: result.user,
      firebaseIdToken,
      googleAccessToken
    };
  } catch (error) {
    console.error("Google/Firebase login error:", error);
    throw error;
  }
};
