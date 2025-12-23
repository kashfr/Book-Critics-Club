'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { db } from '@/lib/firebase/client';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { BookmarkPlus, Check, Loader2 } from 'lucide-react';
import { Book } from '@/types/books';
import { motion, AnimatePresence } from 'framer-motion';

interface SaveBookButtonProps {
  book: Book;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  showText?: boolean;
}

export default function SaveBookButton({
  book,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className = '',
  showText = true,
}: SaveBookButtonProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!user) {
        setIsLoadingStatus(false);
        return;
      }

      try {
        const bookDocRef = doc(db, 'users', user.uid, 'savedBooks', book.id);
        const bookDoc = await getDoc(bookDocRef);
        setIsSaved(bookDoc.exists());
      } catch (error) {
        console.error('Error checking saved status:', error);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    checkSavedStatus();
  }, [book.id, user]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert('Please sign in to save books to your library.');
      return;
    }

    setIsSaving(true);
    try {
      const bookDocRef = doc(db, 'users', user.uid, 'savedBooks', book.id);
      
      if (isSaved) {
        await deleteDoc(bookDocRef);
        setIsSaved(false);
      } else {
        await setDoc(bookDocRef, {
          bookId: book.id,
          title: book.volumeInfo.title,
          authors: book.volumeInfo.authors || [],
          thumbnail: book.volumeInfo.imageLinks?.thumbnail || null,
          savedAt: new Date().toISOString(),
        });
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error saving/removing book:', error);
    } finally {
      setIsSaving(false);
    }
  };



  const baseStyles = `inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${fullWidth ? 'w-full' : ''}`;
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2 text-sm rounded-xl",
    lg: "px-6 py-4 text-base rounded-2xl",
  };

  const variants = {
    default: "bg-primary text-primary-foreground font-bold hover:opacity-90",
    outline: "bg-white/5 text-foreground border border-white/10 hover:bg-white/10",
    ghost: "p-2 text-muted-foreground hover:text-foreground",
  };

  const savedStyles = isSaved 
    ? "bg-green-500/20 text-green-400 border border-green-500/30" 
    : "";

  return (
    <button
      onClick={handleSave}
      disabled={isSaving || isLoadingStatus}
      className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${savedStyles} ${className}`}
      title={isSaved ? "Remove from Library" : "Save to Library"}
    >
      <AnimatePresence mode="wait">
        {isSaving ? (
          <motion.div
            key="saving"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Loader2 className="w-4 h-4 animate-spin" />
          </motion.div>
        ) : isSaved ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {showText && <span className="text-xs">Saved</span>}
          </motion.div>
        ) : (
          <motion.div
            key="save"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <BookmarkPlus className="w-4 h-4" />
            {showText && <span className="text-xs">Save Book</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
