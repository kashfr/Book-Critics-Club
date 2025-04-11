// Ensure the API route runs in Node.js runtime
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initializeFirebaseAdmin } from "@/lib/firebase/admin";

// Initialize Firebase Admin SDK if not already initialized
initializeFirebaseAdmin();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 }
      );
    }

    const auth = getAuth();

    // Create the user using Firebase Admin SDK
    // Note: Firebase handles password hashing securely.
    // You might want to add displayName or photoURL if available.
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: false, // Or true if you have a verification flow
      // disabled: false, // User is enabled by default
    });

    console.log("Successfully created new user:", userRecord.uid);

    // Optionally: Store additional user profile data in Firestore
    // Example: await getFirestore().collection('users').doc(userRecord.uid).set({ profileData });

    return NextResponse.json(
      { message: "User registered successfully.", userId: userRecord.uid },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error during sign up:", error);

    // Handle specific Firebase Auth errors
    let errorMessage = "Internal server error.";
    let statusCode = 500;
    if (error.code === "auth/email-already-exists") {
      errorMessage = "User already exists.";
      statusCode = 400;
    } else if (error.code === "auth/invalid-password") {
      errorMessage = "Password must be at least 6 characters long.";
      statusCode = 400;
    } // Add more specific error handling as needed

    return NextResponse.json(
      {
        message: errorMessage,
        code: error.code || "ERR_INTERNAL_SERVER_ERROR",
      },
      { status: statusCode }
    );
  }
}
