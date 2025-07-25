import hashlib
import json
import os
import random
from functools import wraps
from typing import Literal

from dotenv import load_dotenv
from flask import Flask, jsonify, make_response, request
from flask_cors import CORS

load_dotenv()
app = Flask(__name__)
CORS(app, expose_headers=['X-Server-Version'])

VERSION = "1.0.0"

transcription_cache = {}
user_model_cache = {}
categorization_cache = {}

def parse_version(version_string):
    try:
        parts = version_string.split('.')
        return {
            'major': int(parts[0]),
            'minor': int(parts[1]),
            'patch': int(parts[2])
        }
    except (ValueError, IndexError):
        return None

def is_version_compatible(client_version, server_version):
    client = parse_version(client_version)
    server = parse_version(server_version)
    
    if not client or not server:
        return False
    
    return client['major'] == server['major']

def version_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_version = request.headers.get('X-Client-Version')
        user_id = request.headers.get('X-User-ID')
        print(f"Request to {request.path} - User ID: {user_id}, Client Version: {client_version}")
        
        if not client_version:
            response = make_response(jsonify({
                'error': 'Version header missing',
                'message': 'X-Client-Version header is required'
            }), 400)
            response.headers['X-Server-Version'] = VERSION
            return response
        
        if not user_id:
            response = make_response(jsonify({
                'error': 'User ID header missing',
                'message': 'X-User-ID header is required'
            }), 400)
            response.headers['X-Server-Version'] = VERSION
            return response
        
        if not is_version_compatible(client_version, VERSION):
            response = make_response(jsonify({
                'error': 'Version mismatch',
                'message': f'Client version {client_version} is incompatible with server version {VERSION}. Please refresh your browser.',
                'serverVersion': VERSION,
                'clientVersion': client_version
            }), 426)  # https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/426
            response.headers['X-Server-Version'] = VERSION
            return response
        
        response = make_response(f(*args, **kwargs))
        response.headers['X-Server-Version'] = VERSION
        return response
    
    return decorated_function


def process_transcription(job_id: str, audio_data: bytes):
    """Mock function to simulate async transcription processing. Returns a random transcription."""
    audio_hash = hashlib.md5(audio_data).hexdigest()
    if audio_hash in transcription_cache:
        print(f"Cache hit for transcription: {audio_hash}")
        return transcription_cache[audio_hash]
    
    transcription = random.choice([
        "I've always been fascinated by cars, especially classic muscle cars from the 60s and 70s. The raw power and beautiful design of those vehicles is just incredible.",
        "Bald eagles are such majestic creatures. I love watching them soar through the sky and dive down to catch fish. Their white heads against the blue sky is a sight I'll never forget.",
        "Deep sea diving opens up a whole new world of exploration. The mysterious creatures and stunning coral reefs you encounter at those depths are unlike anything else on Earth."
    ])
    
    transcription_cache[audio_hash] = transcription
    print(f"Cached transcription: {audio_hash}")
    
    return transcription


def categorize_transcription(transcription_string: str, user_id: str):
    model_to_use = get_user_model_from_db(user_id)

    cache_key = hashlib.md5(f"{transcription_string}:{model_to_use}".encode()).hexdigest()
    if cache_key in categorization_cache:
        print(f"Cache hit for categorization: {cache_key}")
        return categorization_cache[cache_key]
    
    result = None
    
    if model_to_use == "openai":
        print(f"User {user_id} has OpenAI preference, skipping categorization")
        result = {
            "category": None,
            "keywords": [],
            "confidence": 0,
            "model": "openai_skipped"
        }
        
    elif model_to_use == "anthropic":
        anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        if not anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured")

        prompt = f"""You are analyzing transcribed text from audio recordings captured by users through a web application. 

Users press a "Start Recording" button and speak into their microphone for up to 10 seconds. The audio is then converted to text using speech-to-text technology, and now you need to categorize what the user was talking about.

Your task is to analyze the transcribed speech and determine:
1. The main topic/category of what the person was discussing
2. Key words or phrases that helped you identify the topic
3. Your confidence level in the categorization

Please categorize the transcription into one of these predefined categories:
- automotive (cars, vehicles, driving, motorcycles, transportation)
- nature (animals, plants, environment, weather, outdoors)
- sports (athletics, games, exercise, teams, competitions)
- technology (computers, software, gadgets, innovation, digital)
- travel (trips, destinations, tourism, exploration, vacations)
- food (cooking, restaurants, recipes, cuisine, dining)
- other (anything that doesn't fit the above categories)

Here is the transcribed speech to analyze:
"{transcription_string}"

Please respond with ONLY valid JSON in this exact format:
{{
    "category": "one of the categories listed above",
    "keywords": ["list", "of", "3-5", "relevant", "keywords", "from", "the", "text"],
    "confidence": 0.85
}}

The confidence should be a decimal between 0 and 1, where:
- 0.9-1.0 = Very confident (clear topic with multiple relevant keywords)
- 0.7-0.89 = Moderately confident (topic is apparent but not overwhelmingly clear)
- 0.5-0.69 = Somewhat confident (topic is ambiguous or spans multiple categories)
- Below 0.5 = Low confidence (unclear or no discernible topic)

JSON Response:"""
        
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=anthropic_api_key)
            
            response = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=200,
                temperature=0,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = response.content[0].text
            try:
                result = json.loads(response_text)
                result["model"] = "anthropic"
            except json.JSONDecodeError:
                result = {"category": "other", "keywords": [], "confidence": 0.5, "error": "Invalid JSON response", "model": "anthropic"}
        except Exception as e:
            print(f"Error calling Anthropic API: {e}")
            raise

    if result:
        categorization_cache[cache_key] = result
        print(f"Cached categorization: {cache_key}")
    
    return result


def get_user_model_from_db(user_id: str) -> Literal["openai", "anthropic"]:
    """
    Mocks a slow and expensive function to simulate fetching a user's preferred LLM model from database
    Returns either 'openai' or 'anthropic' after a random delay.
    """
    if user_id in user_model_cache:
        print(f"Cache hit for user model preference: {user_id}")
        return user_model_cache[user_id]

    model = random.choice(["anthropic"])
    user_model_cache[user_id] = model
    print(f"Cached user model preference: {user_id} -> {model}")
    
    return model


@app.route('/transcribe', methods=['POST'])
@version_required
def transcribe_audio():
    user_id = request.headers.get('X-User-ID')
    audio_file = request.files.get('audio')
    if not audio_file:
        return jsonify({"error": "No audio file provided"}), 400
    audio_data = audio_file.read()
    transcription = process_transcription("xyz", audio_data)
    categorization = categorize_transcription(transcription, user_id)

    return jsonify({
        "transcription": transcription,
        "category": categorization.get("category", "other"),
        "keywords": categorization.get("keywords", []),
        "confidence": categorization.get("confidence", 0.5),
        "model_used": categorization.get("model", "unknown")
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
