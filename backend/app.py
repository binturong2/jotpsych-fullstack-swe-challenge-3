from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import random
import uuid
import threading
import logging
import json
import requests
import os
from typing import Dict, Optional, Literal, Any, List, Union
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Implemented version tracking
VERSION = "1.0.0"

# In-memory storage for users
users: Dict[str, Dict[str, Any]] = {}

# Transcription job status enum
class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

# In-memory storage for transcription jobs
transcription_jobs: Dict[str, Dict[str, Any]] = {}


def process_transcription_thread(job_id: str, audio_data: bytes, user_id: Optional[str] = None):
    """Background thread function to process transcription asynchronously."""
    try:
        # Update job status to processing
        transcription_jobs[job_id]["status"] = JobStatus.PROCESSING
        
        # Simulate processing delay for the transcription (first 70% of progress)
        processing_time = random.randint(3, 10)
        for i in range(processing_time):
            time.sleep(1)
            # Update progress (0-70%)
            progress = int((i + 1) / processing_time * 70)
            transcription_jobs[job_id]["progress"] = progress
        
        # Generate random transcription result
        transcription = random.choice([
            "I've always been fascinated by cars, especially classic muscle cars from the 60s and 70s. The raw power and beautiful design of those vehicles is just incredible.",
            "Bald eagles are such majestic creatures. I love watching them soar through the sky and dive down to catch fish. Their white heads against the blue sky is a sight I'll never forget.",
            "Deep sea diving opens up a whole new world of exploration. The mysterious creatures and stunning coral reefs you encounter at those depths are unlike anything else on Earth."
        ])
        
        # Save transcription to job
        transcription_jobs[job_id]["transcription"] = transcription
        transcription_jobs[job_id]["progress"] = 70
        
        # Attempt categorization if user_id is provided (remaining 30% of progress)
        categorization = None
        if user_id:
            logger.info(f"Attempting categorization for job {job_id} by user {user_id}")
            transcription_jobs[job_id]["progress"] = 75
            
            try:
                # Get categorization
                categorization_result = categorize_transcription(transcription, user_id)
                transcription_jobs[job_id]["progress"] = 90
                
                if "error" in categorization_result:
                    logger.warning(f"Categorization error: {categorization_result['error']}")
                    transcription_jobs[job_id]["categorization_error"] = categorization_result["error"]
                else:
                    categorization = categorization_result
                    logger.info(f"Categorization successful for job {job_id}")
            except Exception as cat_error:
                logger.error(f"Error during categorization: {str(cat_error)}")
                transcription_jobs[job_id]["categorization_error"] = str(cat_error)
        
        # Update job with completed result
        transcription_jobs[job_id]["status"] = JobStatus.COMPLETED
        transcription_jobs[job_id]["result"] = transcription
        transcription_jobs[job_id]["categorization"] = categorization
        transcription_jobs[job_id]["progress"] = 100
    except Exception as e:
        # Handle errors
        logger.error(f"Error in transcription job {job_id}: {str(e)}")
        transcription_jobs[job_id]["status"] = JobStatus.FAILED
        transcription_jobs[job_id]["error"] = str(e)
        
def start_transcription_job(audio_data: bytes, user_id: Optional[str] = None) -> str:
    """Creates a new transcription job and starts processing in background thread."""
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    # Create job record
    transcription_jobs[job_id] = {
        "id": job_id,
        "status": JobStatus.PENDING,
        "progress": 0,
        "created_at": time.time(),
        "result": None,
        "error": None,
        "user_id": user_id,
        "transcription": None,
        "categorization": None,
        "categorization_error": None
    }
    
    # Start processing in background thread
    thread = threading.Thread(target=process_transcription_thread, args=(job_id, audio_data, user_id))
    thread.daemon = True  # Thread will terminate when main program exits
    thread.start()
    
    return job_id


def is_valid_json(json_str: str) -> bool:
    """Validates if a string is valid JSON"""
    try:
        json.loads(json_str)
        return True
    except json.JSONDecodeError:
        return False

def extract_json_from_text(text: str) -> Optional[Dict]:
    """Attempts to extract JSON from text that might contain extra content"""
    # Look for JSON-like patterns
    possible_json = ""
    json_start = text.find('{')
    json_end = text.rfind('}')
    
    if json_start >= 0 and json_end > json_start:
        possible_json = text[json_start:json_end+1]
        try:
            return json.loads(possible_json)
        except json.JSONDecodeError:
            pass
    
    # If that fails, try looking for JSON in code blocks
    import re
    json_blocks = re.findall(r'```(?:json)?\s*([\s\S]*?)```', text)
    for block in json_blocks:
        try:
            return json.loads(block)
        except json.JSONDecodeError:
            continue
    
    return None

def categorize_with_anthropic(transcription: str, api_key: str) -> Dict[str, Any]:
    """Categorizes a transcription using Anthropic's Claude API"""
    logger.info("Categorizing with Anthropic Claude")
    
    # Anthropic API endpoint
    api_url = "https://api.anthropic.com/v1/messages"
    
    # Prompt for categorization
    system_prompt = """You are an assistant that analyzes audio transcriptions. 
Your task is to categorize transcriptions based on their content and sentiment.
IMPORTANT: You must respond ONLY with a valid JSON object with the following structure:
{
  "category": "string", 
  "topics": ["string"], 
  "sentiment": "positive|neutral|negative",
  "keywords": ["string"],
  "summary": "string"
}

Category should be one of: "personal", "professional", "educational", "entertainment", "news".
Topics should be 1-3 specific topics mentioned in the transcription.
Keywords should be 3-5 important words from the transcription.
Summary should be a 1-2 sentence summary of the content.

DO NOT include any other text or explanations outside of the JSON response."""
    
    # Build the API request
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    data = {
        "model": "claude-3-haiku-20240307",
        "max_tokens": 1000,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": f"Analyze this transcription: \"{transcription}\""}
        ]
    }
    
    try:
        # Make the API request
        response = requests.post(api_url, headers=headers, json=data)
        response.raise_for_status()
        
        # Process the response
        result = response.json()
        if "content" in result and len(result["content"]) > 0:
            content = result["content"][0]["text"]
            
            # Check if the response is valid JSON
            if is_valid_json(content):
                return {
                    "categorization": json.loads(content),
                    "is_valid_json": True
                }
            else:
                # Try to extract JSON from the response
                extracted_json = extract_json_from_text(content)
                if extracted_json:
                    return {
                        "categorization": extracted_json,
                        "is_valid_json": False,
                        "original_response": content
                    }
                else:
                    return {
                        "error": "Failed to parse JSON from response",
                        "original_response": content,
                        "is_valid_json": False
                    }
        else:
            return {"error": "Empty response from Anthropic API"}
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Error calling Anthropic API: {str(e)}")
        return {"error": f"API request failed: {str(e)}"}
    except json.JSONDecodeError:
        logger.error("Failed to parse API response as JSON")
        return {"error": "Failed to parse API response"}
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {"error": f"Unexpected error: {str(e)}"}

def categorize_transcription(transcription_string: str, user_id: str) -> Dict[str, Any]:
    """Categorizes a transcription using the user's preferred model"""
    # Get the user's preferred model
    model_to_use = get_user_model_from_db(user_id)
    
    # Get user information - create user if it doesn't exist
    if user_id not in users:
        # Create a new user record if it doesn't exist
        users[user_id] = {
            "id": user_id,
            "created_at": time.time(),
            "last_seen": time.time(),
            "anthropic_api_key": None,
            "preferred_model": "anthropic"  # Default to Anthropic
        }
        logger.info(f"Created new user for categorization: {user_id}")
    
    user = users[user_id]
    
    # Check if API key is set
    if not user.get("anthropic_api_key"):
        return {"error": "Please set your Anthropic API key in the API Key form above to enable categorization."}
    
    # Check if model is Anthropic
    if model_to_use == "anthropic":
        # Get API key (should be set at this point)
        api_key = user.get("anthropic_api_key")
        
        # Call Anthropic API
        return categorize_with_anthropic(transcription_string, api_key)
    else:
        # This shouldn't happen now that we've fixed get_user_model_from_db
        return {"error": f"Model '{model_to_use}' is not supported. Only 'anthropic' is supported in this demo."}


def get_user_model_from_db(user_id: str) -> Literal["openai", "anthropic"]:
    """
    Mocks a slow and expensive function to simulate fetching a user's preferred LLM model from database
    Always returns 'anthropic' for this demo as that's the only implemented model.
    """
    time.sleep(random.randint(2, 5))  # Reduced delay time for better user experience
    return "anthropic"  # Always return "anthropic" since that's what we've implemented


@app.route('/user', methods=['POST'])
def create_user():
    # Generate a unique user ID
    user_id = str(uuid.uuid4())
    
    # Create a new user record
    users[user_id] = {
        "id": user_id,
        "created_at": time.time(),
        "last_seen": time.time(),
        "anthropic_api_key": None,
        "preferred_model": "anthropic"  # Default to Anthropic
    }
    
    logger.info(f"New user created: {user_id}")
    
    return jsonify({
        "user_id": user_id,
        "version": VERSION
    })

@app.route('/user/api-key', methods=['POST'])
def set_api_key():
    # Get user ID from headers
    user_id = request.headers.get('X-User-ID')
    
    # Create user if it doesn't exist (instead of returning error)
    if not user_id:
        logger.warning("API key update requested without user ID, generating new ID")
        user_id = str(uuid.uuid4())
    
    if user_id not in users:
        logger.info(f"Creating new user for API key: {user_id}")
        users[user_id] = {
            "id": user_id,
            "created_at": time.time(),
            "last_seen": time.time(),
            "anthropic_api_key": None,
            "preferred_model": "anthropic"  # Default to Anthropic
        }
    
    # Get API key from request
    data = request.json
    if not data or 'api_key' not in data:
        return jsonify({
            "error": "API key is required",
            "version": VERSION
        }), 400
    
    api_key = data['api_key']
    
    # Validate API key format (simple check)
    if not api_key.startswith('sk-'):
        return jsonify({
            "error": "Invalid API key format",
            "version": VERSION
        }), 400
    
    # Store API key
    users[user_id]["anthropic_api_key"] = api_key
    users[user_id]["last_seen"] = time.time()
    
    logger.info(f"API key updated for user: {user_id}")
    
    # Return user ID with response so frontend can update if needed
    return jsonify({
        "status": "success",
        "message": "API key saved successfully",
        "user_id": user_id,
        "version": VERSION
    })

@app.route('/version', methods=['GET'])
def get_version():
    # Log user ID if available
    user_id = request.headers.get('X-User-ID')
    if user_id:
        logger.info(f"Version check from user: {user_id}")
        
        # Update last seen timestamp if user exists
        if user_id in users:
            users[user_id]["last_seen"] = time.time()
    
    return jsonify({
        "version": VERSION
    })

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    # Check frontend version from headers
    frontend_version = request.headers.get('X-Client-Version')
    user_id = request.headers.get('X-User-ID')
    
    # Log the user ID
    if user_id:
        logger.info(f"Transcription request from user: {user_id}")
        
        # Update last seen timestamp if user exists
        if user_id in users:
            users[user_id]["last_seen"] = time.time()
    else:
        logger.warning("Transcription request without user ID")
    
    # Check version compatibility
    if frontend_version != VERSION:
        return jsonify({
            "error": "Version mismatch",
            "version": VERSION,
            "message": "Please refresh your page to update to the latest version."
        }), 409  # Conflict status code
    
    # Get audio data from request (mock in this demo)
    audio_data = "mock_audio_data"
    
    # Start transcription job asynchronously with user ID
    job_id = start_transcription_job(audio_data, user_id)
    
    # Associate job with user if available
    if user_id and user_id in users:
        if "jobs" not in users[user_id]:
            users[user_id]["jobs"] = []
        users[user_id]["jobs"].append(job_id)
    
    # Return job ID immediately
    return jsonify({
        "job_id": job_id,
        "status": JobStatus.PENDING,
        "version": VERSION
    })

@app.route('/transcription/<job_id>', methods=['GET'])
def get_transcription_status(job_id):
    # Check frontend version from headers
    frontend_version = request.headers.get('X-Client-Version')
    user_id = request.headers.get('X-User-ID')
    
    # Log the user ID
    if user_id:
        logger.info(f"Status check for job {job_id} from user: {user_id}")
        
        # Update last seen timestamp if user exists
        if user_id in users:
            users[user_id]["last_seen"] = time.time()
    else:
        logger.warning(f"Status check for job {job_id} without user ID")
    
    # Check version compatibility
    if frontend_version != VERSION:
        return jsonify({
            "error": "Version mismatch",
            "version": VERSION,
            "message": "Please refresh your page to update to the latest version."
        }), 409  # Conflict status code
    
    # Check if job exists
    if job_id not in transcription_jobs:
        logger.warning(f"Job not found: {job_id}")
        return jsonify({
            "error": "Job not found",
            "version": VERSION
        }), 404
    
    # Get job status
    job = transcription_jobs[job_id]
    
    # Return job status
    response = {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "version": VERSION
    }
    
    # Include result if job is completed
    if job["status"] == JobStatus.COMPLETED:
        response["result"] = job["result"]
        
        # Include categorization if available
        if job.get("categorization"):
            # Debug the structure and content of categorization
            cat_json = json.dumps(job["categorization"], indent=2)
            logger.info(f"Sending categorization for job {job_id} (type: {type(job['categorization']).__name__}): {cat_json}")
            
            # Include categorization in response explicitly with direct assignment
            response["categorization"] = job["categorization"]
            
            # Debug response after adding categorization
            response_keys = list(response.keys())
            logger.info(f"Response keys after adding categorization: {response_keys}")
            logger.info(f"Response categorization type: {type(response.get('categorization'))}")
        else:
            logger.info(f"No categorization available for job {job_id}")
        
        # Include categorization error if available
        if job.get("categorization_error"):
            response["categorization_error"] = job["categorization_error"]
            logger.info(f"Categorization error for job {job_id}: {job['categorization_error']}")
        
        logger.info(f"Job {job_id} completed successfully")
    
    # Include error if job failed
    if job["status"] == JobStatus.FAILED:
        response["error"] = job["error"]
        logger.error(f"Job {job_id} failed: {job['error']}")
    
    return jsonify(response)


# Debugging endpoint to check job data
@app.route('/debug/job/<job_id>', methods=['GET'])
def debug_job(job_id):
    if job_id not in transcription_jobs:
        return jsonify({"error": "Job not found"}), 404
    
    # Return complete job data for debugging
    return jsonify({
        "job_data": transcription_jobs[job_id],
        "type_info": {
            "categorization_type": str(type(transcription_jobs[job_id].get("categorization"))),
            "has_nested_cat": "categorization" in transcription_jobs[job_id].get("categorization", {})
        }
    })

# Direct test endpoint for categorization
@app.route('/test/categorization', methods=['GET'])
def test_categorization():
    """Test endpoint that returns sample categorization data"""
    logger.info("Test categorization endpoint called")
    
    # Create sample categorization data
    sample_categorization = {
        "categorization": {
            "category": "test",
            "topics": ["test topic 1", "test topic 2"],
            "sentiment": "positive",
            "keywords": ["test", "keywords", "here"],
            "summary": "This is a test summary for debugging purposes."
        },
        "is_valid_json": True
    }
    
    # Return sample data
    return jsonify({
        "result": "This is test transcription text.",
        "categorization": sample_categorization,
        "status": "completed",
        "progress": 100,
        "job_id": "test-job-id",
        "version": VERSION
    })

# Debugging endpoint to list all jobs
@app.route('/debug/jobs', methods=['GET'])
def debug_list_jobs():
    # Return list of all job IDs
    return jsonify({
        "job_ids": list(transcription_jobs.keys()),
        "job_count": len(transcription_jobs),
        "user_count": len(users)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
