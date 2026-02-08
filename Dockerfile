# Combined Dockerfile for Railway deployment
# Serves both FastAPI backend and Next.js frontend

FROM python:3.12-slim AS backend-build

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Copy Python deps and install
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

# Copy frontend and build
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci

COPY frontend/ frontend/
RUN cd frontend && npm run build

# Copy backend
COPY . .

# Create data directory
RUN mkdir -p data

# Expose port
EXPOSE 8000

# Start command - serves backend API
# Frontend is built as static files
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
