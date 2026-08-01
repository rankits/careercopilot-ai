// Gemini can be reduced to 768 dimensions and Groq's Nomic embedding model
// emits 768 dimensions, allowing either provider to use the same vector index.
export const JOB_EMBEDDING_DIMENSIONS = 768;
export const JOB_EMBEDDING_DOCUMENT_SCHEMA_VERSION = '1';
export const JOB_EMBEDDING_MAX_SEARCH_LIMIT = 200;
export const JOB_EMBEDDING_DEFAULT_SEARCH_LIMIT = 50;
