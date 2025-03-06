interface APIResponse<T> {
  data?: T;
  error?: string;
  version?: string;
  message?: string;
}

interface TranscriptionResponse {
  transcription: string;
  version: string;
}

import { Categorization } from "../types/Categorization";

interface TranscriptionJob {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  result?: string;
  error?: string;
  categorization?: Categorization;
  categorization_error?: string;
}

interface TranscriptionJobResponse {
  job_id: string;
  status: string;
  progress: number;
  result?: string;
  error?: string;
  version?: string;
  categorization?: Categorization;
  categorization_error?: string;
}

class APIService {
  private baseUrl: string = "http://localhost:8000";
  private currentVersion: string = "1.0.0";
  private userID: string | null = null;
  private isVersionMismatch: boolean = false;
  private backendVersion: string | null = null;
  
  constructor() {
    // Load user ID from local storage if available
    this.loadUserID();
  }
  
  private loadUserID() {
    const storedUserID = localStorage.getItem('user_id');
    if (storedUserID) {
      this.userID = storedUserID;
      console.log(`Loaded user ID from storage: ${this.userID}`);
    }
  }
  
  private saveUserID(userId: string) {
    this.userID = userId;
    localStorage.setItem('user_id', userId);
    console.log(`Saved user ID to storage: ${userId}`);
  }
  
  // Ensure user has an ID, creating one if needed
  public async ensureUserID(): Promise<string> {
    if (this.userID) {
      return this.userID;
    }
    
    try {
      // Request a new user ID from the backend
      const response = await this.makeRequest<{ user_id: string }>("/user", "POST");
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (response.data && response.data.user_id) {
        this.saveUserID(response.data.user_id);
        return this.userID!;
      } else {
        throw new Error("Failed to get user ID from server");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      
      // Fallback: generate a client-side ID if server request fails
      const fallbackId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      this.saveUserID(fallbackId);
      return fallbackId;
    }
  }
  
  // Get current user ID
  public getUserID(): string | null {
    return this.userID;
  }
  
  // Set Anthropic API key
  public async setAnthropicApiKey(apiKey: string): Promise<APIResponse<any>> {
    const response = await this.makeRequest<{ user_id: string }>('/user/api-key', 'POST', { api_key: apiKey });
    
    // If the response includes a user ID, save it
    if (!this.userID && response.data && response.data.user_id) {
      this.saveUserID(response.data.user_id);
    }
    
    return response;
  }

  // Version check handler
  public async checkVersion(): Promise<boolean> {
    try {
      const response = await this.makeRequest<{ version: string }>("/version", "GET");
      if (response.data && response.data.version) {
        this.backendVersion = response.data.version;
        this.isVersionMismatch = this.currentVersion !== this.backendVersion;
        
        // Return true if versions match, false if mismatch
        return !this.isVersionMismatch;
      }
      return true; // Assume versions match if can't determine
    } catch (error) {
      console.error("Failed to check version:", error);
      return true; // Assume versions match on error
    }
  }

  // Get current version mismatch status
  public getVersionStatus(): { 
    isVersionMismatch: boolean; 
    backendVersion: string | null;
    frontendVersion: string;
  } {
    return {
      isVersionMismatch: this.isVersionMismatch,
      backendVersion: this.backendVersion,
      frontendVersion: this.currentVersion
    };
  }

  // Generic request handler
  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: FormData | object
  ): Promise<APIResponse<T>> {
    try {
      // Don't check for version mismatch on the version endpoint itself
      if (endpoint !== "/version" && this.isVersionMismatch) {
        return {
          error: "Version mismatch",
          message: `Your application (${this.currentVersion}) is out of date. Please refresh to use the latest version (${this.backendVersion}).`,
          version: this.backendVersion
        };
      }

      // Create headers with client version and user ID (if available)
      const headers: HeadersInit = {
        "X-Client-Version": this.currentVersion
      };
      
      // Add user ID to headers if available
      if (this.userID) {
        headers["X-User-ID"] = this.userID;
      }

      // Add Content-Type header if body is a plain object (not FormData)
      if (body && !(body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }

      const requestOptions: RequestInit = {
        method,
        headers,
        body: body instanceof FormData ? body : JSON.stringify(body),
      };

      const response = await fetch(
        `${this.baseUrl}${endpoint}`,
        requestOptions
      );
      
      const data = await response.json();
      
      // Check if response contains version information and update if needed
      if (data.version && data.version !== this.currentVersion) {
        this.backendVersion = data.version;
        this.isVersionMismatch = true;
        
        // If there's an error due to version mismatch, return it directly
        if (data.error === "Version mismatch") {
          return {
            error: "Version mismatch",
            message: data.message || "Please refresh your application.",
            version: data.version
          };
        }
      }
      
      return { data: data as T, version: data.version };
    } catch (error) {
      return { error: `Request failed: ${error}` };
    }
  }

  // Start a new transcription job
  async transcribeAudio(audioBlob: Blob): Promise<APIResponse<TranscriptionJob>> {
    const formData = new FormData();
    formData.append("audio", audioBlob);

    const response = await this.makeRequest<TranscriptionJobResponse>("/transcribe", "POST", formData);
    
    if (response.error) {
      return response;
    }
    
    return {
      data: response.data as TranscriptionJob,
      version: response.version
    };
  }
  
  // Get status of a transcription job
  async getTranscriptionStatus(jobId: string): Promise<APIResponse<TranscriptionJob>> {
    const response = await this.makeRequest<TranscriptionJobResponse>(`/transcription/${jobId}`, "GET");
    
    if (response.error) {
      return response;
    }
    
    console.log("API Service - Transcription status response:", JSON.stringify(response, null, 2));
    
    // Check for categorization data structure issues
    if (response.data && response.data.categorization) {
      console.log("API Service - Raw categorization data:", JSON.stringify(response.data.categorization, null, 2));
    }
    
    return {
      data: response.data as TranscriptionJob,
      version: response.version
    };
  }
  
  // Test endpoint for categorization
  async testCategorization(): Promise<APIResponse<TranscriptionJob>> {
    console.log("Calling test categorization endpoint");
    const response = await this.makeRequest<TranscriptionJobResponse>('/test/categorization', 'GET');
    console.log("Test categorization response:", JSON.stringify(response, null, 2));
    return response;
  }
}

export default new APIService();
