THIS IS THE MOST IMPORTANT FILE IN THE ENTIRE REPO! HUMAN WRITING ONLY! NO AI ALLOWED!!

# Install

On `npm install` saw:
```bash
added 171 packages, and audited 172 packages in 7s

36 packages are looking for funding
  run `npm fund` for details

2 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
```

For now I'm going skip the fixes to avoid breaking the app with the upgrades. This is something I'll return to time permitting.

Similarly with the backend: "WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead." 
This is something we will address later.

I'm going to start by working my way through the bugs, keeping track of time. For the frontend components I will rely heavily on LLMs (mostly Claude and Gemini) to help quickly diagnose and fix the issues. Also as an initial step I will add a `.gitignore` to make tracking changes more manageable.

Overall my approach is to first get it working and then come back and iterate. As a final step we would also want to add unit and integration testing.

## 1. Recording State Bug

The main issue here is that `recordingTime` is not being updated. There were a couple other updates made here:
- Added the `mediaRecorder` dependency so that we have access to the current media recorder when we call `stopRecording()`
- Fixed the countdown display by removing the hardcoded `5`, replacing it with `MAX_RECORDING_TIME`.
- Auto stopping logic was updated so that it stops after 10 seconds

Tested the updates to `AudioRecorder.tsx` in the application and it looks better now.

## 2. Loading State

Here we added a few basic features to the frontend in `AudioRecorder.tsx` and updated it to use `APIService.ts`

- `isTranscribing` is now used to track when transcription is in progress. It starts when recording ends and transcription begins and ends when transcription completes.
- Integrated `APIService` with try/finally to ensure the loading state always ends.

Other things to add here time permitting:
- Error state display to user in case of failures
- Progress indicator for the transcription
- Timeout handling for longer running transcriptions
- Retry logic for failed transcriptions

## 3. Version Compatibility System

In the backend I added a function `check_version_compatibility` to check compatibility with a couple global variables for `VERSION` the current or expected version along with `SUPPORTED_VERSIONS` in case there would be fallback or alternative options.
I also added an endpoint to check the version for compatiblity.

In the frontend a compatibility check was also added along with a message to the user in case of mismatches. `checkVersionCompatibility` was added (in APIService) to handle version compatibility checks with the backend Flask app.

## 4. Parallel Processing

I couldn't quite get this working properly so I decided to skip it for now and come back to it. The main idea was to use `asyncio` in the backend and update the `/transcribe` endpoint to pick up pending jobs from the queue, assign/track job IDs and then run them through `process_transcription`. Then we would also need to track job statuses and worker availability.

In production I would likely use something like AWS SQS (there are alternatives, but this is the one I'm familiar with) to handle the parallel requests/processing. Persistent storage for user IDs and job request IDs could be done in something like PostgreSQL or Redshift. Given the light compute requirements (especially if the heavy compute was done via API calls), lambda may be a good option to handle the backend component.

## 5. User Identity

Updated `app.py` and `APIService.ts` to generate a user ID on the first API call if there isn't currently one. Then store this ID locally. This ID is also sent to the frontend via `APIService.ts` with each request using the `X-User-ID` header. The backend will log this in requests to our endpoints. I reran and can see this showing up in the logs.

## 6. Transcription Categorization

I started running out of time here, but I created a mock categorization endpoint (`/categorize_transcription`). This is the most interesting part to me. If I had this to do over again I would have spent more time here. 

For the API keys, you would store them in `.env` and make sure this is in your `.gitignore`!! And your `.env` would be like the following:
```yaml
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

To ensure the formatting there is a very simple `parsed = json.loads(raw_output)`, but what I have found to be much more useful is to provide a few in-context examples with the expected JSON formatting. Also models that have been fine tuned for function calling can do really well here. pydantic would be another useful library here.

If you had a list of classes for the categorization then if the list of classes is small then you could just feed them into the context, if it was long you could use RAG to feed them in. If you had a large amount of categorized data, then you could train a model here. As is the conifdence number coming from the LLM is not going to be reliable, but would be from a trained model.

Depending on the need, one other cool thing I would likely add to this application is speech pause detection so that the transcriptions would seem to happen in real time, however it would be chunked for pauses in the audio recording.