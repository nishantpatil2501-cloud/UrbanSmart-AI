import sys
import re

with open('ml/api.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add CORSMiddleware
if 'CORSMiddleware' not in content:
    content = content.replace('from fastapi import FastAPI, File, UploadFile, HTTPException, Response', 'from fastapi import FastAPI, File, UploadFile, HTTPException, Response\nfrom fastapi.middleware.cors import CORSMiddleware')
    
    app_decl = 'app = FastAPI('
    app_cors = '''app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)'''
    # Find the app = FastAPI(...) definition and insert CORS after it
    # Need to be careful about the multiline app definition
    content = re.sub(r'(app = FastAPI\([\s\S]*?\))', r'\1\n' + app_cors, content)

with open('ml/api.py', 'w', encoding='utf-8') as f:
    f.write(content)
