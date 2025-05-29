from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import random
from typing import Dict, Optional, Literal
from functools import wraps
import uuid 
import logging 
import os
import json
import openai
import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from utils import get_user_model_from_db

load_dotenv()

# Environment configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

openai.api_key = OPENAI_API_KEY

app = Flask(__name__)
CORS(app)

# Basic logging configuration
# In debug mode, Flask's default logger is usually sufficient.
# For more control or production, you might configure handlers:
if not app.debug:
    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)
else:
    # Ensure logger level is at least INFO for app.logger.info to show in debug
    app.logger.setLevel(logging.INFO)


# Version tracking
VERSION = "1.0.0"
SUPPORTED_VERSIONS = ["1.0.0"]  # List of supported frontend versions

def log_request_details(f):
    """Decorator to log User-ID and other request details."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = request.headers.get('X-User-ID')
        client_version = request.headers.get('X-Client-Version')
        app.logger.info(
            f"Request: {request.method} {request.path} | "
            f"User-ID: {user_id if user_id else 'N/A'} | "
            f"Client-Version: {client_version if client_version else 'N/A'}"
        )
        return f(*args, **kwargs)
    return decorated_function

def check_version_compatibility(f):
    """Decorator to check version compatibility before processing requests"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_version = request.headers.get('X-Client-Version')
        
        if not client_version:
            app.logger.warning(f"Client version header missing for request to {request.path}")
            return jsonify({
                "error": "Client version header missing",
                "backend_version": VERSION,
                "supported_versions": SUPPORTED_VERSIONS
            }), 400
        
        if client_version not in SUPPORTED_VERSIONS:
            app.logger.warning(
                f"Version mismatch for request to {request.path}: "
                f"Client: {client_version}, Backend: {VERSION}, Supported: {SUPPORTED_VERSIONS}"
            )
            return jsonify({
                "error": "Version mismatch - client version not supported",
                "client_version": client_version,
                "backend_version": VERSION,
                "supported_versions": SUPPORTED_VERSIONS,
                "message": "Please refresh your browser to get the latest version"
            }), 409  # 409 Conflict for version mismatch
        
        return f(*args, **kwargs)
    return decorated_function

def add_version_to_response(response_data: dict) -> dict:
    """Add version information to response"""
    response_data["version"] = VERSION
    return response_data

def process_transcription(job_id: str, audio_data: bytes):
    """Mock function to simulate async transcription processing. Returns a random transcription."""
    time.sleep(random.randint(1, 3)) # Reduced time for quicker testing
    # time.sleep(random.randint(5, 20)) # Original
    return random.choice([
        "I've always been fascinated by cars, especially classic muscle cars from the 60s and 70s. The raw power and beautiful design of those vehicles is just incredible.",
        "Bald eagles are such majestic creatures. I love watching them soar through the sky and dive down to catch fish. Their white heads against the blue sky is a sight I'll never forget.",
        "Deep sea diving opens up a whole new world of exploration. The mysterious creatures and stunning coral reefs you encounter at those depths are unlike anything else on Earth."
    ])

class TranscriptionRequest(BaseModel):
    user_id: str
    transcription: str

class CategorizationResponse(BaseModel):
    category: str
    confidence: float

@app.post("/categorize_transcription", response_model=CategorizationResponse)
def categorize_transcription(request: TranscriptionRequest):
    user_model_pref = get_user_model_from_db(request.user_id)

    prompt = (
        """
        You are an AI assistant tasked with categorizing the following transcription.
        Return the result in the following JSON format:
        {
            \"category\": \"category_label\",
            \"confidence\": float (between 0 and 1)
        }

        Transcription:
        """ + request.transcription + """

        Only respond with the JSON object.
        """
    )

    try:
        if user_model_pref == "anthropic":
            # Placeholder - not called, but implemented for extensibility
            client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            response = client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=200,
                temperature=0.3,
                system="You are a helpful categorization assistant.",
                messages=[{"role": "user", "content": prompt}]
            )
            raw_output = response.content[0].text

        else:  # default to OpenAI
            completion = openai.ChatCompletion.create(
                model="gpt-4",
                temperature=0.3,
                messages=[
                    {"role": "system", "content": "You are a helpful categorization assistant."},
                    {"role": "user", "content": prompt},
                ]
            )
            raw_output = completion.choices[0].message.content

        # Attempt to parse and validate JSON output
        parsed = json.loads(raw_output)

        if not ("category" in parsed and "confidence" in parsed):
            raise ValueError("Missing expected keys in response.")
        if not isinstance(parsed["confidence"], (float, int)) or not (0 <= parsed["confidence"] <= 1):
            raise ValueError("Confidence must be a float between 0 and 1.")

        return parsed

    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse model output: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


def get_user_model_from_db(user_id: str) -> Literal["openai", "anthropic"]:
    """
    Mocks a slow and expensive function to simulate fetching a user's preferred LLM model from database
    Returns either 'openai' or 'anthropic' after a random delay.
    """
    app.logger.info(f"Fetching LLM preference for user: {user_id} (mocked)")
    time.sleep(random.randint(1, 2)) # Reduced time
    # time.sleep(random.randint(2, 8)) # Original
    return random.choice(["openai", "anthropic"])

@app.route('/user/id', methods=['GET'])
@log_request_details # Log details for this request as well
def get_new_user_id():
    """Endpoint to generate a new unique user ID."""
    user_id = str(uuid.uuid4())
    app.logger.info(f"Generated new user ID: {user_id}")
    return jsonify(add_version_to_response({"user_id": user_id}))

@app.route('/version', methods=['GET'])
@log_request_details # Apply logger first
def get_version():
    """Endpoint to check version compatibility"""
    client_version = request.headers.get('X-Client-Version')
    
    response_payload = {
        "version": VERSION,
        "supported_versions": SUPPORTED_VERSIONS,
        "compatible": client_version in SUPPORTED_VERSIONS if client_version else False
    }
    
    if client_version:
        response_payload["client_version"] = client_version
    
    return jsonify(response_payload) # add_version_to_response not strictly needed as payload already has version

@app.route('/transcribe', methods=['POST'])
@log_request_details 
@check_version_compatibility # Then check version
def transcribe_audio():
    """Transcribe audio with version checking and user ID logging"""
    user_id = request.headers.get('X-User-ID') # Already used for categorize_transcription
    
    if not user_id:
        app.logger.warning("X-User-ID header missing in /transcribe request.")
        # Decide if this is a hard error or if 'default_user' is acceptable.
        # For this simple system, we'll proceed but log it.
        user_id = 'default_user_if_missing_header'


    # Process transcription
    # Note: actual audio data isn't used from request.files['audio'] in this mock
    audio_file = request.files.get('audio')
    if not audio_file:
        return jsonify({"error": "No audio file provided"}), 400
        
    # Mocking audio data processing; in a real app, you'd use audio_file.read()
    result = process_transcription(str(uuid.uuid4()), b"mock_audio_data")

    # TODO: Implement categorization and use the actual user_id
    # categorize_transcription(result, user_id) # Uncomment when ready

    response_data = {
        "transcription": result,
        # TODO: Add category when implemented
    }
    
    return jsonify(add_version_to_response(response_data))

@app.route('/health', methods=['GET'])
@log_request_details 
def health_check():
    """Health check endpoint with version info"""
    return jsonify(add_version_to_response({
        "status": "healthy",
        "timestamp": time.time()
    }))

@app.errorhandler(409)
def handle_version_mismatch(error):
    """Custom error handler for version mismatches (HTTP 409)"""
    # This is already triggered by check_version_compatibility
    # Logging here would be redundant if log_request_details is used on the route.
    # However, we can ensure the response format is consistent.
    response_payload = error.description if isinstance(error.description, dict) else {
        "error": "Version mismatch",
        "message": "Please refresh your browser to get the latest version"
    }
    if "backend_version" not in response_payload:
        response_payload["backend_version"] = VERSION
    if "supported_versions" not in response_payload:
        response_payload["supported_versions"] = SUPPORTED_VERSIONS
        
    return jsonify(response_payload), 409

@app.errorhandler(400)
def handle_bad_request(error):
    """Custom error handler for bad requests (HTTP 400)"""
    response_payload = error.description if isinstance(error.description, dict) else {
        "error": "Bad Request",
        "message": str(error.description) if error.description else "The browser (or proxy) sent a request that this server could not understand."
    }
    if "backend_version" not in response_payload: # Add version info for consistency
        response_payload["backend_version"] = VERSION
    return jsonify(response_payload), 400


if __name__ == '__main__':
    print(f"Starting server with version {VERSION}")
    print(f"Supported client versions: {SUPPORTED_VERSIONS}")
    app.run(host='0.0.0.0', port=8000, debug=True)