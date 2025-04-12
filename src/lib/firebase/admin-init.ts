import * as admin from "firebase-admin";

// Ensure Firebase Admin is only initialized once
let firebaseAdmin: admin.app.App;
let auth: admin.auth.Auth | null = null;
let firestore: admin.firestore.Firestore | null = null;
let storage: admin.storage.Storage | null = null;

export function initializeFirebaseAdmin() {
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

// Initialize on module load
initializeFirebaseAdmin();

// Export Firebase Admin services
export { auth, firestore, storage };

// Export functions to get fresh instances if needed
export const getFirestore = () => {
  initializeFirebaseAdmin();
  return admin.firestore();
};

export const getAuth = () => {
  initializeFirebaseAdmin();
  return admin.auth();
};

export const getStorage = () => {
  initializeFirebaseAdmin();
  return admin.storage();
};
