FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for opencv, gdal etc. if needed
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code and models
COPY ml/ ./ml/

# Expose port (default 8000, can be overridden by $PORT)
ENV PORT=8000
EXPOSE 8000

# Start FastAPI
CMD sh -c "uvicorn ml.api:app --host 0.0.0.0 --port ${PORT:-8000}"
