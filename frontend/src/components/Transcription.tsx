import Card from './ui/Card';

interface TranscriptionProps {
  text: string;
}

const Transcription = ({ text }: TranscriptionProps) => {
  if (!text) return null;

  return (
    <Card header={<h2 className="font-semibold mb-2">Transcription:</h2>}>
      <p>{text}</p>
    </Card>
  );
};

export default Transcription;
