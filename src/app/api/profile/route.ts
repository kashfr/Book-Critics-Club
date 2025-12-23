import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Helper to get Firebase Admin services dynamically (avoid module-level initialization)
async function getFirebaseAdmin() {
  try {
    const { getAuth, getFirestore } = await import("@/lib/firebase/admin");
    return { auth: getAuth(), firestore: getFirestore() };
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    return { auth: null, firestore: null };
  }
}

// Function to get user ID from token
async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authorization = request.headers.get("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    const idToken = authorization.split("Bearer ")[1];
    try {
      const { auth } = await getFirebaseAdmin();
      if (!auth) {
        console.error("Firebase Admin SDK not initialized.");
        return null;
      }
      const decodedToken = await auth.verifyIdToken(idToken);
      return decodedToken.uid;
    } catch (error) {
      console.error("Error verifying Firebase ID token:", error);
      return null;
    }
  }
  return null;
}

// Add GET handler to retrieve user profile
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { firestore } = await getFirebaseAdmin();
    if (!firestore) {
      console.error("Firestore not initialized.");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Reference to the user's document in the 'users' collection
    const userDocRef = firestore.collection("users").doc(userId);

    // Get the user document
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    console.log(`Profile loaded successfully for user: ${userId}`);

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error retrieving profile:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { firestore } = await getFirebaseAdmin();
    if (!firestore) {
      console.error(
        "Firestore not initialized. Check Firebase Admin SDK setup."
      );
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const profileData = await request.json();

    // Reference to the user's document in the 'users' collection
    const userDocRef = firestore.collection("users").doc(userId);

    // Update the user document
    await userDocRef.set(profileData, { merge: true });

    console.log(`Profile updated successfully for user: ${userId}`);
    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
