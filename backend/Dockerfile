FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create user with UID 1000 per Hugging Face Spaces requirements
RUN useradd -m -u 1000 user

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure media and model directories exist and are owned by user 1000
RUN mkdir -p /app/media/resumes /app/media/reports /app/media/answers /app/nlp_service/model_registry && \
    chown -R user:user /app

USER user

# Run dataset generator & baseline training on build as user
RUN python nlp_service/dataset_generator.py && python nlp_service/train.py

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
