
interface APIResponse<T> {
  data?: T;
  error?: string;
  serverVersion?: string;
}

class APIService {
  private baseUrl: string =  "http://localhost:8000";
  private clientVersion: string = "1.0.0";
  private userID: string = "1234567890";
  private versionMismatchHandled: boolean = false;

  // Generic request handler
  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: FormData | object
  ): Promise<APIResponse<T>> {
    try {
      const headers: HeadersInit = {
        "X-Client-Version": this.clientVersion,
        "X-User-ID": this.userID,
      };

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
      
      if (response.status === 426 && !this.versionMismatchHandled) {
        this.versionMismatchHandled = true;
        alert(`A new version of the application is available. Click OK to refresh and get the latest updates.`);
        window.location.reload();
        return { error: "New version detected. Refreshing for new version..." };
      }
      if (!response.ok) {
        return { error: `Request failed with status ${response.status}` };
      }
      try {
        const data = await response.json();
        return { data };
      } catch (error) {
        return { error: "Invalid response format from server" };
      }
    } catch (error) {
      return { error: `Request failed: ${error}` };
    }
  }

  // Updated transcribeAudio using the generic request handler
  async transcribeAudio(audioBlob: Blob): Promise<APIResponse<string>> {
    const formData = new FormData();
    formData.append("audio", audioBlob);
    const response = await this.makeRequest<{transcription: string}>("/transcribe", "POST", formData);
    if (response.data && 'transcription' in response.data) {
      return { data: response.data.transcription };
    }
    return { error: response.error || "Failed to transcribe audio" };
  }
}

export default new APIService();
