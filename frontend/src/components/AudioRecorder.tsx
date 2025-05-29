/// <reference types="vite/client" />
import React, { useState, useEffect } from "react";
import APIService from "../services/APIService";

const AudioRecorder = ({ onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [recordingTime, setRecordingTime] = useState(0);
  const [finalRecordingTime, setFinalRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [versionMismatch, setVersionMismatch] = useState(false);

  const MAX_RECORDING_TIME = 10;

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      setFinalRecordingTime(recordingTime);
      setIsRecording(false);
    }
  };

  useEffect(() => {
    let interval;

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prevTime) => {
          if (prevTime >= MAX_RECORDING_TIME - 1) {
            stopRecording();
            return prevTime;
          }
          return prevTime + 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(interval);
    };
  }, [isRecording, mediaRecorder]);

  const startRecording = async () => {
    try {
      // Clear any previous errors
      setError(null);
      setVersionMismatch(false);
      setRecordingTime(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        
        // Start loading state
        setIsTranscribing(true);

        try {
          const response = await APIService.transcribeAudio(audioBlob);
          
          if (response.versionMismatch) {
            setVersionMismatch(true);
            setError("Version mismatch detected. Please refresh the page.");
          } else if (response.error) {
            setError(`Transcription failed: ${response.error}`);
          } else if (response.data) {
            onTranscriptionComplete(response.data.transcription);
            setError(null); // Clear any previous errors on success
          }
        } catch (error) {
          console.error("Error during transcription:", error);
          setError("An unexpected error occurred during transcription.");
        } finally {
          // End loading state
          setIsTranscribing(false);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setError("Failed to access microphone. Please check permissions.");
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const clearError = () => {
    setError(null);
    setVersionMismatch(false);
  };

  const isDisabled = isRecording || isTranscribing;

  return (
    <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
      {/* Error Display */}
      {error && (
        <div className={`p-4 rounded-lg border ${
          versionMismatch 
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium">
              {versionMismatch ? '⚠️' : '❌'}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">{error}</p>
              <div className="flex gap-2">
                {versionMismatch && (
                  <button
                    onClick={handleRefresh}
                    className="px-3 py-1 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 text-xs rounded font-medium"
                  >
                    Refresh Page
                  </button>
                )}
                <button
                  onClick={clearError}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs rounded font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {finalRecordingTime > 0 && !isTranscribing && !error && (
        <p className="text-sm text-gray-600">
          Final recording time: {finalRecordingTime}s
        </p>
      )}
      
      {/* Loading indicator */}
      {isTranscribing && (
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-sm text-gray-600">
            Transcribing audio, please wait...
          </p>
        </div>
      )}

      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isDisabled || versionMismatch}
        className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
          versionMismatch
            ? "bg-yellow-400 text-yellow-800 cursor-not-allowed"
            : isTranscribing
            ? "bg-gray-400 text-gray-600 cursor-not-allowed"
            : isRecording
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
      >
        {versionMismatch
          ? "Please Refresh Page"
          : isTranscribing
          ? "Processing..."
          : isRecording
          ? `Stop Recording (${MAX_RECORDING_TIME - recordingTime}s)`
          : "Start Recording"}
      </button>

      {isRecording && (
        <p className="text-sm text-gray-600">
          Recording in progress (Current time: {recordingTime}s)
        </p>
      )}

      {/* Version info (for debugging, can remove in production) */}
      {import.meta.env.MODE === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          Version: {APIService.getVersionInfo().frontend}
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;