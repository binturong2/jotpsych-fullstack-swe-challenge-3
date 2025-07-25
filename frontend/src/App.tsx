import { useState } from 'react';
import AudioRecorder from './components/AudioRecorder';
import Transcription from './components/Transcription';

function App() {
  const [transcription, setTranscription] = useState<string>('');

  const handleTranscriptionComplete = (text: string) => {
    setTranscription(text);
  };

  const handleTranscriptionStart = () => setTranscription('');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-8">Audio Transcription Demo</h1>
      <AudioRecorder
        onTranscriptionComplete={handleTranscriptionComplete}
        onRecordingStart={handleTranscriptionStart}
      />
      <Transcription text={transcription} />
    </div>
  );
}

export default App;
