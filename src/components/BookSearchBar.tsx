"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import eventEmitter from "@/utils/events";
import { Search, Mic } from "lucide-react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import "@/styles/glowEffect.css"; // Import the CSS file with the glow animation

interface BookSearchBarProps {
  position: "center" | "header";
}

export default function BookSearchBar({
  position,
}: BookSearchBarProps): JSX.Element {
  const [query, setQuery] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const router = useRouter();
  const wasListeningRef = useRef(false);
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Log browser support
  useEffect(() => {
    // console.log(
    //   "Browser supports speech recognition:",
    //   browserSupportsSpeechRecognition
    // );
  }, [browserSupportsSpeechRecognition]);

  // Update query when transcript changes during voice input
  useEffect(() => {
    // Only update query with transcript if we're actively listening
    if (transcript && listening) {
      setQuery(transcript);
    }
  }, [transcript, listening]);

  const handleSearch = useCallback(
    async (e?: React.FormEvent<HTMLFormElement>): Promise<void> => {
      if (e) e.preventDefault();
      const searchQuery = query.trim();
      if (searchQuery) {
        await router.push(`/?q=${encodeURIComponent(searchQuery)}&page=1`);
        resetTranscript();
        if (position === "center") {
          setQuery("");
        }
      }
    },
    [query, router, resetTranscript, position]
  );

  // Trigger search when listening stops naturally
  useEffect(() => {
    if (wasListeningRef.current && !listening && transcript.trim()) {
      const timerId = setTimeout(() => {
        handleSearch();
      }, 1500);
      return () => clearTimeout(timerId);
    }
    wasListeningRef.current = listening;
  }, [listening, transcript, handleSearch]);

  // Handle Escape key press to stop listening
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Check if Escape key is pressed and we are currently listening
      if (event.key === "Escape" && listening) {
        // console.log("Escape key pressed, stopping listening.");
        SpeechRecognition.stopListening();
      }
    }

    // Add event listener when component mounts
    document.addEventListener("keydown", handleKeyDown);

    // Clean up event listener when component unmounts or listening state changes
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [listening]);

  const handleVoiceSearch = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      // Don't clear existing query when starting voice search
      // This allows users to start with typed text and continue with voice
      SpeechRecognition.startListening({
        continuous: false,
        interimResults: true,
      });
    }
  };

  useEffect(() => {
    const unsubscribe = eventEmitter.subscribe("resetSearch", () => {
      setQuery("");
      resetTranscript();
    });

    return () => unsubscribe();
  }, [resetTranscript]);

  const containerClasses =
    position === "center" 
      ? "w-full max-w-xl mx-auto px-4" 
      : "w-full sm:max-w-xs md:max-w-md lg:max-w-xl";

  // Determine if we're in header position for smaller mobile sizing
  const isHeader = position === "header";

  // Using the new approach that works flawlessly
  return (
    <form onSubmit={handleSearch} className={containerClasses}>
      <div
        className={`relative flex items-center w-full ${
          listening ? "listening" : ""
        } transition-all duration-200`}
        style={{
          backgroundColor: isHeader ? "rgba(255, 255, 255, 0.1)" : "#fff",
          border: `1px solid ${listening ? "#f87171" : isHeader ? "rgba(255, 255, 255, 0.2)" : "#dfe1e5"}`,
          borderRadius: "9999px", // Fully rounded pill shape
          boxShadow: listening
            ? "0 0 15px rgba(239,68,68,0.5)"
            : isFocused || isHovered
            ? "0 2px 8px rgba(32, 33, 36, 0.3)"
            : "0 1px 4px rgba(32, 33, 36, 0.2)",
          height: isHeader ? "40px" : "46px",
          padding: isHeader ? "0 12px" : "0 20px",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
      >
        {/* Search Icon */}
        <Search
          className="search-icon"
          size={20}
          strokeWidth={2.5}
          aria-hidden="true"
          style={{
            color: "#9aa0a6",
            marginRight: "13px",
            flexShrink: 0,
            pointerEvents: "none",
          }}
        />

        {/* Input Field */}
        <input
          type="text"
          className="search-input"
          placeholder="Type or use the mic..."
          value={query}
          onChange={(e) => {
            // console.log("Input onChange triggered");
            setQuery(e.target.value);
            if (listening) {
              SpeechRecognition.stopListening();
              resetTranscript();
            }
          }}
          onClick={() => {
            /* console.log("Input onClick triggered") */
          }}
          onFocus={() => {
            setIsFocused(true);
            // console.log("Input onFocus triggered");
          }}
          onBlur={() => {
            setIsFocused(false);
            // console.log("Input onBlur triggered");
          }}
          aria-label="Search"
          style={{
            flexGrow: 1,
            border: "none",
            outline: "none",
            fontSize: "16px",
            backgroundColor: "transparent",
            height: "100%",
            padding: 0,
            color: isHeader ? "#ffffff" : "#202124",
            lineHeight: "46px",
            filter: "none",
          }}
        />

        {/* Mic Button */}
        {browserSupportsSpeechRecognition && (
          <Mic
            className={`mic-icon ${listening ? "mic-active-glow" : ""}`}
            size={28}
            strokeWidth={1.8}
            onClick={(e) => {
              e.stopPropagation();
              // console.log("Mic button onClick triggered");
              handleVoiceSearch();
            }}
            aria-label={listening ? "Stop listening" : "Search by voice"}
            role="button"
            tabIndex={0}
            style={{
              color: listening ? "#f87171" : "#4285F4",
              marginLeft: "13px",
              cursor: "pointer",
              flexShrink: 0,
              transition: "color 0.2s ease",
              padding: "4px",
              borderRadius: "50%",
              zIndex: 2,
            }}
          />
        )}
      </div>
    </form>
  );
}
