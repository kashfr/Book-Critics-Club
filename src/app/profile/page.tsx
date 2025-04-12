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
import { Separator } from "@/components/ui/separator";

// Define form schema with Zod
const formSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email("Please enter a valid email address"),
  address: z.string(),
  telephone: z.string(),
  bio: z.string(),
  socialMedia: z.array(
    z.object({
      platform: z.string(),
      url: z.string(),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

interface SocialMedia {
  platform: string;
  url: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<FormValues | null>(null);

  // Initialize form with either loaded profile data or empty defaults
  // This will prevent displaying "User" and "user@example.com" as defaults
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: profileData || {
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
        console.log("No user logged in, using default profile data");
        setLoading(false);
        return;
      }

      try {
        console.log("Loading profile for user:", user.uid);
        const idToken = await getCurrentUserIdToken();

        if (!idToken) {
          console.warn("No auth token available to load profile");
          setLoading(false);
          return;
        }

        // Log the request we're about to make
        console.log(
          "Fetching profile from API with token:",
          idToken.substring(0, 10) + "..."
        );

        const response = await fetch("/api/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        console.log("API response status:", response.status);

        if (!response.ok) {
          if (response.status === 404) {
            console.log("Profile not found, using user info if available");
            // Use Firebase user data instead of hardcoded defaults
            const userData = {
              username: user.displayName || "",
              firstName: "",
              lastName: "",
              email: user.email || "",
              address: "",
              telephone: "",
              bio: "",
              socialMedia: [{ platform: "", url: "" }],
            };
            setProfileData(userData);
            form.reset(userData);
          } else {
            console.error("Failed to load profile:", response.status);
            const errorText = await response.text();
            console.error("Error response:", errorText);
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log("Loaded profile data:", data);

        // Check if profile data contains expected fields
        console.log("Profile has username?", Boolean(data.username));
        console.log("Profile has email?", Boolean(data.email));

        // Update form without falling back to hardcoded defaults
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

  // Handle form submission with more verbose logging
  async function onSubmit(data: FormValues) {
    console.log("Submitting profile data:", data);

    try {
      // Get the Firebase ID token for authorization
      const idToken = await getCurrentUserIdToken();

      if (!idToken) {
        alert("Authentication error. Please sign in again.");
        return;
      }

      console.log(
        "Submitting to API with token:",
        idToken.substring(0, 10) + "..."
      );

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify(data),
      });

      console.log("Save response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      const savedData = await response.json();
      console.log("Profile saved successfully, response:", savedData);

      // Dispatch a custom event to notify other components that the profile has changed
      const profileChangedEvent = new CustomEvent("profileChanged", {
        detail: { updatedUserData: data },
      });
      window.dispatchEvent(profileChangedEvent);

      alert("Profile updated successfully!");
      router.back(); // Navigate back after success
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(
        "Error saving profile: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  }

  // Get the user's ID token
  async function getCurrentUserIdToken(): Promise<string | null> {
    try {
      const firebaseAuth = getAuth(app);
      const currentUser = firebaseAuth.currentUser;

      if (currentUser) {
        console.log("Getting ID token for user:", currentUser.uid);
        const token = await currentUser.getIdToken(true);
        console.log("Successfully retrieved ID token.");
        return token;
      } else {
        console.warn("No current user found to get ID token.");
        return null;
      }
    } catch (error) {
      console.error("Error getting Firebase ID token:", error);
      return null;
    }
  }

  // Handle closing the profile page
  function handleClose() {
    router.back();
  }

  // Add a new social media field
  function addSocialMedia() {
    const currentSocialMedia = form.getValues("socialMedia");
    form.setValue("socialMedia", [
      ...currentSocialMedia,
      { platform: "", url: "" },
    ]);
  }

  // Remove a social media field
  function removeSocialMedia(index: number) {
    const currentSocialMedia = form.getValues("socialMedia");
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
    <div className="container mx-auto py-10 px-4">
      {/* Header with close button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Profile</h1>
        <button
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>
      </div>

      <Separator className="mb-8" />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 max-w-2xl mx-auto"
          >
            {/* Username and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }: FieldProps<"username">) => (
                  <FormItem>
                    <FormLabel>Username (Display Name)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Username"
                        className="rounded-lg"
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Email"
                        className="rounded-lg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* First & Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }: FieldProps<"firstName">) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="First Name"
                        className="rounded-lg"
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
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Last Name"
                        className="rounded-lg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }: FieldProps<"address">) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Address"
                      className="rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Telephone */}
            <FormField
              control={form.control}
              name="telephone"
              render={({ field }: FieldProps<"telephone">) => (
                <FormItem>
                  <FormLabel>Telephone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="Telephone"
                      className="rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bio/About */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }: FieldProps<"bio">) => (
                <FormItem>
                  <FormLabel>About Me</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about yourself"
                      className="rounded-lg min-h-[8rem]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Social Media */}
            <div>
              <FormLabel className="block mb-2">Social Media</FormLabel>
              <div className="space-y-3">
                {form
                  .watch("socialMedia")
                  .map((item: SocialMedia, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="Platform (e.g., Twitter, LinkedIn)"
                          className="rounded-lg"
                          {...form.register(`socialMedia.${index}.platform`)}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="URL"
                          className="rounded-lg"
                          {...form.register(`socialMedia.${index}.url`)}
                        />
                      </div>
                      {form.watch("socialMedia").length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeSocialMedia(index)}
                          className="px-2 text-red-500 hover:text-red-700 hover:bg-transparent"
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
                  className="mt-4 rounded-lg"
                >
                  Add Social Link
                </Button>
              </div>
            </div>

            <Separator className="my-8" />

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
