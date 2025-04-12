import * as admin from "firebase-admin";

// Check if Firebase Admin has already been initialized
let firebaseAdmin: admin.app.App;

export function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      const serviceAccount = JSON.parse(
        Buffer.from(
          process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "",
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
      throw new Error("Failed to initialize Firebase Admin");
    }
  } else {
    firebaseAdmin = admin.app();
  }

  return firebaseAdmin;
}

export { firebaseAdmin };

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
