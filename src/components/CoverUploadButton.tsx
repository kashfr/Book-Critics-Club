'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { storage, db } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface CoverUploadButtonProps {
  bookId: string;
  onUploadSuccess: (coverUrl: string) => void;
  className?: string;
}

/**
 * Button component for uploading custom book covers
 * Uses client-side Firebase Storage directly
 */
export default function CoverUploadButton({
  bookId,
  onUploadSuccess,
  className = '',
}: CoverUploadButtonProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file');
      setUploadStatus('error');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image must be under 5MB');
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      // Upload to Firebase Storage using client SDK
      const storageRef = ref(storage, `bookCovers/${bookId}`);
      console.log('Uploading to:', `bookCovers/${bookId}`);
      
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
      });
      console.log('Upload complete:', snapshot);

      // Get the download URL
      const coverUrl = await getDownloadURL(storageRef);
      console.log('Download URL:', coverUrl);

      // Save metadata to Firestore
      await setDoc(doc(db, 'bookCovers', bookId), {
        bookId,
        coverUrl,
        uploadedBy: user.uid,
        uploadedAt: serverTimestamp(),
      });
      console.log('Metadata saved to Firestore');

      setUploadStatus('success');
      onUploadSuccess(coverUrl);

      // Reset status after 3 seconds
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : 'Upload failed';
      setErrorMessage(message);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <button
        onClick={handleClick}
        disabled={isUploading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Upload custom cover"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : uploadStatus === 'success' ? (
          <>
            <Check className="w-4 h-4 text-green-500" />
            Uploaded!
          </>
        ) : uploadStatus === 'error' ? (
          <>
            <X className="w-4 h-4 text-red-500" />
            {errorMessage || 'Failed'}
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            Upload Cover
          </>
        )}
      </button>
    </div>
  );
}
