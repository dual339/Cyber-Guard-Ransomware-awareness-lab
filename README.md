# Cyber Guard: Ransomware Awareness Lab

Cyber Guard: Ransomware Awareness Lab is an interactive cybersecurity training platform that simulates ransomware incidents in a safe environment. It features malware analysis, encryption demos, defense guidance, and live attacker-defender drills using React, TypeScript, Node.js, Socket.IO, and Firebase.


## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key.
3. Optional: set `MALWAREBAZAAR_AUTH_KEY` in `.env.local` to enable MD5/SHA256 malware hash lookups.
4. Run the app:
   `npm run dev`

## Deploy To Cloud Run

This app uses an Express server and Socket.IO, so it should be deployed to a Node-capable host such as Google Cloud Run.

1. Build and verify locally:
   `npm run build`
2. Authenticate and select your Google Cloud project:
   `gcloud auth login`
   `gcloud config set project YOUR_PROJECT_ID`
3. Deploy from source:
   `gcloud run deploy cyber-guard-ransomware-awareness-lab --source . --region us-central1 --allow-unauthenticated`
4. Set runtime environment variables after deploy if needed:
   `gcloud run services update cyber-guard-ransomware-awareness-lab --region us-central1 --set-env-vars GEMINI_API_KEY=YOUR_KEY,MALWAREBAZAAR_AUTH_KEY=YOUR_KEY`

Cloud Run will provide the `PORT` environment variable automatically, and the app listens on that port in production.
