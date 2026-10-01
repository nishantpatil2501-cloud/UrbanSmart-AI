# Backend Deployment Setup

This document outlines the deployment configuration for the FastAPI / ChangeFormer backend.

DO NOT commit actual secret values into the codebase.

## Required Environment Variables

- \`GEMINI_API_KEY\`
  The API key for Google Gemini, used for AI-based analysis.
- \`FRONTEND_URL\`
  The URL of the deployed Netlify frontend (e.g., \`https://your-netlify-site.netlify.app\`). This is required to configure CORS correctly.
- \`PORT\`
  The port number to bind the server to (provided automatically by platforms like Render or Heroku; default is \`8000\`).

## Required Files and Models

Make sure the ChangeFormer checkpoint is available in the deployment environment:
- Path: \`ml/models/ChangeFormer_LEVIR/best_ckpt.pt\`
- (Depending on model size, consider using Git LFS or downloading it at build time during deployment).

## Build and Start Commands

### Using Docker (Recommended)

1. **Build the image**:
   \`\`\`bash
   docker build -t urbanwatch-backend .
   \`\`\`
2. **Run the container**:
   \`\`\`bash
   docker run -p 8000:8000 -e GEMINI_API_KEY="your-key" -e FRONTEND_URL="https://your-frontend" urbanwatch-backend
   \`\`\`

### Native Python

1. **Install requirements**:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`
2. **Start the application**:
   \`\`\`bash
   uvicorn ml.api:app --host 0.0.0.0 --port $PORT
   \`\`\`
   *(Or simply run \`python -m ml.api\`)*

## Required Python Version
- Python 3.10+ is recommended.
