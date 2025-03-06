import React, { useEffect } from "react";
import { useState } from "react";
import AudioRecorder from "./components/AudioRecorder";
import APIKeyForm from "./components/APIKeyForm";
import TranscriptionCategorization from "./components/TranscriptionCategorization";
import APIService from "./services/APIService";

function App() {
  interface TranscriptionItem {
    text: string;
    categorization?: any;
    categorization_error?: string;
  }
  
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [versionMismatch, setVersionMismatch] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize app - check version and ensure user ID
  useEffect(() => {
    const initApp = async () => {
      // First ensure we have a user ID
      const userIdValue = await APIService.ensureUserID();
      console.log(`App initialized with user ID: ${userIdValue}`);
      setUserId(userIdValue);
      
      // Then check version
      await APIService.checkVersion();
      const { isVersionMismatch, backendVersion, frontendVersion } = APIService.getVersionStatus();
      
      if (isVersionMismatch) {
        setVersionMismatch(
          `Version mismatch detected! Your version (${frontendVersion}) is different from the server (${backendVersion}). Please refresh your browser.`
        );
      }
    };
    
    initApp();
  }, []);

  const handleTranscriptionComplete = (text: string, categorization?: any, categorization_error?: string) => {
    console.log("App - Raw categorization received:", categorization);
    
    // Store the data exactly as received with minimal processing
    const newItem = { 
      text, 
      categorization, 
      categorization_error 
    };
    
    console.log("App - New item being stored:", newItem);
    setTranscriptions(prev => [newItem, ...prev]);
  };

  const handleTranscriptionStatusChange = (status: boolean) => {
    setIsTranscribing(status);
  };
  
  const handleVersionMismatch = (message: string) => {
    setVersionMismatch(message);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-slate-800 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Audio</span> Transcription
          </h1>
          <p className="text-slate-600 text-sm">Powered by AI categorization</p>
        </header>
        
        {/* API Key Form */}
        <div className="w-full rounded-xl shadow-lg bg-white overflow-hidden border border-gray-100 mb-6 transform transition-all hover:scale-102">
          <div className="p-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          <APIKeyForm onSaved={() => console.log("API key saved successfully")} />
        </div>
        
        {/* Test button for categorization */}
        <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-indigo-800">Developer Tools</h3>
            <span className="text-xs px-2 py-1 bg-indigo-100 rounded-full text-indigo-700 font-medium">Testing</span>
          </div>
          <p className="text-xs text-indigo-700 mb-4">
            Test the categorization system without recording audio
          </p>
          <button 
            onClick={async () => {
              try {
                const response = await APIService.testCategorization();
                console.log("Test response:", response);
                if (response.data) {
                  handleTranscriptionComplete(
                    response.data.result || "Test transcription", 
                    response.data.categorization,
                    undefined
                  );
                }
              } catch (error) {
                console.error("Test categorization error:", error);
              }
            }}
            className="w-full py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Test Categorization
          </button>
        </div>
      </div>
      
      {versionMismatch ? (
        <div className="mt-4 p-5 bg-red-50 border border-red-100 rounded-xl shadow-lg w-full max-w-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="h-3 w-3 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-red-800">Version Mismatch</h3>
              <p className="mt-1 text-sm text-red-700">{versionMismatch}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-md text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none transition-all duration-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Refresh Now
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-6">
          {/* Audio Recorder Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
            <div className="p-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <div className="p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Record Audio</h2>
              <p className="text-sm text-gray-500 mb-4">Speak clearly for best transcription results</p>
              <AudioRecorder 
                onTranscriptionComplete={handleTranscriptionComplete}
                onTranscriptionStatusChange={handleTranscriptionStatusChange}
                onVersionMismatch={handleVersionMismatch}
              />
            </div>
          </div>
          
          {/* Processing State */}
          {isTranscribing && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 flex flex-col items-center overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-50"></div>
              <div className="relative">
                <div className="w-10 h-10 mb-4 flex items-center justify-center bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full">
                  <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 text-center">Processing</h3>
                <p className="mt-1 text-sm text-gray-500 text-center">
                  Analyzing your audio with AI...
                </p>
              </div>
            </div>
          )}
          
          {transcriptions.length > 0 && (
            <div className="mt-8 w-full max-w-md transition-all duration-500 ease-in-out">
              <h2 className="font-semibold mb-4 text-indigo-900 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
                </svg>
                Transcriptions
              </h2>
              {transcriptions.map((item, index) => {
                console.log(`Rendering transcription #${index}:`, item);
                return (
                  <div key={index} className="mb-6 transform transition-all duration-300 hover:translate-y-[-2px]">
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-lg shadow-md border border-indigo-100">
                      <p className="text-xs font-medium text-indigo-600 mb-2 flex justify-between items-center">
                        <span>Transcription #{transcriptions.length - index}</span>
                        <span className="px-2 py-1 bg-indigo-100 rounded-full text-indigo-700">Completed</span>
                      </p>
                      <p className="text-gray-700">{item.text}</p>
                    </div>
                    
                    {/* Debug info - hidden */}
                    <pre className="hidden">{JSON.stringify(item, null, 2)}</pre>
                    
                    {/* Debug output to examine the real data structure */}
                    <div className="bg-gray-50 p-2 rounded my-2 border border-gray-200 hidden">
                      <p className="text-xs font-bold">Raw data format:</p>
                      <p className="text-xs font-mono">
                        item type: {typeof item}<br />
                        categorization: {item.categorization ? typeof item.categorization : 'undefined'}<br />
                        categorization_error: {item.categorization_error || 'none'}<br />
                        categorization keys: {item.categorization ? Object.keys(item.categorization).join(', ') : 'none'}<br />
                        has nested structure: {item.categorization && item.categorization.categorization ? 'YES' : 'NO'}
                      </p>
                      <details>
                        <summary className="text-xs font-bold cursor-pointer">Full data</summary>
                        <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(item, null, 2)}</pre>
                      </details>
                    </div>
                    
                    {/* Direct access to nested categorization structure */}
                    {item.categorization && item.categorization.categorization ? (
                      <div className="mt-4 bg-white rounded-lg p-5 shadow-md border border-indigo-100 overflow-hidden">
                        <div className="p-1 bg-gradient-to-r from-blue-500 to-indigo-600 absolute top-0 left-0 right-0"></div>
                        <div className="relative">
                          <h3 className="text-lg font-semibold mb-4 text-indigo-900 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                            </svg>
                            AI Categorization
                          </h3>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="col-span-1">
                              <p className="text-xs uppercase tracking-wider text-indigo-600 font-semibold mb-2">Category</p>
                              <span className="inline-block px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-indigo-800 shadow-sm border border-indigo-200">
                                {item.categorization.categorization.category}
                              </span>
                            </div>
                            
                            <div className="col-span-1">
                              <p className="text-xs uppercase tracking-wider text-indigo-600 font-semibold mb-2">Sentiment</p>
                              <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border ${
                                item.categorization.categorization.sentiment === 'positive' 
                                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-emerald-800 border-emerald-200' 
                                  : item.categorization.categorization.sentiment === 'negative'
                                    ? 'bg-gradient-to-r from-red-100 to-pink-100 text-pink-800 border-pink-200'
                                    : 'bg-gradient-to-r from-gray-100 to-slate-100 text-slate-800 border-slate-200'
                              }`}>
                                {item.categorization.categorization.sentiment}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <p className="text-xs uppercase tracking-wider text-indigo-600 font-semibold mb-2">Topics</p>
                            <div className="flex flex-wrap gap-2">
                              {item.categorization.categorization.topics && 
                               Array.isArray(item.categorization.categorization.topics) ?
                               item.categorization.categorization.topics.map((topic: string, idx: number) => (
                                <span key={idx} className="bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-800 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border border-indigo-100">
                                  {topic}
                                </span>
                              )) : 
                              <span className="bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-800 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border border-indigo-100">
                                No topics available
                              </span>}
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <p className="text-xs uppercase tracking-wider text-indigo-600 font-semibold mb-2">Keywords</p>
                            <div className="flex flex-wrap gap-2">
                              {item.categorization.categorization.keywords &&
                               Array.isArray(item.categorization.categorization.keywords) ?
                               item.categorization.categorization.keywords.map((keyword: string, idx: number) => (
                                <span key={idx} className="bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border border-blue-100">
                                  {keyword}
                                </span>
                              )) :
                              <span className="bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border border-blue-100">
                                No keywords available
                              </span>}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs uppercase tracking-wider text-indigo-600 font-semibold mb-2">Summary</p>
                            <p className="text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-200">{item.categorization.categorization.summary}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg shadow-md border border-amber-100 relative overflow-hidden">
                        <div className="p-1 bg-gradient-to-r from-amber-500 to-yellow-500 absolute top-0 left-0 right-0"></div>
                        <div className="flex items-start mt-2">
                          <div className="flex-shrink-0">
                            <div className="h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center shadow-sm border border-amber-200">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-amber-800">Categorization unavailable</h4>
                            <p className="mt-2 text-sm text-amber-700">
                              {item.categorization_error || "No specific error. Please set your Anthropic API key to enable categorization."}
                            </p>
                            <details className="mt-2">
                              <summary className="text-xs cursor-pointer text-amber-600 font-medium">Need help?</summary>
                              <p className="text-xs mt-1 text-amber-700">If you've already set your API key, try refreshing the page or recording another audio sample.</p>
                            </details>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
