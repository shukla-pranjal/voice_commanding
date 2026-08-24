import { useRef, useState } from "react";
import { parseVoiceCommandClient } from "../utils/voiceParser.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

function MicButton({ onCommand, onStatus, onTranscript, selectedLanguage = "en-US", currentItems = [] }) {
  const isListeningRef = useRef(false);
  const retryCountRef = useRef(0);
  const heardSpeechRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [notification, setNotification] = useState("");

  const startListening = async () => {
    if (isListeningRef.current) {
      return;
    }

    isListeningRef.current = true;
    setIsListening(true);
    retryCountRef.current = 0;
    heardSpeechRef.current = false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setNotification("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      isListeningRef.current = false;
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLanguage === "hinglish" ? "en-IN" : (selectedLanguage || "en-US");
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      heardSpeechRef.current = true;
      const transcript = event.results[0][0].transcript;
      if (typeof onTranscript === "function") {
        onTranscript(transcript);
      }

      let backendSucceeded = false;
      try {
        const response = await fetch(`${API_BASE_URL}/api/voice-command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: transcript }),
        });

        if (response.ok) {
          const text = await response.text();
          if (text) {
            const data = JSON.parse(text);
            backendSucceeded = true;
            if (typeof onCommand === "function") {
              onCommand(data.items ?? [], data.message || "Voice command processed.");
            }
          }
        }
      } catch (err) {
        console.warn("Backend voice command fetch failed, using client fallback:", err);
      }

      // If backend is not available or failed, use client-side voice parser
      if (!backendSucceeded) {
        const clientResult = parseVoiceCommandClient(transcript, currentItems);
        if (clientResult.error) {
          setNotification(clientResult.error);
        } else if (typeof onCommand === "function") {
          onCommand(clientResult.items, clientResult.message);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("SpeechRecognition error:", event.error);
      if (event.error === "network" && retryCountRef.current < 3) {
        retryCountRef.current += 1;
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch (restartError) {
            console.error("SpeechRecognition restart error:", restartError);
            isListeningRef.current = false;
            setIsListening(false);
          }
        }, 300);
        return;
      }

      isListeningRef.current = false;
      setIsListening(false);
      if (typeof onStatus === "function") {
        onStatus("Voice input could not start. Please try again.", true);
      }
    };

    recognition.onnomatch = () => {
      if (typeof onStatus === "function") {
        onStatus("We could not hear a clear voice. Please speak closer to the microphone and try again.", true);
      }
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setIsListening(false);
      if (!heardSpeechRef.current && typeof onStatus === "function") {
        onStatus("We could not hear you. Please speak and try again.", true);
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Speech recognition start error:", error);
      setNotification("Voice input is already in use. Please try again.");
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`mic-button${isListening ? " is-listening" : ""}`}
        onClick={startListening}
        aria-label={isListening ? "Listening... Speak now" : "Add by voice"}
      >
        <span className="mic-button__icon" aria-hidden="true">
          {isListening ? "●" : "⌁"}
        </span>
        {isListening ? "Listening..." : "Add by voice"}
      </button>
      {notification ? (
        <div className="voice-notification" role="alert">
          <span>{notification}</span>
          <button type="button" onClick={() => setNotification("")} aria-label="Dismiss notification">
            OK
          </button>
        </div>
      ) : null}
    </>
  );
}

export default MicButton;
