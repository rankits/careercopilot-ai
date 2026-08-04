"""Career Copilot local embedding HTTP service.

OpenAI-compatible /v1/embeddings endpoint for the backend local-http provider.
Produces 768-d vectors to match pgvector (JOB_EMBEDDING_DIMENSIONS).
"""

from __future__ import annotations

import os
import threading
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

EMBEDDING_MODEL = os.environ.get(
    "EMBEDDING_MODEL", "sentence-transformers/all-mpnet-base-v2"
)
EMBEDDING_DIMENSIONS = int(os.environ.get("EMBEDDING_DIMENSIONS", "768"))
EMBEDDING_SERVICE_PORT = int(os.environ.get("EMBEDDING_SERVICE_PORT", "8080"))
EMBEDDING_MODEL_CACHE = os.environ.get("EMBEDDING_MODEL_CACHE", "/models")
EMBEDDING_MAX_BATCH_SIZE = int(os.environ.get("EMBEDDING_MAX_BATCH_SIZE", "32"))
HOST = os.environ.get("EMBEDDING_HOST", "0.0.0.0")

app = FastAPI(title="Career Copilot Embedding Service", version="1.0.0")

_model = None
_model_dimensions: int | None = None
_ready = False
_load_error: str | None = None
_load_lock = threading.Lock()


class EmbeddingRequest(BaseModel):
    input: str | list[str]
    model: str | None = None
    encoding_format: str | None = Field(default="float")


def _normalize_inputs(value: str | list[str]) -> list[str]:
    if isinstance(value, str):
        texts = [value]
    else:
        texts = list(value)
    if not texts:
        raise HTTPException(status_code=422, detail="input must not be empty")
    if len(texts) > EMBEDDING_MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=422,
            detail=f"batch size {len(texts)} exceeds EMBEDDING_MAX_BATCH_SIZE={EMBEDDING_MAX_BATCH_SIZE}",
        )
    normalized: list[str] = []
    for text in texts:
        trimmed = text.strip()
        if not trimmed:
            raise HTTPException(status_code=422, detail="embedding input cannot be empty")
        normalized.append(trimmed)
    return normalized


def load_model() -> None:
    global _model, _model_dimensions, _ready, _load_error
    with _load_lock:
        if _ready:
            return
        try:
            from sentence_transformers import SentenceTransformer

            os.makedirs(EMBEDDING_MODEL_CACHE, exist_ok=True)
            model = SentenceTransformer(
                EMBEDDING_MODEL,
                cache_folder=EMBEDDING_MODEL_CACHE,
            )
            dimensions = int(model.get_sentence_embedding_dimension())
            if dimensions != EMBEDDING_DIMENSIONS:
                raise RuntimeError(
                    f"Model {EMBEDDING_MODEL} produces {dimensions}-d vectors; "
                    f"expected EMBEDDING_DIMENSIONS={EMBEDDING_DIMENSIONS}"
                )
            _model = model
            _model_dimensions = dimensions
            _ready = True
            _load_error = None
        except Exception as exc:  # noqa: BLE001 - surface load failures via /health
            _model = None
            _model_dimensions = None
            _ready = False
            _load_error = str(exc)
            raise


@app.on_event("startup")
def on_startup() -> None:
    load_model()


@app.get("/health")
def health() -> JSONResponse:
    if _ready and _model is not None:
        return JSONResponse(
            {
                "status": "ok",
                "model": EMBEDDING_MODEL,
                "dimensions": _model_dimensions,
            }
        )
    payload: dict[str, Any] = {
        "status": "starting" if _load_error is None else "error",
        "model": EMBEDDING_MODEL,
        "dimensions": EMBEDDING_DIMENSIONS,
    }
    if _load_error:
        payload["error"] = _load_error
    return JSONResponse(payload, status_code=503)


@app.post("/v1/embeddings")
def create_embeddings(body: EmbeddingRequest) -> dict[str, Any]:
    if not _ready or _model is None or _model_dimensions is None:
        raise HTTPException(status_code=503, detail="embedding model is not ready")

    texts = _normalize_inputs(body.input)
    vectors = _model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    data = []
    for index, vector in enumerate(vectors):
        values = [float(value) for value in vector.tolist()]
        if len(values) != _model_dimensions:
            raise HTTPException(
                status_code=500,
                detail=f"unexpected embedding length {len(values)}",
            )
        data.append(
            {
                "object": "embedding",
                "index": index,
                "embedding": values,
            }
        )

    return {
        "object": "list",
        "data": data,
        "model": body.model or EMBEDDING_MODEL,
        "usage": {
            "prompt_tokens": 0,
            "total_tokens": 0,
        },
    }


def main() -> None:
    uvicorn.run(
        "app:app",
        host=HOST,
        port=EMBEDDING_SERVICE_PORT,
        log_level=os.environ.get("EMBEDDING_LOG_LEVEL", "info"),
        workers=1,
    )


if __name__ == "__main__":
    main()
