// Check if Firebase Admin has already been initialized
let firebaseAdmin: any;

export function initializeFirebaseAdmin() {
  const { Buffer } = require("buffer");
  if (!global.Buffer) {
    global.Buffer = Buffer;
  }
  if (!(globalThis as any).Buffer) {
    (globalThis as any).Buffer = Buffer;
  }

  const admin = require("firebase-admin");
  
  if (admin.apps.length === 0) {
    try {
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
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
  return require("firebase-admin").firestore();
};

export const getAuth = () => {
  initializeFirebaseAdmin();
  return require("firebase-admin").auth();
};

export const getStorage = () => {
  initializeFirebaseAdmin();
  return require("firebase-admin").storage();
};
