interface APIResponse<T> {
  data?: T;
  error?: string;
  version?: string; // Backend version from response
  versionMismatch?: boolean; // Flagged by frontend or backend
}

interface VersionCheckResponse {
  version: string;
  compatible: boolean;
  client_version?: string; // Added for clarity from backend
  supported_versions?: string[]; // Added for clarity from backend
}

interface UserIDResponse { // For the new /user/id endpoint
  user_id: string;
  version?: string; // Backend version from response
}

class APIService {
  private baseUrl: string = "http://localhost:8000";
  private currentVersion: string = "1.0.0"; // Frontend version
  private userID: string | null = null; // Will be loaded from localStorage or fetched
  private userInitializationPromise: Promise<string | null> | null = null; // Manages User ID fetching

  private backendVersion: string | null = null;
  private versionCheckPromise: Promise<boolean> | null = null;


  // Ensure User ID is loaded or fetched
  private async ensureUserID(): Promise<string> {
    if (this.userID) {
      return this.userID;
    }

    const storedUserID = localStorage.getItem("userID");
    if (storedUserID) {
      this.userID = storedUserID;
      return this.userID;
    }

    if (!this.userInitializationPromise) {
      this.userInitializationPromise = (async () => {
        try {
          console.log("Attempting to fetch new User ID from backend...");
          const response = await fetch(`${this.baseUrl}/user/id`, {
            method: "GET",
            headers: {
              'X-Client-Version': this.currentVersion, // Send client version during User ID fetch
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to fetch user ID:", response.status, errorText);
            this.userInitializationPromise = null; // Reset promise to allow retry on subsequent calls
            return null;
          }

          const data: UserIDResponse = await response.json();
          if (data.user_id) {
            this.userID = data.user_id;
            localStorage.setItem("userID", this.userID!);
            console.log("User ID fetched and stored:", this.userID);
            if (data.version) this.backendVersion = data.version; // Optionally track backend version from this call
            return this.userID;
          } else {
            console.error("User ID not found in API response:", data);
            this.userInitializationPromise = null;
            return null;
          }
        } catch (error) {
          console.error("Exception during user ID fetch:", error);
          this.userInitializationPromise = null;
          return null;
        }
      })();
    }

    const resolvedUserID = await this.userInitializationPromise;

    if (resolvedUserID) {
      this.userID = resolvedUserID; // Ensure instance property is set
      return this.userID;
    } else {
      // Critical failure to obtain User ID
      throw new Error("User ID could not be initialized. Please refresh the page or check network.");
    }
  }

  // Check version compatibility with backend
  private async checkVersionCompatibility(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/version`, {
        headers: {
          'X-Client-Version': this.currentVersion,
        },
      });
      const data: VersionCheckResponse = await response.json();
      
      this.backendVersion = data.version;
      
      if (!data.compatible) { // Backend explicitly says not compatible
        console.warn(`Version mismatch declared by backend. Frontend: ${this.currentVersion}, Backend: ${data.version}, Supported by backend: ${data.supported_versions?.join(', ')}`);
        this.handleVersionMismatch();
        return false;
      }
      // Also check if versions are identical, as per original logic for strict matching
      if (data.version !== this.currentVersion) {
        console.warn(`Version mismatch (versions differ). Frontend: ${this.currentVersion}, Backend: ${data.version}`);
        // Depending on strictness, you might call handleVersionMismatch() here too.
        // For now, we rely on `data.compatible`. If `compatible` is true but versions differ,
        // it implies the backend supports this older/newer client version for now.
        // The original code did call handleVersionMismatch if versions !== currentVersion
        // Let's keep that strictness for now if `compatible` doesn't mean "equal versions"
        // this.handleVersionMismatch(); // Re-evaluate if this is needed if data.compatible is true
      }
      
      return true; // Assuming compatibility if no errors and backend says compatible
    } catch (error) {
      console.error("Version check failed:", error);
      return false; // Assume incompatibility or re-throw if the check itself fails
    }
  }

  // Handle version mismatch by prompting user to refresh
  private handleVersionMismatch(): void {
    // Debounce or ensure this isn't called multiple times in quick succession if possible
    const message = `Version mismatch detected!\n\nYour app version: ${this.currentVersion}\nServer version: ${this.backendVersion || 'Unknown'}\n\nPlease refresh the page to get the latest version.`;
    
    // Avoid multiple confirm dialogs if one is already pending due to this issue
    if (document.body.dataset.versionMismatchPromptActive === 'true') return;
    document.body.dataset.versionMismatchPromptActive = 'true';

    if (confirm(message)) {
      window.location.reload();
    } else {
        // User chose not to refresh. Maybe disable app features or show persistent banner.
        console.warn("User opted not to refresh after version mismatch.");
    }
    // Reset flag after a delay or if user navigates away, to allow future prompts if needed.
    setTimeout(() => { delete document.body.dataset.versionMismatchPromptActive; }, 5000);
  }

  // Ensure version compatibility before making requests
  private async ensureVersionCompatibility(): Promise<boolean> {
    if (this.versionCheckPromise === null) { // Check if promise exists, not its resolved value
      this.versionCheckPromise = this.checkVersionCompatibility();
    }
    
    const isCompatible = await this.versionCheckPromise;
    // If compatibility check failed and backend version is known and different
    if (!isCompatible && this.backendVersion && this.backendVersion !== this.currentVersion) {
        return false; // Explicitly not compatible
    }
    // If backendVersion is not known yet, or it matches, rely on isCompatible
    // Or, if backendVersion is known and matches, but isCompatible was false (e.g. network error during check)
    // this can be tricky. The current logic is: if checkVersionCompatibility returned false, it's false.
    return isCompatible;
  }

  // Generic request handler with version checking and User ID
  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: FormData | object
  ): Promise<APIResponse<T>> {
    let currentUserID: string;
    try {
      // Ensure User ID is available first
      currentUserID = await this.ensureUserID();
    } catch (error: any) {
      console.error("User ID initialization failed before making request:", error);
      return { error: `User ID Error: ${error.message}`, versionMismatch: false };
    }
    
    try {
      // Then, check version compatibility
      const isCompatible = await this.ensureVersionCompatibility();
      if (!isCompatible) {
        // handleVersionMismatch() should have been called by checkVersionCompatibility
        return { 
          error: "Version mismatch - please refresh the page.", 
          versionMismatch: true,
          version: this.backendVersion // Include backend version if known
        };
      }

      const headers: HeadersInit = {
        "X-Client-Version": this.currentVersion,
        "X-User-ID": currentUserID, // Send the obtained User ID
      };

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

      // Check if backend rejected due to version mismatch (e.g., if a request slipped through initial check)
      if (response.status === 409) { // HTTP 409 Conflict
        const errorData = await response.json().catch(() => ({})); // Try to parse JSON, default to empty obj
        this.backendVersion = errorData.backend_version || this.backendVersion; // Update backend version
        console.warn("Backend responded with 409 (Version Mismatch) for request to:", endpoint);
        this.handleVersionMismatch(); // Trigger UI prompt
        return { 
          error: errorData.message || "Version mismatch detected by server.", 
          versionMismatch: true,
          version: this.backendVersion
        };
      }

      if (!response.ok) { // Handle other non-2xx responses
        const errorText = await response.text();
        console.error(`API request to ${endpoint} failed with status ${response.status}: ${errorText}`);
        return { error: `Request failed: ${response.status} ${response.statusText || errorText}` };
      }
      
      // Try to parse JSON, handle cases where response might be empty or not JSON
      const responseText = await response.text();
      if (!responseText) {
          return { data: undefined, version: this.backendVersion }; // Or handle as an error if content was expected
      }

      const data = JSON.parse(responseText);
      
      // Update backend version if provided in a successful response's body
      if (data.version) {
        if (this.backendVersion !== data.version) {
            console.log(`Backend version updated via response from ${endpoint}: ${data.version}`);
            this.backendVersion = data.version;
            // If this new version indicates a mismatch with the client, handle it.
            if (this.backendVersion !== this.currentVersion) {
                // And if the /version endpoint hadn't declared them compatible for this new backendVersion
                // This scenario implies a backend version change *during* a session.
                console.warn("Backend version changed mid-session, re-evaluating compatibility.");
                this.resetVersionCheck(); // Force a re-check on next request
                // Potentially call this.handleVersionMismatch() if strictness requires immediate action
            }
        }
      }
      
      // The actual data might be nested under a 'data' property by some conventions,
      // or be the root object. The original code returned { data: data ... }
      // where 'data' was the full JSON response. Let's stick to that.
      return { data: data, version: data.version || this.backendVersion };

    } catch (error: any) {
      console.error(`Request to ${endpoint} failed:`, error);
      // Check if it's a network error (TypeError often indicates this for fetch)
      if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
         return { error: `Network error: Could not connect to the server at ${this.baseUrl}. Please check your connection.` };
      }
      return { error: `Request failed: ${error.message || 'Unknown error'}` };
    }
  }

  // Public method to manually check version (uses makeRequest)
  async checkVersion(): Promise<APIResponse<VersionCheckResponse>> {
    // This will now also send X-User-ID header due to makeRequest modifications
    return this.makeRequest<VersionCheckResponse>("/version", "GET");
  }

  // Updated transcribeAudio using the generic request handler
  async transcribeAudio(audioBlob: Blob): Promise<APIResponse<{ transcription: string; category?: string }>> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.wav"); // Added filename

    // This will now also send X-User-ID header
    return this.makeRequest<{ transcription: string; category?: string }>("/transcribe", "POST", formData);
  }

  // Get current version and user info
  getVersionInfo() {
    return {
      frontend: this.currentVersion,
      backend: this.backendVersion,
      user: this.userID || "Not yet initialized", // Provide User ID status
      compatible: this.backendVersion === this.currentVersion && this.backendVersion !== null
    };
  }

  // Reset version check (useful for testing or manual refresh)
  resetVersionCheck(): void {
    this.versionCheckPromise = null;
    // this.backendVersion = null; // Optionally reset known backend version
    console.log("Version check has been reset.");
  }

  // Method to reset user ID (for testing or if user wants to "logout" in a simple sense)
  resetUserID(): void {
    this.userID = null;
    this.userInitializationPromise = null;
    localStorage.removeItem("userID");
    console.log("User ID has been reset and removed from local storage.");
  }
}

export default new APIService();