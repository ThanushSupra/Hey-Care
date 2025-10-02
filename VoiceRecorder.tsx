// VoiceRecorder component wraps the Web Speech API to provide a
// start/pause/resume/stop recording experience with live transcription.
// It streams interim results to the UI and emits a final transcript when stopped.
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, Square, Pause, Play, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Type declarations for Web Speech API
// Augment the Window interface so TS recognizes browser-specific Webkit API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Props allow parent components to receive the evolving transcript,
// the final transcript, and optionally trigger AI analysis during pauses.
interface VoiceRecorderProps {
  onTranscriptUpdate: (transcript: string) => void;
  onRecordingComplete: (finalTranscript: string) => void;
  onTranscriptAnalysis?: (transcript: string) => Promise<any>;
}

// Internal state machine to manage UI and Web Speech lifecycle
type RecordingState = 'idle' | 'recording' | 'paused';

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscriptUpdate,
  onRecordingComplete,
  onTranscriptAnalysis,
}) => {
  // Recording state drives button enablement and labels
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  // Combined interim + final transcript for display
  const [transcript, setTranscript] = useState('');
  // Human-readable error shown above controls
  const [error, setError] = useState<string>('');
  // Whether the current browser supports SpeechRecognition
  const [isSupported, setIsSupported] = useState(true);
  // Ref to the active speech recognition instance
  const recognitionRef = useRef<any>(null);
  // Accumulates all final chunks; we build the output from this + interim text
  const fullTranscriptRef = useRef('');

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access and try again.');
      return false;
    }
  };

  // Initialize and start speech recognition
  const startRecording = async (isResume = false) => {
    setError('');
    
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.');
      return;
    }

    // Request microphone permission
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setError('');
    };

    // Handle new recognition results; separate interim and final chunks
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = fullTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcriptText + ' ';
        } else {
          interimTranscript += transcriptText;
        }
      }

      // Persist the concatenated final transcript and combine with interim
      fullTranscriptRef.current = finalTranscript;
      const currentTranscript = (finalTranscript + interimTranscript).trim();
      
      setTranscript(currentTranscript);
      onTranscriptUpdate(currentTranscript);
    };

    // Surface user-friendly error messages for common failure modes
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      let errorMessage = 'An error occurred during speech recognition.';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking clearly.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your microphone.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow access and try again.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
      }
      
      setError(errorMessage);
      setRecordingState('idle');
    };

    // When the engine stops (often after a period of silence),
    // restart while in 'recording' to simulate continuous capture.
    recognition.onend = () => {
      console.log('Speech recognition ended');
      if (recordingState === 'recording') {
        // Restart if we're still supposed to be recording
        setTimeout(() => {
          if (recognitionRef.current && recordingState === 'recording') {
            try {
              recognitionRef.current.start();
            } catch (err) {
              console.error('Error restarting recognition:', err);
            }
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
      setRecordingState('recording');
      
      // Only reset transcript when starting fresh (not resuming)
      if (!isResume) {
        setTranscript('');
        fullTranscriptRef.current = '';
      }
    } catch (err) {
      console.error('Error starting recognition:', err);
      setError('Failed to start recording. Please try again.');
    }
  };

  const stopRecording = () => {
    // Stop recognition, emit the final accumulated transcript, and reset state
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecordingState('idle');
    onRecordingComplete(fullTranscriptRef.current.trim());
  };

  const pauseRecording = async () => {
    // Pause by stopping recognition; optionally analyze the partial transcript
    if (recordingState === 'recording') {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setRecordingState('paused');
      
      // Analyze the current transcript segment when pausing
      const currentTranscript = fullTranscriptRef.current.trim();
      if (currentTranscript && onTranscriptAnalysis) {
        try {
          const analysisResult = await onTranscriptAnalysis(currentTranscript);
          if (analysisResult?.formattedTranscript) {
            // Update the stored transcript with the formatted version
            fullTranscriptRef.current = analysisResult.formattedTranscript;
            setTranscript(analysisResult.formattedTranscript);
            onTranscriptUpdate(analysisResult.formattedTranscript);
          }
        } catch (error) {
          console.error('Error analyzing transcript segment:', error);
        }
      }
    }
  };

  const resumeRecording = async () => {
    // Resume by starting recognition again and preserving accumulated text
    if (recordingState === 'paused') {
      setRecordingState('recording');
      await startRecording(true); // Pass true to indicate this is a resume
    }
  };

  const handlePauseResume = () => {
    // Smart toggle for the middle button (Pause ↔ Resume)
    if (recordingState === 'recording') {
      pauseRecording();
    } else if (recordingState === 'paused') {
      resumeRecording();
    }
  };

  const isRecording = recordingState === 'recording';
  const isPaused = recordingState === 'paused';
  const isIdle = recordingState === 'idle';

  return (
    <Card className="medical-card p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Voice Recording</h2>
          <p className="text-muted-foreground">
            {isRecording && 'Recording in progress...'}
            {isPaused && 'Recording paused'}
            {isIdle && 'Ready to record patient conversation'}
          </p>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <Button
            onClick={() => startRecording(false)}
            disabled={!isIdle || !isSupported}
            variant="default"
            size="lg"
            className={cn(
              "px-8 py-3 text-lg font-medium transition-all duration-200",
              (!isIdle || !isSupported) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Mic className="w-5 h-5 mr-2" />
            Start
          </Button>

          <Button
            onClick={handlePauseResume}
            disabled={isIdle || !isSupported}
            variant="secondary"
            size="lg"
            className={cn(
              "px-8 py-3 text-lg font-medium transition-all duration-200",
              (isIdle || !isSupported) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isPaused ? (
              <>
                <Play className="w-5 h-5 mr-2" />
                Resume
              </>
            ) : (
              <>
                <Pause className="w-5 h-5 mr-2" />
                Pause
              </>
            )}
          </Button>

          <Button
            onClick={stopRecording}
            disabled={isIdle || !isSupported}
            variant="destructive"
            size="lg"
            className={cn(
              "px-8 py-3 text-lg font-medium transition-all duration-200",
              (isIdle || !isSupported) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Square className="w-5 h-5 mr-2" />
            Stop
          </Button>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex justify-center">
            <div className="recording-pulse bg-destructive text-destructive-foreground px-4 py-2 rounded-full text-sm font-medium">
              🔴 Recording...
            </div>
          </div>
        )}

        {/* Live transcription display */}
        {(isRecording || isPaused || transcript) && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-foreground mb-3">Live Transcription</h3>
            <div className="bg-muted/50 border border-border rounded-lg p-4 min-h-[120px] max-h-[300px] overflow-y-auto">
              <p className="transcription-text text-foreground whitespace-pre-wrap">
                {transcript && transcript.trim() ? (
                  transcript
                ) : (
                  <span className="text-muted-foreground italic">
                    {isRecording ? 'Listening... Start speaking to see transcription.' : 
                     isPaused ? 'Recording paused. Click Resume to continue.' :
                     'Transcription will appear here as you speak...'}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Browser support warning */}
        {!isSupported && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-center">
            <p className="text-warning-foreground">
              Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari for the best experience.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
