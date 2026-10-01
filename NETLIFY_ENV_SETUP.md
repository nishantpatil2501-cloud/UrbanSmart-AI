# Netlify Environment Setup

To deploy the frontend to Netlify, configure the following Environment Variables in the Netlify dashboard (Site settings > Environment variables).

DO NOT commit actual secret values into the codebase.

## Required Variables

- `VITE_SUPABASE_URL`
  The public URL for your Supabase instance.
- `VITE_SUPABASE_ANON_KEY`
  The anonymous, client-safe API key for your Supabase instance.
- `VITE_ML_API_URL`
  The URL of your deployed production FastAPI backend (e.g., `https://your-fastapi-backend.onrender.com`).
