THIS IS THE MOST IMPORTANT FILE IN THE ENTIRE REPO! HUMAN WRITING ONLY! NO AI ALLOWED!!
This was fun! Unfortunately, I did not have time to complete everything.

Things Left to do:
- Implement Parallel Processing
- Fix tailwind config. Updated to v4 for now, but didn't have to fix everythig and makes sure everything was smooth. Also wanted to add some nice loaders.

Things I would love to fix:
- Better code structure (especially if we want pure functions and composable UIs). This will also allow us to test everything better
- Refactor the Api Client. It is doing too much right. Can benefit from seperate services/utils.
- Add retry logic and global error handling (right now i just have a global function using console.error)

Brain Dump:
For the parallel processing, the first thing I would need to do is to creating a caching key between the user and the actual transcription call (we can call them a job or task for now). We should also have a way to cache all these jobs. For now we can just have a global map var, but in production, probably use something like redis here. We would also need a way to queue these jobs. Not sure how python does it exactly, but we can have some form of background task or queue to handle all these tasks async. The Front end can then poll for these changes as they stream in and display them in the UI. We can make the UI richer by having various states to each these (think of a state machine "started-> in progess/processing -> postProcessing -> done" etc), and according to each state we change up the look and feel.

We can also implement actual text to speech here as well to read the transcript back to the user.

I also want to implement an actual state management flow for the FE with debouncing/throttling for the APIs as well. 
We can go a step further in processing here as well, by 
Note: See .env.example for how to add your LLM key. I used anthropic for this exercise.