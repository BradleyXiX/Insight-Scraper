# 1. Use the official Microsoft image that already has Python and Browser dependencies
FROM mcr.microsoft.com/playwright/python:v1.58.0-jammy

# 2. Set the working directory
WORKDIR /app

# 3. Copy only the requirements first to take advantage of Docker caching
COPY app/requirements.txt .

# 4. Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of your application code
COPY app/ .

# 6. Streamlit runs on port 8501 by default
EXPOSE 8501

# 7. Start the Dashboard
CMD ["streamlit", "run", "dashboard.py", "--server.port=8501", "--server.address=0.0.0.0"]