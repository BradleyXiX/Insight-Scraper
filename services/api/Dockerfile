# 1. Use the official Microsoft image that already has Python and Browser dependencies
FROM mcr.microsoft.com/playwright/python:v1.49.0-jammy

# 2. Set the working directory
WORKDIR /app

# 3. Environment & Memory optimizations for containerized Playwright & Python
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    NODE_OPTIONS="--max-old-space-size=256"

# 4. Copy only the requirements first to take advantage of Docker caching
COPY src/requirements.txt .

# 5. Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy the rest of your application code
COPY src/ .

# 7. Expose the FastAPI port
EXPOSE 8000

# 8. Run database migrations/init and start FastAPI with dynamic PORT support for Render and Docker
CMD ["sh", "-c", "python init_db.py && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
