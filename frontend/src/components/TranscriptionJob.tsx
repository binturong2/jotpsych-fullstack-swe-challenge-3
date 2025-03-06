import React, { useState, useEffect } from "react";
import APIService from "../services/APIService";
import TranscriptionCategorization from "./TranscriptionCategorization";
import { Categorization } from "../types/Categorization";

interface TranscriptionJobProps {
  jobId: string;
  onComplete: (text: string, categorization?: Categorization, categorization_error?: string) => void;
  onError?: (error: string) => void;
}

const TranscriptionJob: React.FC<TranscriptionJobProps> = ({
  jobId,
  onComplete,
  onError
}) => {
  const [status, setStatus] = useState<string>("pending");
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [categorization, setCategorization] = useState<Categorization | null>(null);
  const [categorizationError, setCategorizationError] = useState<string | null>(null);

  // Poll for job status updates
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      if (!isPolling) return;

      try {
        const response = await APIService.getTranscriptionStatus(jobId);

        if (response.error) {
          setError(response.error);
          setIsPolling(false);
          if (onError) onError(response.error);
          return;
        }

        if (response.data) {
          // Debug the full response data in excruciating detail
          console.log("TranscriptionJob - FULL RESPONSE DATA:", JSON.stringify(response.data, null, 2));
          console.log("TranscriptionJob - Response keys:", Object.keys(response.data));
          console.log("TranscriptionJob - Has categorization:", "categorization" in response.data);
          
          // Check what's in the response directly
          if (response.data.categorization) {
            console.log("FOUND CATEGORIZATION IN RESPONSE:", response.data.categorization);
          } else {
            console.log("NO CATEGORIZATION FOUND IN RESPONSE");
          }
          
          setStatus(response.data.status);
          setProgress(response.data.progress);

          // If job is completed
          if (response.data.status === "completed") {
            // Set result if available
            if (response.data.result) {
              setResult(response.data.result);
              setIsPolling(false);
              
              // Complete with text, categorization and possible error
              if (response.data.categorization) {
                // Directly use the categorization data without any transformation
                console.log("DIRECTLY PASSING CATEGORIZATION TO PARENT:", response.data.categorization);
                onComplete(response.data.result, response.data.categorization);
              } else if (response.data.categorization_error) {
                console.log("TranscriptionJob - Categorization error:", response.data.categorization_error);
                setCategorizationError(response.data.categorization_error);
                onComplete(response.data.result, undefined, response.data.categorization_error);
              } else {
                console.log("TranscriptionJob - No categorization received");
                onComplete(response.data.result);
              }
            }
            
            // Set categorization if available but not already set
            else if (response.data.categorization) {
              setCategorization(response.data.categorization);
            }
            
            // Set categorization error if available
            if (response.data.categorization_error) {
              setCategorizationError(response.data.categorization_error);
            }
          }

          // If job failed, stop polling and set error
          if (response.data.status === "failed" && response.data.error) {
            setError(response.data.error);
            setIsPolling(false);
            if (onError) onError(response.data.error);
          }
        }
      } catch (err) {
        console.error("Error checking transcription status:", err);
        setError(`Failed to check status: ${err}`);
        if (onError) onError(`Failed to check status: ${err}`);
      }
    };

    // Start polling immediately and then every 1 second
    checkStatus();
    if (isPolling) {
      intervalId = setInterval(checkStatus, 1000);
    }

    // Clean up on unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [jobId, isPolling, onComplete, onError]);

  return (
    <div className="p-4 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-lg w-full shadow-md border border-indigo-100">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-medium text-indigo-800 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13 7H7v6h6V7z" />
            <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
          </svg>
          Job #{jobId.substring(0, 8)}...
        </p>
        <span className={`text-xs px-3 py-1 rounded-full font-medium shadow-sm ${
          status === "completed" ? "bg-gradient-to-r from-green-100 to-emerald-100 text-emerald-800 border border-emerald-200" :
          status === "failed" ? "bg-gradient-to-r from-red-100 to-pink-100 text-pink-800 border border-pink-200" :
          status === "processing" ? "bg-gradient-to-r from-blue-100 to-indigo-100 text-indigo-800 border border-indigo-200" :
          "bg-gradient-to-r from-gray-100 to-slate-100 text-slate-800 border border-slate-200"
        }`}>
          {status}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white rounded-full h-3 mb-2 shadow-inner overflow-hidden border border-indigo-100">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <p className="text-xs text-indigo-700 text-right font-medium">{progress}%</p>

      {/* Show error if job failed */}
      {error && (
        <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-md shadow-sm border border-red-200 flex items-start">
          <div className="flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="font-semibold text-red-800">Error:</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {/* Display transcription result */}
      {status === "completed" && result && (
        <div className="mt-4">
          <div className="border-t border-indigo-100 pt-3">
            <p className="text-sm text-indigo-800 font-medium mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              Result:
            </p>
            <p className="text-sm bg-white p-3 rounded-md border border-indigo-100 shadow-sm">
              {result.length > 100 ? `${result.substring(0, 100)}...` : result}
            </p>
          </div>
        </div>
      )}
      
      {/* Display categorization error if there is one */}
      {categorizationError && (
        <div className="mt-4">
          <div className="border-t border-indigo-100 pt-3">
            <p className="text-sm text-red-600 font-medium mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Categorization Error:
            </p>
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100 shadow-sm">{categorizationError}</p>
          </div>
        </div>
      )}
      
      {/* Display categorization results if available */}
      {categorization && (
        <TranscriptionCategorization categorization={categorization} />
      )}
    </div>
  );
};

export default TranscriptionJob;