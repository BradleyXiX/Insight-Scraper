# 1. Use the official Microsoft image that already has Python and Browser dependencies
FROM mcr.microsoft.com/playwright/python:v1.49.0-jammy

# 2. Set the working directory
WORKDIR /app

# 3. Copy only the requirements first to take advantage of Docker caching
COPY src/requirements.txt .

# 4. Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of your application code
COPY src/ .

# 6. Expose the FastAPI port
EXPOSE 8000

# 7. Start the FastAPI server using Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]