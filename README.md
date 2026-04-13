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

## GitHub Pages

This repository also includes a GitHub Pages workflow that publishes the static frontend to:

`https://dual339.github.io/Cyber-Guard-Ransomware-awareness-lab/`

GitHub Pages can host the React/Vite frontend, but it cannot run the Express API or Socket.IO server. That means backend-dependent features such as the live room drill and server-side hash lookup need a separate backend host if you want full functionality online.

## Deploy To Render (Free)

This project includes a [render.yaml](C:\CyberGuard\ransomware-awareness-lab\render.yaml) blueprint so it can be deployed as a free Render web service.

1. Push the latest code to GitHub.
2. Open [Render Dashboard](https://dashboard.render.com/).
3. Click `New +` -> `Blueprint`.
4. Connect the GitHub repository:
   `https://github.com/dual339/Cyber-Guard-Ransomware-awareness-lab`
5. Render will detect `render.yaml` and create the service automatically.
6. Add these environment variables in Render if you want the integrations to work:
   `GEMINI_API_KEY`
   `MALWAREBAZAAR_AUTH_KEY`

Notes:
- The free Render plan may sleep after inactivity, so the first request can be slow.
- Render can host the Express app and Socket.IO service, which makes it a better fit for this project than GitHub Pages.
