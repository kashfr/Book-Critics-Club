import { NextResponse } from "next/server";
import { auth, firestore } from "@/lib/firebase/admin-init"; // Corrected import path

// Function to get user ID from token (replace with your actual auth logic)
async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authorization = request.headers.get("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    const idToken = authorization.split("Bearer ")[1];
    try {
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

    // TODO: Add validation for profileData here

    // Reference to the user's document in the 'users' collection
    const userDocRef = firestore.collection("users").doc(userId);

    // Update the user document
    await userDocRef.set(profileData, { merge: true }); // Use set with merge:true to update/create

    console.log(`Profile updated successfully for user: ${userId}`);
    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    // Check if error is a known type or cast to Error
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
