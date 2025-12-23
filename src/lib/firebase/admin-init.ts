import * as admin from "firebase-admin";

// Ensure Firebase Admin is only initialized once
let firebaseAdmin: admin.app.App | undefined;
let auth: admin.auth.Auth | null = null;
let firestore: admin.firestore.Firestore | null = null;
let storage: admin.storage.Storage | null = null;

export function initializeFirebaseAdmin() {
  // During build time, environment variables might not be available
  // We should handle this gracefully instead of crashing
  const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (admin.apps.length === 0) {
    try {
      // Parse the base64-encoded service account key
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
        ? JSON.parse(
            Buffer.from(
              process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
              "base64"
            ).toString()
          )
        : undefined;

      if (!serviceAccount) {
        if (isBuildTime) {
          console.warn("Firebase Admin not initialized during build time - this is expected");
          return null;
        }
        console.error("Missing or invalid FIREBASE_SERVICE_ACCOUNT_KEY");
        return null;
      }

      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
        storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
      });

      // Initialize services
      auth = admin.auth();
      firestore = admin.firestore();
      storage = admin.storage();

      console.log("Firebase Admin initialized successfully");
    } catch (error) {
      console.error("Error initializing Firebase Admin:", error);
      if (isBuildTime) {
        console.warn("Skipping Firebase Admin initialization during build");
        return null;
      }
      return null;
    }
  } else {
    firebaseAdmin = admin.app();
    // Ensure services are initialized
    if (!auth) auth = admin.auth();
    if (!firestore) firestore = admin.firestore();
    if (!storage) storage = admin.storage();
  }

  return firebaseAdmin;
}

// DO NOT initialize on module load - this causes build failures
// Initialize lazily when first needed instead

// Export Firebase Admin services (will be null until initialized)
export { auth, firestore, storage };

// Export functions to get fresh instances if needed
export const getFirestore = () => {
  const app = initializeFirebaseAdmin();
  if (!app && admin.apps.length === 0) {
    throw new Error("Firebase Admin is not initialized");
  }
  return admin.firestore();
};

export const getAuth = () => {
  const app = initializeFirebaseAdmin();
  if (!app && admin.apps.length === 0) {
    throw new Error("Firebase Admin is not initialized");
  }
  return admin.auth();
};

export const getStorage = () => {
  const app = initializeFirebaseAdmin();
  if (!app && admin.apps.length === 0) {
    throw new Error("Firebase Admin is not initialized");
  }
  return admin.storage();
};
