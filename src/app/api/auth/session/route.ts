import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import {
  adminCredentials,
  adminProjectId,
  adminStorageBucket,
} from "@/lib/firebase/admin-config";
import { cookies } from "next/headers";

let app: App;
let auth: Auth | null = null; // Keep auth potentially null initially

// Initialize Admin SDK within the route module scope if needed
try {
  console.log("Firebase Admin initialization status:");
  console.log("- Admin credentials exist:", !!adminCredentials);
  console.log("- Admin project ID:", adminProjectId);
  console.log("- Admin storage bucket:", adminStorageBucket);

  if (!getApps().length) {
    if (adminCredentials && adminProjectId && adminStorageBucket) {
      app = initializeApp({
        credential: cert(adminCredentials),
        projectId: adminProjectId,
        storageBucket: adminStorageBucket,
      });
      auth = getAuth(app);
      console.log("✅ Firebase Admin SDK initialized within API route.");
    } else {
      console.error(
        "❌ Firebase Admin SDK not initialized in API route due to missing config."
      );
    }
  } else {
    app = getApps()[0];
    auth = getAuth(app); // Get auth from existing app
    console.log("✅ Using existing Firebase Admin app");
  }
} catch (error) {
  console.error(
    "❌ Failed to initialize Firebase Admin SDK in API route:",
    error
  );
  // Ensure auth remains null on error
  auth = null;
}

// Create a session for a user
export async function POST(req: NextRequest) {
  if (!auth) {
    console.error(
      "Firebase Admin Auth is not available in /api/auth/session POST route."
    );
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const { idToken } = await req.json();
    console.log("Received ID token length:", idToken?.length || 0);

    if (!idToken) {
      console.error("Missing ID token in request");
      return NextResponse.json({ error: "Missing ID token" }, { status: 400 });
    }

    // Use the non-null auth instance
    console.log("Verifying ID token...");
    const decodedToken = await auth.verifyIdToken(idToken);
    console.log("Token verified successfully for UID:", decodedToken.uid);

    // Create a session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    console.log("Creating session cookie...");
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn,
    });
    console.log("Session cookie created successfully");

    // Set the cookie
    cookies().set({
      name: "session",
      value: sessionCookie,
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });
    console.log("Session cookie set successfully");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating session:", error);
    // More detailed error info
    const errorDetails =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : String(error);

    console.error("Error details:", JSON.stringify(errorDetails, null, 2));

    return NextResponse.json(
      { error: "Unauthorized or server error", details: errorDetails },
      { status: 500 }
    );
  }
}

// Clear the session cookie
export async function DELETE() {
  // No Firebase Admin needed here, just cookie manipulation
  try {
    cookies().set({
      name: "session",
      value: "",
      maxAge: -1,
      path: "/",
      httpOnly: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing session:", error);
    return NextResponse.json({ error: "Failed to log out" }, { status: 500 });
  }
}
