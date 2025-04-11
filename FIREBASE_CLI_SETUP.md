# Setting Up Firebase with CLI

This guide provides step-by-step instructions for setting up Firebase in your Next.js project using the Firebase CLI.

## 1. Install the Firebase CLI

```bash
npm install -g firebase-tools
```

## 2. Log in to Firebase

```bash
firebase login
```

This will open a browser window to authenticate with your Google account.

## 3. Initialize Firebase in your project

```bash
# Navigate to your project directory if you're not already there
cd your-project-directory

# Initialize Firebase
firebase init
```

During the initialization process:

1. Select the Firebase features you want to use:
   - Firestore
   - Authentication
   - Storage
   - Hosting (optional)
   - Emulators (recommended for local development)

2. Select or create a Firebase project:
   - Choose an existing project or create a new one
   - If creating new, provide a unique name

3. Configure each service:
   - For Firestore: Accept default rules and indexes files location
   - For Storage: Accept default rules file location
   - For Hosting (if selected): Specify public directory (usually `public` or `out` for Next.js)
   - For Emulators: Select which services to emulate locally (Auth, Firestore, Storage)

## 4. Create a Web App in your Firebase project

```bash
firebase apps:create web book-critics-club
```

## 5. Get your Firebase config

```bash
firebase apps:sdkconfig web
```

Copy the output configuration object (it contains your apiKey, authDomain, etc.) for your environment variables.

## 6. Generate a Service Account Key

```bash
# Go to Firebase console > Project settings > Service accounts
# Click "Generate new private key" to download the JSON file

# Then encode the file to base64
cat path/to/serviceAccountKey.json | base64 > serviceAccountKey.txt
```

Copy the contents of serviceAccountKey.txt for your environment variables.

## 7. Setup Your Environment Variables

Create a `.env.local` file in your project root:

```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Firebase Admin (base64 encoded service account key)
FIREBASE_SERVICE_ACCOUNT_KEY=base64-encoded-service-account-key

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

Fill in with values from steps 5 and 6.

## 8. Configure Firebase Authentication

### Enable authentication providers via CLI:

Unfortunately, the Firebase CLI doesn't directly support enabling auth providers. You'll need to do this in the Firebase Console:

1. Go to the Firebase Console > Authentication > Sign-in method
2. Enable Email/Password, Google, and GitHub providers
3. For Google: No additional setup required
4. For GitHub:
   - Register your app on GitHub (Settings > Developer settings > OAuth Apps)
   - Use this callback URL: `https://your-project-id.firebaseapp.com/__/auth/handler`
   - Add the GitHub Client ID and Client Secret to Firebase

## 9. Setup Firestore Security Rules

Edit the `firestore.rules` file created during initialization:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own documents
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read all book details
    match /books/{bookId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && isAdmin();
    }
    
    // Allow users to read all reviews and write their own
    match /reviews/{reviewId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Allow users to read and write their own reading progress
    match /readingProgress/{progressId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Helper function to check if a user is an admin
    function isAdmin() {
      return request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## 10. Setup Storage Security Rules

Edit the `storage.rules` file created during initialization:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to read all files
    match /{allPaths=**} {
      allow read: if request.auth != null;
    }
    
    // Allow users to upload their own profile pictures
    match /users/{userId}/profile.jpg {
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow admins to upload book covers
    match /books/{bookId}/{fileName} {
      allow write: if request.auth != null && isAdmin();
    }
    
    // Helper function to check if a user is an admin
    function isAdmin() {
      return request.auth != null && firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## 11. Create Firestore Indexes (if needed)

Create a `firestore.indexes.json` file:

```json
{
  "indexes": [
    {
      "collectionGroup": "readingProgress",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "googleBooksId",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "googleBooksId",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## 12. Deploy Firebase Rules and Indexes

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

## 13. Setup Local Emulators (optional but recommended)

If you selected emulators during initialization:

```bash
# Start all configured emulators
firebase emulators:start
```

Update your Firebase configuration for development to use emulators:

```typescript
// In src/lib/firebase/client.ts for development mode
if (process.env.NODE_ENV === 'development') {
  // Connect to local emulators
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}
```

## 14. Create Firebase Admin SDK Configuration File

Create `src/lib/firebase/admin-config.ts`:

```typescript
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
}

if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  throw new Error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable');
}

export const adminConfig = {
  credential: JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString()
  ),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
};
```

## 15. Update Firebase Admin Initialization

```typescript
// In src/lib/firebase/admin.ts
import { adminConfig } from './admin-config';

function initializeFirebaseAdmin() {
  const apps = getApps();
  
  if (!apps.length) {
    return initializeApp(adminConfig);
  }
  
  return apps[0];
}
```

## 16. Test Your Firebase Setup

```bash
# Run your Next.js app
pnpm dev

# In a separate terminal, start Firebase emulators if using them
firebase emulators:start
```

Test authentication, database operations, and storage functions to ensure everything is working correctly.

## 17. Deployment Configuration

When deploying to production:

1. Add all your Firebase environment variables to your hosting platform
2. Make sure to set `NODE_ENV=production` to disable emulators
3. Configure CORS for your Storage bucket if necessary
4. Update allowed domains in Firebase Authentication settings
5. Set API key restrictions in the Google Cloud Console 