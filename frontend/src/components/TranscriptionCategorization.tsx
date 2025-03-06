import React from 'react';

// Accept any type of object as props to be more flexible
interface TranscriptionCategorizationProps {
  categorization: any;
}

const TranscriptionCategorization: React.FC<TranscriptionCategorizationProps> = ({
  categorization
}) => {
  console.log("Categorization Raw Data:", JSON.stringify(categorization, null, 2));
  
  if (!categorization) {
    return <div>No categorization data available</div>;
  }
  
  // Extract the actual categorization data, handling both nested and flat structures
  const catData = categorization.categorization || categorization;
  console.log("Using categorization data:", catData);
  
  // If we don't have the expected fields, show the raw data
  if (!catData || !catData.category) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-100 rounded">
        <p className="font-semibold text-blue-800">Raw Categorization Data:</p>
        <pre className="text-xs overflow-auto max-h-60">{JSON.stringify(categorization, null, 2)}</pre>
      </div>
    );
  }
  
  // Get the color for the category
  const getCategoryColor = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'personal':
        return 'bg-blue-100 text-blue-800';
      case 'professional':
        return 'bg-purple-100 text-purple-800';
      case 'educational':
        return 'bg-green-100 text-green-800';
      case 'entertainment':
        return 'bg-yellow-100 text-yellow-800';
      case 'news':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get the color for the sentiment
  const getSentimentColor = (sentiment: string): string => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      case 'neutral':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-white">
      <h3 className="text-lg font-semibold mb-3">Categorization</h3>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-1">Category:</p>
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(catData.category)}`}>
          {catData.category}
        </span>
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-1">Topics:</p>
        <div className="flex flex-wrap gap-1">
          {catData.topics && Array.isArray(catData.topics) ? 
            catData.topics.map((topic: string, index: number) => (
              <span key={index} className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
                {topic}
              </span>
            )) : 
            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
              No topics available
            </span>
          }
        </div>
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-1">Sentiment:</p>
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(catData.sentiment)}`}>
          {catData.sentiment}
        </span>
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-1">Keywords:</p>
        <div className="flex flex-wrap gap-1">
          {catData.keywords && Array.isArray(catData.keywords) ? 
            catData.keywords.map((keyword: string, index: number) => (
              <span key={index} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                {keyword}
              </span>
            )) : 
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
              No keywords available
            </span>
          }
        </div>
      </div>
      
      <div>
        <p className="text-sm text-gray-600 mb-1">Summary:</p>
        <p className="text-sm">{catData.summary}</p>
      </div>
    </div>
  );
};

export default TranscriptionCategorization;