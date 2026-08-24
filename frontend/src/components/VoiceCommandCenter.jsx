import { useState, useRef, useEffect } from "react";
import { LANGUAGES, LANGUAGE_PROMPTS } from "../utils/languages.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

function VoiceCommandCenter({
  onCommandResult,
  selectedLanguage,
  onLanguageChange,
}) {
  const [voiceState, setVoiceState] = useState("ready"); // "ready" | "listening" | "processing" | "success" | "error"
  const [transcript, setTranscript] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const feedbackTimerRef = useRef(null);

  const activePrompts = LANGUAGE_PROMPTS[selectedLanguage] || LANGUAGE_PROMPTS["en-US"];

  // Cycle prompt hints automatically
  useEffect(() => {
    const timer = setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % activePrompts.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [activePrompts.length]);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const executeCommand = async (commandText) => {
    setVoiceState("processing");
    setTranscript(commandText);

    try {
      const response = await fetch(`${API_BASE_URL}/api/voice-command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commandText }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Voice command could not be processed");
      }

      setVoiceState("success");
      setFeedbackMessage(data.message || "Action completed successfully!");
      if (typeof onCommandResult === "function") {
        onCommandResult(data.items ?? [], data.message);
      }

      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setVoiceState("ready");
      }, 5000);
    } catch (err) {
      setVoiceState("error");
      setFeedbackMessage(err.message || "Sorry, I couldn't understand that. Please try again.");

      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setVoiceState("ready");
      }, 6000);
    }
  };

  const startListening = () => {
    if (isListeningRef.current) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      isListeningRef.current = false;
      setVoiceState("ready");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceState("error");
      setFeedbackMessage("Speech recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or enter items manually below.");
      setShowHelpModal(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Select speech language
      const langConfig = LANGUAGES.find((l) => l.code === selectedLanguage);
      recognition.lang = langConfig?.speechCode || langConfig?.code || "en-US";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      isListeningRef.current = true;
      setVoiceState("listening");
      setTranscript("");
      setFeedbackMessage("");

      recognition.onresult = (event) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        if (event.results[0].isFinal) {
          isListeningRef.current = false;
          executeCommand(currentTranscript);
        }
      };

      recognition.onerror = (event) => {
        isListeningRef.current = false;
        console.warn("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          setVoiceState("error");
          setFeedbackMessage("We didn't hear anything. Please tap and speak closer to the microphone.");
        } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setVoiceState("error");
          setFeedbackMessage("Microphone permission denied. Please allow microphone access in your browser settings.");
          setShowHelpModal(true);
        } else {
          setVoiceState("error");
          setFeedbackMessage(`Voice error (${event.error}). Please try speaking again.`);
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        if (voiceState === "listening") {
          setVoiceState("ready");
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      isListeningRef.current = false;
      setVoiceState("error");
      setFeedbackMessage("Microphone could not be started. Please try again.");
    }
  };

  const handleChipClick = (promptText) => {
    executeCommand(promptText);
  };

  return (
    <section className="voice-hero-card" aria-label="Voice Command Assistant">
      <div className="voice-hero__topbar">
        <div className="voice-badge">
          <span className="live-dot" />
          <span>Smart Voice Assistant</span>
        </div>

        <div className="language-selector-wrapper">
          <label htmlFor="voice-language-select" className="lang-label">Language:</label>
          <select
            id="voice-language-select"
            className="language-select"
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            aria-label="Select voice command language"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="voice-hero__main">
        {/* Large Central Mic Button */}
        <div className="voice-mic-container">
          <button
            type="button"
            className={`voice-hero-mic-btn voice-hero-mic-btn--${voiceState}`}
            onClick={startListening}
            aria-label={
              voiceState === "listening"
                ? "Listening... Tap to cancel"
                : "Tap to speak a voice command"
            }
          >
            <div className="mic-pulse-ring" />
            <div className="mic-pulse-ring-outer" />
            <span className="mic-svg-icon" aria-hidden="true">
              {voiceState === "listening" ? (
                <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              ) : voiceState === "processing" ? (
                <svg className="spin" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              )}
            </span>
          </button>

          {/* Animated sound wave bars when listening */}
          {voiceState === "listening" && (
            <div className="sound-wave-bars" aria-label="Listening audio waveform">
              <span className="bar bar-1" />
              <span className="bar bar-2" />
              <span className="bar bar-3" />
              <span className="bar bar-4" />
              <span className="bar bar-5" />
              <span className="bar bar-4" />
              <span className="bar bar-2" />
            </div>
          )}
        </div>

        {/* Status Callout & Live Feedback */}
        <div className="voice-status-box">
          <div className={`voice-state-title voice-state-title--${voiceState}`}>
            {voiceState === "ready" && "Tap to Speak"}
            {voiceState === "listening" && "Listening... Speak naturally"}
            {voiceState === "processing" && "Understanding your request..."}
            {voiceState === "success" && "✓ Command Processed"}
            {voiceState === "error" && "Needs Attention"}
          </div>

          {/* Live Transcript / Feedback Message */}
          {transcript && (
            <div className="voice-transcript-bubble">
              <span className="transcript-tag">Heard:</span> “{transcript}”
            </div>
          )}

          {feedbackMessage && (
            <div className={`voice-feedback-message feedback-${voiceState}`}>
              {feedbackMessage}
            </div>
          )}

          {/* Rotating Try Saying Hint */}
          <div className="voice-prompt-hint">
            <span className="prompt-label">Try saying:</span>
            <button
              type="button"
              className="prompt-chip"
              onClick={() => handleChipClick(activePrompts[promptIndex])}
              title="Click to test this command"
            >
              “{activePrompts[promptIndex]}”
            </button>
          </div>
        </div>
      </div>

      {/* Quick Clickable Suggestions for Selected Language */}
      <div className="voice-hero__chips">
        <span className="chips-title">Quick commands:</span>
        <div className="chips-list">
          {activePrompts.slice(0, 4).map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="quick-voice-chip"
              onClick={() => handleChipClick(prompt)}
            >
              <span className="chip-icon">🎤</span>
              <span>{prompt}</span>
            </button>
          ))}
          <button
            type="button"
            className="quick-voice-chip quick-voice-chip--help"
            onClick={() => setShowHelpModal(true)}
          >
            ℹ How to use
          </button>
        </div>
      </div>

      {/* Voice Help & Troubleshooting Modal */}
      {showHelpModal && (
        <div className="modal-backdrop" onClick={() => setShowHelpModal(false)}>
          <div className="modal-card voice-help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎤 Voice Assistant Help & Guide</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowHelpModal(false)}
                aria-label="Close help modal"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Our assistant supports natural commands in <b>English</b>, <b>हिन्दी (Hindi)</b>, and <b>Hinglish</b> with automatic quantity and unit recognition.
              </p>

              <h4>Supported Command Formats</h4>
              <div className="voice-guide-grid">
                <div className="guide-card">
                  <strong>Add Products with Units</strong>
                  <p>“Add 2 litres of milk”</p>
                  <p>“Add 3 packets of biscuits”</p>
                  <p>“2 packet Maggi aur 1 bottle sauce add karo”</p>
                  <p>“मेरी लिस्ट में 2 किलो आलू जोड़ो”</p>
                </div>

                <div className="guide-card">
                  <strong>Adjust Quantities</strong>
                  <p>“Change apples to 5”</p>
                  <p>“Increase milk by 2”</p>
                  <p>“Reduce bread by 1”</p>
                </div>

                <div className="guide-card">
                  <strong>Manage & Complete</strong>
                  <p>“Mark milk as done” / “दूध खरीद लिया”</p>
                  <p>“Remove bread” / “ब्रेड हटाओ”</p>
                  <p>“Undo” / “वापस लो”</p>
                </div>
              </div>

              <h4>Microphone Permission Troubleshooting</h4>
              <ul className="help-steps">
                <li>Check that your browser has microphone permission enabled (Click the lock/tune icon in the address bar).</li>
                <li>Best experienced on Google Chrome or Microsoft Edge.</li>
                <li>You can also click any of the command chips or enter items manually in the form below.</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="primary-button"
                onClick={() => setShowHelpModal(false)}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default VoiceCommandCenter;
