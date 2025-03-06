export interface Categorization {
  categorization: {
    category: string;
    topics: string[];
    sentiment: "positive" | "neutral" | "negative";
    keywords: string[];
    summary: string;
  };
  is_valid_json: boolean;
  original_response?: string;
}