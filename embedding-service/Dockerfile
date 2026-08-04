# Career Copilot embedding HTTP service (CPU)
# OpenAI-compatible /v1/embeddings — 768-d vectors for pgvector.

FROM python:3.11-slim-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    EMBEDDING_SERVICE_PORT=8080 \
    EMBEDDING_MODEL=sentence-transformers/all-mpnet-base-v2 \
    EMBEDDING_DIMENSIONS=768 \
    EMBEDDING_MODEL_CACHE=/models \
    EMBEDDING_MAX_BATCH_SIZE=32 \
    HF_HOME=/models/huggingface \
    TRANSFORMERS_CACHE=/models/transformers \
    SENTENCE_TRANSFORMERS_HOME=/models/sentence-transformers

COPY requirements.txt .
RUN pip install --no-cache-dir \
  --extra-index-url https://download.pytorch.org/whl/cpu \
  -r requirements.txt

COPY app.py .

RUN mkdir -p /models \
  && useradd --create-home --uid 10001 appuser \
  && chown -R appuser:appuser /app /models

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD curl -f http://127.0.0.1:8080/health || exit 1

CMD ["python", "app.py"]
