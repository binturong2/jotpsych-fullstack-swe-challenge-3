import { useEffect, useState } from 'react';
import APIService from '../services/APIService';
import { handleError } from '../utils/error';
import Card from './ui/Card';

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onRecordingStart?: () => void;
}

const AudioRecorder = ({
  onTranscriptionComplete,
  onRecordingStart,
}: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [recordingTime, setRecordingTime] = useState(0);
  const [finalRecordingTime, setFinalRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const MAX_RECORDING_TIME = 10;

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setFinalRecordingTime(recordingTime);
      setIsRecording(false);
    }
  };

  useEffect(() => {
    if (isRecording && recordingTime >= MAX_RECORDING_TIME) {
      stopRecording();
    }
  }, [isRecording, recordingTime]);

  useEffect(() => {
    let interval: number;

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      clearInterval(interval);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setRecordingTime(0);
      onRecordingStart?.();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });

        setIsProcessing(true);

        try {
          const response = await APIService.transcribeAudio(audioBlob);
          if (response.error) {
            handleError('Error transcribing audio:', new Error(response.error));
            onTranscriptionComplete('');
          } else if (response.data) {
            onTranscriptionComplete(response.data.transcription);
          }
        } catch (error) {
          handleError('Error sending audio', error as Error);
          onTranscriptionComplete('');
        } finally {
          setIsProcessing(false);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      handleError('Error accessing microphone:', error as Error);
    }
  };

  return (
    <Card>
      {finalRecordingTime > 0 && !isProcessing && (
        <p className="text-sm text-gray-600">
          Final recording time: {finalRecordingTime}s
        </p>
      )}
      {isProcessing ? (
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-sm text-gray-600">Processing transcription...</p>
        </div>
      ) : (
        <>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-6 py-3 rounded-lg font-semibold ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isRecording
              ? `Stop Recording (${MAX_RECORDING_TIME - recordingTime}s)`
              : 'Start Recording'}
          </button>
          {isRecording && (
            <p className="text-sm text-gray-600">
              Recording in progress (Current time: {recordingTime}s)
            </p>
          )}
        </>
      )}
    </Card>
  );
};

export default AudioRecorder;
