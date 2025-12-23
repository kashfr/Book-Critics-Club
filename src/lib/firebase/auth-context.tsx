"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth as firebaseAuth, db as firebaseDb } from "./client";

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, username: string) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  signInWithGoogle: () => Promise<User>;
  signInWithGithub: () => Promise<User>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  error: null,
  signIn: async () => {
    throw new Error("Not implemented");
  },
  signUp: async () => {
    throw new Error("Not implemented");
  },
  signOut: async () => {
    throw new Error("Not implemented");
  },
  resetPassword: async () => {
    throw new Error("Not implemented");
  },
  updateUserProfile: async () => {
    throw new Error("Not implemented");
  },
  signInWithGoogle: async () => {
    throw new Error("Not implemented");
  },
  signInWithGithub: async () => {
    throw new Error("Not implemented");
  },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<User> => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(
        firebaseAuth,
        email,
        password
      );
      setUser(userCredential.user);
      return userCredential.user;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred during sign in";
      setError(errorMessage);
      throw err;
    }
  };

  const signInWithGoogle = async (): Promise<User> => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(firebaseAuth, provider);

      // Check if the user already exists in Firestore
      const userDocRef = doc(firebaseDb, "users", userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      // If the user doesn't exist in Firestore, create a document
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          username: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          provider: "google",
        });
      }

      setUser(userCredential.user);
      return userCredential.user;
    } catch (err) {
      let errorMessage = "An error occurred during Google sign in";
      
      if (err instanceof Error) {
        if (err.message.includes('account-exists-with-different-credential')) {
          errorMessage = "This email is already registered with a different sign-in method. Please sign in using your original method (email/password or GitHub).";
        } else if (err.message.includes('popup-closed-by-user')) {
          errorMessage = "Sign-in was cancelled. Please try again.";
        } else if (err.message.includes('popup-blocked')) {
          errorMessage = "Pop-up was blocked by your browser. Please allow pop-ups and try again.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const signInWithGithub = async (): Promise<User> => {
    try {
      setError(null);
      console.log('Starting GitHub sign-in...');
      const provider = new GithubAuthProvider();
      const userCredential = await signInWithPopup(firebaseAuth, provider);
      console.log('GitHub OAuth successful, user:', userCredential.user.uid);

      // Check if the user already exists in Firestore
      const userDocRef = doc(firebaseDb, "users", userCredential.user.uid);
      console.log('Checking if user exists in Firestore...');
      const userDoc = await getDoc(userDocRef);
      console.log('User exists:', userDoc.exists());

      // If the user doesn't exist in Firestore, create a document
      if (!userDoc.exists()) {
        console.log('Creating new user document...');
        await setDoc(userDocRef, {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          username: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          provider: "github",
        });
        console.log('User document created successfully');
      }

      setUser(userCredential.user);
      console.log('GitHub sign-in complete!');
      return userCredential.user;
    } catch (err) {
      console.error('GitHub sign-in error:', err);
      let errorMessage = "An error occurred during GitHub sign in";
      
      if (err instanceof Error) {
        // Handle specific Firebase auth errors
        if (err.message.includes('account-exists-with-different-credential')) {
          errorMessage = "This email is already registered with a different sign-in method. Please sign in using your original method (email/password or Google).";
        } else if (err.message.includes('popup-closed-by-user')) {
          errorMessage = "Sign-in was cancelled. Please try again.";
        } else if (err.message.includes('popup-blocked')) {
          errorMessage = "Pop-up was blocked by your browser. Please allow pop-ups and try again.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string
  ): Promise<User> => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuth,
        email,
        password
      );

      // Update profile with username
      await updateProfile(userCredential.user, {
        displayName: username,
      });

      // Create user document in Firestore
      await setDoc(doc(firebaseDb, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setUser(userCredential.user);
      return userCredential.user;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred during sign up";
      setError(errorMessage);
      throw err;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(firebaseAuth);
      setUser(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred during sign out";
      setError(errorMessage);
      throw err;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      setError(null);
      await sendPasswordResetEmail(firebaseAuth, email);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred during password reset";
      setError(errorMessage);
      throw err;
    }
  };

  const updateUserProfile = async (
    displayName: string,
    photoURL?: string
  ): Promise<void> => {
    try {
      if (!user) {
        throw new Error("No user is signed in");
      }

      const updateData: { displayName: string; photoURL?: string } = {
        displayName,
      };
      if (photoURL) {
        updateData.photoURL = photoURL;
      }

      await updateProfile(user, updateData);

      // Update Firestore user document
      const userDocRef = doc(firebaseDb, "users", user.uid);
      await updateDoc(userDocRef, {
        username: displayName,
        ...(photoURL && { photoURL }),
        updatedAt: new Date().toISOString(),
      });

      // Force refresh the user
      setUser({ ...user });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred during profile update";
      setError(errorMessage);
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateUserProfile,
    signInWithGoogle,
    signInWithGithub,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
