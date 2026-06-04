import { useEffect, useRef, useState, useCallback } from "react";

/**
 * AegisHer Voice-Activated SOS Hook
 *
 * Listens for emergency hotwords in English and Hindi using the Web Speech API.
 * When a keyword is detected with sufficient confidence, triggers the SOS callback.
 *
 * Supported keywords:
 *   English: help me, emergency, save me, sos, danger
 *   Hindi:   बचाओ, मदद करो, खतरा, मदद, बचाव
 */

const SAFETY_KEYWORDS_EN = ["help me", "emergency", "save me", "sos", "danger", "help"];
const SAFETY_KEYWORDS_HI = ["बचाओ", "मदद करो", "खतरा", "मदद", "बचाव", "bachao", "madad", "madad karo"];
const ALL_KEYWORDS = [...SAFETY_KEYWORDS_EN, ...SAFETY_KEYWORDS_HI];

// Languages to cycle through for multilingual detection
const LANGUAGES = ["en-US", "hi-IN"];

export function useVoiceSOS(onTrigger, isEnabled = false) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [lastHeard, setLastHeard] = useState("");
  const [currentLang, setCurrentLang] = useState("en-US");
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(isEnabled);
  const langIndexRef = useRef(0);
  const consecutiveMatchRef = useRef(0); // False trigger prevention: require 2 matches in 10s
  const matchTimerRef = useRef(null);

  const startListening = useCallback(() => {
    if (recognitionRef.current) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;

      // Set language based on current cycling index
      const lang = LANGUAGES[langIndexRef.current % LANGUAGES.length];
      rec.lang = lang;
      setCurrentLang(lang);

      rec.onstart = () => {
        setIsListening(true);
        setError(null);
        console.log(`[VoiceSOS] Listening in ${lang} for emergency hotwords...`);
      };

      rec.onresult = (event) => {
        const lastResultIndex = event.results.length - 1;
        const result = event.results[lastResultIndex][0];
        const transcript = result.transcript.trim().toLowerCase();
        const confidence = result.confidence;

        console.log(`[VoiceSOS] Heard: "${transcript}" (Confidence: ${(confidence * 100).toFixed(1)}%, Lang: ${lang})`);
        setLastHeard(transcript);

        // Confidence threshold: require minimum 0.65 confidence
        if (confidence < 0.65) {
          console.log("[VoiceSOS] Below confidence threshold, ignoring.");
          return;
        }

        // Check against all keywords
        const matched = ALL_KEYWORDS.some((word) => transcript.includes(word));

        if (matched) {
          consecutiveMatchRef.current += 1;
          console.warn(`[VoiceSOS] KEYWORD MATCHED: "${transcript}" (match count: ${consecutiveMatchRef.current})`);

          // False trigger prevention: first match starts a 10-second window
          // If a second match occurs within that window, we trigger
          if (consecutiveMatchRef.current === 1) {
            // First match — set a 10 second timer
            if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
            matchTimerRef.current = setTimeout(() => {
              consecutiveMatchRef.current = 0; // Reset if no second match in time
              console.log("[VoiceSOS] Match window expired. Reset count.");
            }, 10000);

            // For high-confidence direct matches (>0.90), trigger immediately
            if (confidence > 0.90) {
              console.warn(`[VoiceSOS] HIGH CONFIDENCE TRIGGER: "${transcript}"`);
              consecutiveMatchRef.current = 0;
              if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
              if (onTrigger) onTrigger();
            }
          } else if (consecutiveMatchRef.current >= 2) {
            // Second match within window — confirmed trigger
            console.warn(`[VoiceSOS] CONFIRMED TRIGGER: "${transcript}" (double-match verified)`);
            consecutiveMatchRef.current = 0;
            if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
            if (onTrigger) onTrigger();
          }
        }
      };

      rec.onerror = (e) => {
        console.error("[VoiceSOS] Recognition error:", e.error);
        if (e.error !== "no-speech" && e.error !== "aborted") {
          setError(e.error);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;

        // Cycle to next language and restart if enabled
        if (shouldRestartRef.current) {
          langIndexRef.current = (langIndexRef.current + 1) % LANGUAGES.length;
          setTimeout(() => {
            startListening();
          }, 800);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("[VoiceSOS] Failed to initialize recognition:", err);
      setError(err.message);
    }
  }, [onTrigger]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    consecutiveMatchRef.current = 0;
    if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Sync state with active triggers
  useEffect(() => {
    shouldRestartRef.current = isEnabled;
    if (isEnabled) {
      langIndexRef.current = 0;
      startListening();
    } else {
      stopListening();
    }

    return () => {
      shouldRestartRef.current = false;
      consecutiveMatchRef.current = 0;
      if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isEnabled, startListening, stopListening]);

  return {
    isListening,
    error,
    lastHeard,
    currentLang,
    startListening,
    stopListening
  };
}
