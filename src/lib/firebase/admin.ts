import { Buffer } from "buffer";
import admin from "firebase-admin";

// Check if Firebase Admin has already been initialized
let firebaseAdmin: admin.app.App | undefined;

export function initializeFirebaseAdmin() {
  // During build time, environment variables might not be available
  // We should handle this gracefully instead of crashing
  const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!global.Buffer) {
    global.Buffer = Buffer;
  }
  if (!(globalThis as any).Buffer) {
    (globalThis as any).Buffer = Buffer;
  }

  if (admin.apps.length === 0) {
    try {
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        if (isBuildTime) {
          // During build, just log a warning and return undefined
          // API routes will handle the missing admin gracefully
          console.warn("Firebase Admin not initialized during build time - this is expected");
          return undefined;
        }
        throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not defined");
      }

      const serviceAccount = JSON.parse(
        Buffer.from(
          process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
          "base64"
        ).toString()
      );

      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
        storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
      });

      console.log("Firebase Admin initialized successfully");
    } catch (error) {
      console.error("Error initializing Firebase Admin:", error);
      if (isBuildTime) {
        console.warn("Skipping Firebase Admin initialization during build");
        return undefined;
      }
      throw new Error("Failed to initialize Firebase Admin");
    }
  } else {
    firebaseAdmin = admin.app();
  }

  return firebaseAdmin;
}

export { firebaseAdmin };

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
