"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/auth-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps, FieldPath } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/context/ToastContext";

import { motion } from "framer-motion";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Define form schema with Zod
const formSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Please enter a valid email address").or(z.literal("")),
  address: z.string().optional(),
  telephone: z.string().optional(),
  bio: z.string().optional(),
  socialMedia: z.array(
    z.object({
      platform: z.string(),
      url: z.string(),
    })
  ).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SocialMedia {
  platform: string;
  url: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<FormValues | null>(null);

  // Initialize form with either loaded profile data or empty defaults
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      telephone: "",
      bio: "",
      socialMedia: [{ platform: "", url: "" }],
    },
  });

  // Load user data when component mounts or user changes
  useEffect(() => {
    async function loadUserProfile() {
      if (!user) {
        console.log("No user logged in");
        setLoading(false);
        return;
      }

      try {
        console.log("Loading profile for user:", user.uid);
        
        // Use client-side Firestore directly
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/client');

        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        let data: any = {};
        
        if (userDoc.exists()) {
          data = userDoc.data();
          console.log("Loaded Firestore profile data:", data);
        } else {
          console.log("No profile found in Firestore, using auth defaults");
        }

        const formData = {
          username: data.username || user.displayName || "",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || user.email || "",
          address: data.address || "",
          telephone: data.telephone || "",
          bio: data.bio || "",
          socialMedia: data.socialMedia?.length
            ? data.socialMedia
            : [{ platform: "", url: "" }],
        };

        console.log("Setting form data:", formData);
        setProfileData(formData);
        form.reset(formData);
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [user, form]);

  // Add saving state
  const [isSaving, setIsSaving] = useState(false);

  // Function to cascade username update across all contributions
  async function cascadeUsernameUpdate(oldUsername: string, newUsername: string, userId: string) {
    if (oldUsername === newUsername || !oldUsername || !newUsername) {
      return 0;
    }

    const { collection, query, where, getDocs, writeBatch, doc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase/client');

    let updatedCount = 0;
    const batch = writeBatch(db);

    // Update bookDetails where user is a contributor
    const bookDetailsRef = collection(db, 'bookDetails');
    const bookQuery = query(bookDetailsRef, where('contributorId', '==', userId));
    const bookSnapshot = await getDocs(bookQuery);

    bookSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.contributorName && data.contributorName.includes(oldUsername)) {
        const newContributorName = data.contributorName.replace(oldUsername, newUsername);
        batch.update(doc(db, 'bookDetails', docSnap.id), {
          contributorName: newContributorName,
        });
        updatedCount++;
      }
    });

    // Update chapterProposals where user is the proposer
    const proposalsRef = collection(db, 'chapterProposals');
    const proposalQuery = query(proposalsRef, where('proposerId', '==', userId));
    const proposalSnapshot = await getDocs(proposalQuery);

    proposalSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.proposerName && data.proposerName.includes(oldUsername)) {
        const newProposerName = data.proposerName.replace(oldUsername, newUsername);
        batch.update(doc(db, 'chapterProposals', docSnap.id), {
          proposerName: newProposerName,
        });
        updatedCount++;
      }
    });

    // Also check bookDetails where user appears in a contributor chain but isn't the primary contributor
    // This handles cases like "testuser1 & OldName" where OldName was added via proposal approval
    const allBooksSnapshot = await getDocs(bookDetailsRef);
    allBooksSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Skip if already processed (user is contributor) or if name doesn't include old username
      if (data.contributorId === userId) return;
      if (data.contributorName && data.contributorName.includes(oldUsername)) {
        const newContributorName = data.contributorName.replace(new RegExp(oldUsername, 'g'), newUsername);
        batch.update(doc(db, 'bookDetails', docSnap.id), {
          contributorName: newContributorName,
        });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`Cascade updated ${updatedCount} documents with new username`);
    }

    return updatedCount;
  }

  // Handle form submission using client-side Firestore
  async function onSubmit(data: FormValues) {
    if (!user) {
      toastError("You must be logged in to save your profile.");
      return;
    }

    console.log("Submitting profile data:", data);
    setIsSaving(true);

    try {
      // Use client-side Firestore directly
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/client');

      // Get the old username before saving
      const oldUsername = profileData?.username || "";
      const newUsername = data.username;

      // Save to user's document
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      console.log("Profile saved successfully to Firestore");

      // Cascade update if username changed
      let cascadeCount = 0;
      if (oldUsername && oldUsername !== newUsername) {
        console.log(`Username changed from "${oldUsername}" to "${newUsername}", cascading updates...`);
        cascadeCount = await cascadeUsernameUpdate(oldUsername, newUsername, user.uid);
      }

      // Update local cache
      const profileWithTimestamp = {
        username: data.username,
        email: data.email,
        updatedAt: Date.now(),
      };
      localStorage.setItem('user_profile_cache', JSON.stringify(profileWithTimestamp));

      // Dispatch event to notify other components
      const profileChangedEvent = new CustomEvent("profileChanged", {
        detail: { updatedUserData: data },
      });
      window.dispatchEvent(profileChangedEvent);

      // Show appropriate success message
      if (cascadeCount > 0) {
        success(`Profile updated! Username changed across ${cascadeCount} contribution(s).`);
      } else {
        success("Profile updated successfully!");
      }
      router.back();
    } catch (err) {
      console.error("Error saving profile:", err);
      toastError(
        "Error saving profile: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setIsSaving(false);
    }
  }

  // Handle closing the profile page
  function handleClose() {
    router.back();
  }

  // Add a new social media field
  function addSocialMedia() {
    const currentSocialMedia = form.getValues("socialMedia") || [];
    form.setValue("socialMedia", [
      ...currentSocialMedia,
      { platform: "", url: "" },
    ]);
  }

  // Remove a social media field
  function removeSocialMedia(index: number) {
    const currentSocialMedia = form.getValues("socialMedia") || [];
    form.setValue(
      "socialMedia",
      currentSocialMedia.filter((_: SocialMedia, i: number) => i !== index)
    );
  }

  // Type for render prop in FormField
  type FieldProps<T extends FieldPath<FormValues>> = {
    field: ControllerRenderProps<FormValues, T>;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-morphism rounded-3xl p-8 md:p-12 border border-white/10"
      >
        {/* Header with close button */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground mb-2">User Profile</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences.</p>
          </div>
          <button
            onClick={handleClose}
            className="p-3 rounded-full glass-morphism hover:bg-white/5 transition-colors border border-white/10"
            aria-label="Close"
          >
            <X size={20} className="text-foreground" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="text-sm font-medium animate-pulse text-muted-foreground">Loading your profile...</p>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8"
            >
              {/* Username and Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }: FieldProps<"username">) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-widest text-primary">Username (Display Name)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your unique handle"
                          className="rounded-xl bg-white/5 border-white/10 text-foreground"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }: FieldProps<"email">) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-widest text-primary">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          disabled
                          placeholder="email@example.com"
                          className="rounded-xl bg-white/5 border-white/10 text-foreground opacity-50 cursor-not-allowed"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-[10px] text-muted-foreground/60 italic">Email is managed via auth provider.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }: FieldProps<"firstName">) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-widest text-primary">First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="First Name"
                          className="rounded-xl bg-white/5 border-white/10 text-foreground"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }: FieldProps<"lastName">) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-widest text-primary">Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Last Name"
                          className="rounded-xl bg-white/5 border-white/10 text-foreground"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Address & Telephone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }: FieldProps<"address">) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-widest text-primary">Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="City, Country"
                          className="rounded-xl bg-white/5 border-white/10 text-foreground"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }: FieldProps<"telephone">) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-widest text-primary">Telephone</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          className="rounded-xl bg-white/5 border-white/10 text-foreground"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Bio/About */}
              <FormField
                control={form.control}
                name="bio"
                render={({ field }: FieldProps<"bio">) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-widest text-primary">About Me</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about yourself and your reading habits..."
                        className="rounded-xl bg-white/5 border-white/10 text-foreground min-h-[8rem] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Social Media */}
              <div className="space-y-4">
                <FormLabel className="text-xs font-semibold uppercase tracking-widest text-primary block">Social Links</FormLabel>
                <div className="space-y-3">
                  {(form.watch("socialMedia") || []).map((item: SocialMedia, index: number) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-1">
                        <Input
                          placeholder="Platform"
                          className="rounded-xl bg-white/5 border-white/10 text-foreground"
                          {...form.register(`socialMedia.${index}.platform`)}
                        />
                      </div>
                      <div className="flex-[2]">
                        <Input
                          placeholder="URL"
                          className="rounded-xl bg-white/5 border-white/10 text-foreground"
                          {...form.register(`socialMedia.${index}.url`)}
                        />
                      </div>
                      {(form.watch("socialMedia") || []).length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeSocialMedia(index)}
                          className="p-3 text-destructive hover:bg-destructive/10 rounded-full"
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSocialMedia}
                    className="w-full py-4 border-dashed border-white/10 hover:bg-white/5 text-muted-foreground rounded-xl"
                  >
                    + Add Another Social Link
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  className="px-8 py-6 rounded-full text-muted-foreground hover:bg-white/5 transition-all order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="px-10 py-6 bg-primary text-primary-foreground rounded-full font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all order-1 sm:order-2 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </motion.div>
    </div>
  );
}
