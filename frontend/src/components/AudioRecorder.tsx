import React, { useState, useEffect, useCallback } from "react";
import APIService from "../services/APIService";
import TranscriptionJob from "./TranscriptionJob";

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string, categorization?: any, categorization_error?: string) => void;
  onTranscriptionStatusChange?: (isTranscribing: boolean) => void;
  onVersionMismatch?: (message: string) => void;
}

interface JobInfo {
  id: string;
  recordingTime: number;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ 
  onTranscriptionComplete,
  onTranscriptionStatusChange,
  onVersionMismatch
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeJobs, setActiveJobs] = useState<JobInfo[]>([]);

  const MAX_RECORDING_TIME = 10;

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }, [mediaRecorder]);

  useEffect(() => {
    let interval;

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prevTime => {
          const newTime = prevTime + 1;
          if (newTime >= MAX_RECORDING_TIME) {
            stopRecording();
            return prevTime;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      clearInterval(interval);
    };
  }, [isRecording, stopRecording]);

  const startRecording = async () => {
    try {
      setRecordingTime(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const currentRecordingTime = recordingTime;
        setRecordingTime(0);

        try {
          // Check version before making the request
          await APIService.checkVersion();
          
          // Note: We no longer set a single transcribing state since we can have multiple jobs
          // Signal parent component that a new transcription has started
          if (onTranscriptionStatusChange) {
            onTranscriptionStatusChange(true);
          }
          
          // Start transcription job
          const response = await APIService.transcribeAudio(audioBlob);
          
          // Handle version mismatch or other errors
          if (response.error) {
            console.error("API Error:", response.error);
            
            if (response.error === "Version mismatch" && onVersionMismatch && response.message) {
              onVersionMismatch(response.message);
            }
            
            if (onTranscriptionStatusChange) {
              onTranscriptionStatusChange(false);
            }
            return;
          }
          
          // Process successful job creation
          if (response.data && response.data.job_id) {
            // Add the new job to active jobs
            setActiveJobs(prevJobs => [
              ...prevJobs,
              { id: response.data!.job_id, recordingTime: currentRecordingTime }
            ]);
          }
        } catch (error) {
          console.error("Error sending audio:", error);
          if (onTranscriptionStatusChange) {
            onTranscriptionStatusChange(false);
          }
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  // Handle job completion - remove from active jobs and notify parent
  const handleJobComplete = useCallback((jobId: string, text: string, categorization?: any, categorization_error?: string) => {
    console.log("AudioRecorder - Job complete with categorization:", categorization);
    console.log("AudioRecorder - Categorization error:", categorization_error);
    
    setActiveJobs(prevJobs => {
      const newJobs = prevJobs.filter(job => job.id !== jobId);
      // Check if there are no more active jobs and notify parent
      if (newJobs.length === 0) {
        if (onTranscriptionStatusChange) {
          onTranscriptionStatusChange(false);
        }
      }
      return newJobs;
    });
    
    onTranscriptionComplete(text, categorization, categorization_error);
  }, [onTranscriptionComplete, onTranscriptionStatusChange]);
  
  // Handle job error - remove from active jobs
  const handleJobError = useCallback((jobId: string) => {
    setActiveJobs(prevJobs => {
      const newJobs = prevJobs.filter(job => job.id !== jobId);
      // Check if there are no more active jobs and notify parent
      if (newJobs.length === 0) {
        if (onTranscriptionStatusChange) {
          onTranscriptionStatusChange(false);
        }
      }
      return newJobs;
    });
  }, [onTranscriptionStatusChange]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-6 py-3 rounded-lg font-semibold shadow-md transition-all duration-300 transform hover:scale-105 ${
          isRecording
            ? "bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700"
            : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
        }`}
      >
        <div className="flex items-center">
          {isRecording ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              <span>Stop Recording ({MAX_RECORDING_TIME - recordingTime}s)</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              <span>Start Recording</span>
            </>
          )}
        </div>
      </button>
      
      {isRecording && (
        <div className="w-full bg-indigo-50 rounded-lg p-3 border border-indigo-100 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-2"></div>
            <p className="text-sm font-medium text-indigo-800">Recording in progress</p>
          </div>
          <span className="text-xs bg-indigo-100 px-2 py-1 rounded-full text-indigo-700 font-mono">
            {recordingTime}s
          </span>
        </div>
      )}
      
      {/* Display active transcription jobs */}
      {activeJobs.length > 0 && (
        <div className="w-full mt-6">
          <h3 className="text-lg font-medium mb-3 text-indigo-900 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              <path stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11h4" />
            </svg>
            Active Transcriptions
          </h3>
          {activeJobs.map(job => (
            <div key={job.id} className="mb-4 transform transition-all duration-300 hover:translate-y-[-2px]">
              <div className="flex justify-between mb-2 px-2">
                <span className="text-sm font-medium text-indigo-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Recording length: {job.recordingTime}s
                </span>
              </div>
              <TranscriptionJob 
                jobId={job.id}
                onComplete={(text, categorization, categorization_error) => handleJobComplete(job.id, text, categorization, categorization_error)}
                onError={() => handleJobError(job.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
