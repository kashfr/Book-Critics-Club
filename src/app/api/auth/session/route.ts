import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Helper to get Firebase Auth dynamically (avoid module-level initialization)
async function getFirebaseAuth() {
  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getAuth } = await import("firebase-admin/auth");
    const { adminCredentials, adminProjectId, adminStorageBucket } = await import(
      "@/lib/firebase/admin-config"
    );

    if (!adminCredentials || !adminProjectId || !adminStorageBucket) {
      console.error("Firebase Admin config missing");
      return null;
    }

    let app;
    if (!getApps().length) {
      app = initializeApp({
        credential: cert(adminCredentials),
        projectId: adminProjectId,
        storageBucket: adminStorageBucket,
      });
    } else {
      app = getApps()[0];
    }

    return getAuth(app);
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    return null;
  }
}

// GET handler for retrieving session information
export async function GET(req: NextRequest) {
  try {
    const auth = await getFirebaseAuth();
    
    if (!auth) {
      // Return empty session instead of error to prevent client-side errors
      return NextResponse.json({ user: null }, { status: 200 });
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
    // Return empty session instead of error
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

// POST handler for creating sessions
export async function POST(req: NextRequest) {
  try {
    const auth = await getFirebaseAuth();
    
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
