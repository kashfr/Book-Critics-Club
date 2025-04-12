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

// GET handler for retrieving session information
export async function GET(req: NextRequest) {
  try {
    if (!auth) {
      return NextResponse.json(
        { error: "Firebase Auth not initialized" },
        { status: 500 }
      );
    }

    const sessionCookie = cookies().get("session")?.value;

    // If no session cookie exists, return empty session
    if (!sessionCookie) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Verify the session cookie
    try {
      const decodedClaims = await auth.verifySessionCookie(sessionCookie);
      return NextResponse.json({ user: decodedClaims }, { status: 200 });
    } catch (error) {
      // Session cookie is invalid
      return NextResponse.json({ user: null }, { status: 200 });
    }
  } catch (error) {
    console.error("Error verifying session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST handler for creating sessions
export async function POST(req: NextRequest) {
  try {
    if (!auth) {
      return NextResponse.json(
        { error: "Firebase Auth not initialized" },
        { status: 500 }
      );
    }

    const { idToken } = await req.json();

    // If no ID token was provided, return an error
    if (!idToken) {
      return NextResponse.json(
        { error: "No ID token provided" },
        { status: 400 }
      );
    }

    // Create a session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn,
    });

    // Set the cookie
    cookies().set("session", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE handler for deleting sessions (logout)
export async function DELETE() {
  try {
    cookies().set("session", "", {
      maxAge: 0,
      path: "/",
    });

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
