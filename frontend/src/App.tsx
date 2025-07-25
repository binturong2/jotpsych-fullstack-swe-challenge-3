import { useState } from 'react';
import AudioRecorder from './components/AudioRecorder';
import Transcription from './components/Transcription';
import Container from './components/ui/Container';

function App() {
  const [transcription, setTranscription] = useState<string>('');

  const handleTranscriptionComplete = (text: string) => {
    setTranscription(text);
  };

  const handleTranscriptionStart = () => setTranscription('');

  return (
    <Container>
      <h1 className="text-2xl font-bold mb-8">Audio Transcription Demo</h1>
      <AudioRecorder
        onTranscriptionComplete={handleTranscriptionComplete}
        onRecordingStart={handleTranscriptionStart}
      />
      <Transcription text={transcription} />
    </Container>
  );
}

export default App;
