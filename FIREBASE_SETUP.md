# Firebase Setup Instructions

## Configuration Files

1. **Firebase Client Setup** (`src/lib/firebase/client.ts`):
   - Initializes Firebase client-side SDK
   - Creates app, auth, firestore, and storage instances
   - Uses environment variables from `.env.local`

2. **Firebase Admin Setup** (`src/lib/firebase/admin.ts`):
   - Initializes Firebase Admin SDK for server-side operations
   - Uses service account credentials
   - Exports admin instances for auth, firestore, and storage
   
3. **Firebase Admin Config** (`src/lib/firebase/admin-config.ts`):
   - Handles the decoding of base64 service account credentials
   - Validates required environment variables
   - Provides the admin configuration object

4. **Firebase Emulators** (`src/lib/firebase/emulators.ts`):
   - Connects to local Firebase emulators in development
   - Configurable via environment variables
   - Used for testing without affecting production data

5. **Firebase Auth Context** (`src/lib/firebase/auth-context.tsx`):
   - Provides authentication context for the application
   - Manages user state and session
   - Implements sign-in, sign-up, and sign-out functionality

## Environment Variables

The following variables are required in `.env.local`:

```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Firebase Admin (base64 encoded service account key)
FIREBASE_SERVICE_ACCOUNT_KEY=your-base64-encoded-service-account-key

# Optional: Emulator Configuration
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
```

## Firebase Project Setup

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Authentication methods:
   - Email/Password
   - Google
   - GitHub (optional)
3. Create a Firestore database
4. Set up Storage
5. Configure security rules for Firestore and Storage

## Service Account Key

To obtain and format your service account key:

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Base64 encode the JSON file:
   ```bash
   cat your-service-account-key.json | base64
   ```
4. Add the encoded string to FIREBASE_SERVICE_ACCOUNT_KEY in .env.local

## Authentication Flow

1. Client-side auth uses Firebase Auth SDK
2. Server-side session management uses Firebase Admin SDK 
3. Session cookies provide persistence across refreshes
4. The `auth-context.tsx` provides React hooks for authentication
5. API routes in `src/app/api/auth/session` handle server-side sessions

## Implementation Details

- **User Authentication**: Implemented via Firebase Auth with email/password and social providers
- **Session Management**: Uses HTTP-only cookies for secure sessions
- **Server-Side Auth**: Admin SDK verifies session tokens on protected routes
- **Error Handling**: Comprehensive error handling for authentication flows

## Troubleshooting

- If using emulators, make sure they're running before starting the app
- Check Firebase console for authentication settings
- Verify service account permissions
- Ensure proper CORS configuration for auth domains
- For Firebase emulator issues, set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false` 