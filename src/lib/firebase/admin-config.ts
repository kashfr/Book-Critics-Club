import * as admin from "firebase-admin";

// Parse service account credentials
let _serviceAccount: admin.ServiceAccount | undefined;
try {
  _serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(
        Buffer.from(
          process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
          "base64"
        ).toString()
      )
    : undefined;
} catch (error) {
  console.error("Error parsing Firebase service account:", error);
}

// Export the specific variables needed for Firebase admin initialization
export const adminCredentials = _serviceAccount;
export const adminProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
export const adminStorageBucket = `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`;

// Ensure we only initialize Firebase Admin once
let firebaseAdmin: admin.app.App;

export function initFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      if (!adminCredentials) {
        throw new Error(
          "Missing or invalid FIREBASE_SERVICE_ACCOUNT_KEY environment variable"
        );
      }

      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(adminCredentials),
        databaseURL: `https://${adminProjectId}.firebaseio.com`,
        storageBucket: adminStorageBucket,
      });

      console.log("Firebase Admin initialized successfully");
    } catch (error) {
      console.error("Firebase admin initialization error:", error);
      throw new Error("Failed to initialize Firebase Admin");
    }
  } else {
    firebaseAdmin = admin.app();
  }

  return firebaseAdmin;
}

// Initialize and export Admin SDK services
export function getAdminAuth() {
  initFirebaseAdmin();
  return admin.auth();
}

export function getAdminFirestore() {
  initFirebaseAdmin();
  return admin.firestore();
}

export function getAdminStorage() {
  initFirebaseAdmin();
  return admin.storage();
}

const adminServices = {
  initFirebaseAdmin,
  getAdminAuth,
  getAdminFirestore,
  getAdminStorage,
};

export default adminServices;
