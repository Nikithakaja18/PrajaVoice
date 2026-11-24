/**
 * Palle Praja - Voice First Recognition & Speech Synthesis Module
 * Supports Telugu (te-IN) and Indian English (en-IN) with live waveforms and simulation fallbacks
 */

class VoiceManager {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.supported = false;
    this.currentLanguage = 'te-IN'; // default to Telugu for rural villagers
    this.transcriptCallback = null;
    this.statusCallback = null;

    this.initRecognition();
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.supported = true;
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
          this.isListening = true;
          if (this.statusCallback) this.statusCallback('listening');
        };

        this.recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const currentText = finalTranscript || interimTranscript;
          if (this.transcriptCallback && currentText) {
            this.transcriptCallback(currentText, Boolean(finalTranscript));
          }
        };

        this.recognition.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
          this.isListening = false;
          if (this.statusCallback) this.statusCallback('error', event.error);
        };

        this.recognition.onend = () => {
          this.isListening = false;
          if (this.statusCallback) this.statusCallback('idle');
        };
      } catch (e) {
        console.warn('SpeechRecognition initialization failed:', e);
        this.supported = false;
      }
    } else {
      this.supported = false;
    }
  }

  setLanguage(langCode) {
    // 'te' -> 'te-IN', 'en' -> 'en-IN'
    if (langCode === 'te') {
      this.currentLanguage = 'te-IN';
    } else {
      this.currentLanguage = 'en-IN';
    }
    if (this.recognition) {
      this.recognition.lang = this.currentLanguage;
    }
  }

  startListening(onTranscript, onStatusChange) {
    this.transcriptCallback = onTranscript;
    this.statusCallback = onStatusChange;

    if (!this.supported || !this.recognition) {
      if (this.statusCallback) {
        this.statusCallback('unsupported');
      }
      return false;
    }

    try {
      this.recognition.lang = this.currentLanguage;
      this.recognition.start();
      return true;
    } catch (e) {
      console.warn('Error starting speech recognition:', e);
      if (this.statusCallback) this.statusCallback('error', e.message);
      return false;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListening = false;
    if (this.statusCallback) this.statusCallback('idle');
  }

  toggleListening(onTranscript, onStatusChange) {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening(onTranscript, onStatusChange);
    }
  }

  // Text to Speech playback (optional spoken confirmation)
  speakConfirmation(text, lang = 'te') {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'te' ? 'te-IN' : 'en-IN';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }
}

// Global Voice singleton
window.voiceManager = new VoiceManager();
