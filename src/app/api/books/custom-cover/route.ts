import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET: Retrieve custom cover URL for a book
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");

  if (!bookId) {
    return NextResponse.json({ error: "bookId required" }, { status: 400 });
  }

  try {
    // Dynamic import to avoid build-time initialization
    const { initializeFirebaseAdmin, getFirestore } = await import("@/lib/firebase/admin");
    initializeFirebaseAdmin();
    const db = getFirestore();
    
    const coverDoc = await db.collection("bookCovers").doc(bookId).get();
    
    if (!coverDoc.exists) {
      return NextResponse.json({ coverUrl: null }, { status: 200 });
    }
    
    const data = coverDoc.data();
    return NextResponse.json({ coverUrl: data?.coverUrl || null }, { status: 200 });
  } catch (error) {
    console.error("Error fetching custom cover:", error);
    return NextResponse.json({ coverUrl: null }, { status: 200 });
  }
}

/**
 * POST: Upload a new custom cover
 */
export async function POST(request: NextRequest) {
  console.log("=== Custom Cover Upload Started ===");
  
  try {
    // Step 1: Check authentication
    console.log("Step 1: Checking authentication...");
    const sessionCookie = cookies().get("session")?.value;
    if (!sessionCookie) {
      console.log("No session cookie found");
      return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });
    }
    console.log("Session cookie found");

    // Step 2: Initialize Firebase Admin
    console.log("Step 2: Initializing Firebase Admin...");
    const { initializeFirebaseAdmin, getStorage, getFirestore } = await import("@/lib/firebase/admin");
    const admin = await import("firebase-admin");
    initializeFirebaseAdmin();
    console.log("Firebase Admin initialized");

    // Step 3: Verify session
    console.log("Step 3: Verifying session...");
    let userId: string;
    try {
      const decodedClaims = await admin.default.auth().verifySessionCookie(sessionCookie);
      userId = decodedClaims.uid;
      console.log("Session verified for user:", userId);
    } catch (authError) {
      console.error("Session verification failed:", authError);
      return NextResponse.json({ error: "Invalid session - Please sign in again" }, { status: 401 });
    }

    // Step 4: Parse form data
    console.log("Step 4: Parsing form data...");
    const formData = await request.formData();
    const bookId = formData.get("bookId") as string;
    const file = formData.get("cover") as File;

    if (!bookId) {
      console.log("Missing bookId");
      return NextResponse.json({ error: "bookId required" }, { status: 400 });
    }
    if (!file) {
      console.log("Missing cover file");
      return NextResponse.json({ error: "Cover file required" }, { status: 400 });
    }
    console.log(`Got file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Step 5: Validate file
    console.log("Step 5: Validating file...");
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 5MB" }, { status: 400 });
    }
    console.log("File validation passed");

    // Step 6: Upload to Firebase Storage
    console.log("Step 6: Uploading to Firebase Storage...");
    const storage = getStorage();
    const bucket = storage.bucket();
    console.log("Storage bucket:", bucket.name);
    
    const fileName = `bookCovers/${bookId}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`Buffer created, size: ${fileBuffer.length} bytes`);
    
    const fileRef = bucket.file(fileName);
    await fileRef.save(fileBuffer, {
      metadata: {
        contentType: file.type,
      },
    });
    console.log("File saved to storage");

    // Step 7: Make file public
    console.log("Step 7: Making file public...");
    await fileRef.makePublic();
    console.log("File made public");
    
    // Step 8: Get public URL
    const coverUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    console.log("Cover URL:", coverUrl);

    // Step 9: Save metadata to Firestore
    console.log("Step 9: Saving metadata to Firestore...");
    const db = getFirestore();
    await db.collection("bookCovers").doc(bookId).set({
      bookId,
      coverUrl,
      uploadedBy: userId,
      uploadedAt: admin.default.firestore.FieldValue.serverTimestamp(),
    });
    console.log("Metadata saved");

    console.log("=== Custom Cover Upload Complete ===");
    return NextResponse.json({ coverUrl }, { status: 200 });
  } catch (error) {
    console.error("=== Custom Cover Upload Failed ===");
    console.error("Error details:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to upload cover: ${errorMessage}` }, { status: 500 });
  }
}

/**
 * DELETE: Remove a custom cover (owner only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { initializeFirebaseAdmin, getStorage, getFirestore } = await import("@/lib/firebase/admin");
    const admin = await import("firebase-admin");
    
    initializeFirebaseAdmin();
    
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

    if (!bookId) {
      return NextResponse.json({ error: "bookId required" }, { status: 400 });
    }

    const sessionCookie = cookies().get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId: string;
    try {
      const decodedClaims = await admin.default.auth().verifySessionCookie(sessionCookie);
      userId = decodedClaims.uid;
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const db = getFirestore();
    const coverDoc = await db.collection("bookCovers").doc(bookId).get();
    
    if (!coverDoc.exists) {
      return NextResponse.json({ error: "Cover not found" }, { status: 404 });
    }

    const data = coverDoc.data();
    if (data?.uploadedBy !== userId) {
      return NextResponse.json({ error: "Not authorized to delete this cover" }, { status: 403 });
    }

    const storage = getStorage();
    const bucket = storage.bucket();
    await bucket.file(`bookCovers/${bookId}`).delete().catch(() => {});

    await db.collection("bookCovers").doc(bookId).delete();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting cover:", error);
    return NextResponse.json({ error: "Failed to delete cover" }, { status: 500 });
  }
}
