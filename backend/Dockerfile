FROM python:3.12-slim

WORKDIR /app

# Install system compilation dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --ignore-requires-python

# Copy backend files into /app/backend to preserve absolute backend.* imports
COPY . ./backend

# Expose PYTHONPATH so backend can be imported as a module
ENV PYTHONPATH=/app

# Bind to 0.0.0.0 and run uvicorn on the environment-assigned port (defaulting to 8000)
CMD ["sh", "-c", "python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
