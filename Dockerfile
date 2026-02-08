# Combined Dockerfile for Railway deployment
FROM python:3.12-slim

WORKDIR /app

# Install system deps + Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy everything first (needed for hatchling to find packages)
COPY . .

# Install Python deps
RUN pip install --no-cache-dir .

# Build frontend
RUN cd frontend && npm ci && npm run build

# Create data directory
RUN mkdir -p data

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
