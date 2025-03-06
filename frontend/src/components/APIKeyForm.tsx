import React, { useState } from 'react';
import APIService from '../services/APIService';

interface APIKeyFormProps {
  onSaved?: () => void;
}

const APIKeyForm: React.FC<APIKeyFormProps> = ({ onSaved }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }
    
    // Simple validation - Anthropic keys usually start with "sk-"
    if (!apiKey.startsWith('sk-')) {
      setError('Invalid API key format. Anthropic keys typically start with "sk-"');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await APIService.setAnthropicApiKey(apiKey);
      
      if (response.error) {
        setError(response.error);
        return;
      }
      
      setSuccess(true);
      setApiKey(''); // Clear the input
      
      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      setError(`Failed to save API key: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Anthropic API Key</h2>
      <p className="text-gray-600 mb-4">
        Enter your Anthropic API key to enable transcription categorization.
        Your key will be stored securely and only used for categorizing your transcriptions.
      </p>
      <div className="mb-4 p-3 bg-blue-50 text-blue-700 border border-blue-100 rounded">
        <p className="text-sm font-semibold">Important:</p>
        <p className="text-sm">
          You must set your Anthropic API key before recording audio to enable categorization.
          Categorization will only work for transcriptions recorded after setting your API key.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="sk-..."
            autoComplete="off"
          />
        </div>
        
        {error && (
          <div className="text-red-600 p-3 bg-red-50 border border-red-100 rounded">
            <p className="font-semibold">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="text-green-600 p-3 bg-green-50 border border-green-100 rounded">
            <p className="font-semibold">API key saved successfully!</p>
            <p className="text-sm">You can now record audio and receive categorized transcriptions.</p>
          </div>
        )}
        
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white font-medium ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save API Key'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default APIKeyForm;