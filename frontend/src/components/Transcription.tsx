interface TranscriptionProps {
  text: string;
}

const Transcription = ({ text }: TranscriptionProps) => {
  if (!text) return null;

  return (
    <div className="mt-8 p-4 bg-gray-100 rounded-lg">
      <h2 className="font-semibold mb-2">Transcription:</h2>
      <p>{text}</p>
    </div>
  );
};

export default Transcription;
