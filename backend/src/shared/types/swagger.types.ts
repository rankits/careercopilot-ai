/**
 * Minimal typing for the hand-written OpenAPI 3.0 fragments produced by
 * `shared/swagger/factory.ts`. Deliberately loose (`Record<string, unknown>`
 * for raw JSON-Schema-ish bodies) rather than a full OpenAPI type package -
 * the factory only ever proxies these into swagger-ui-express, which
 * doesn't validate them at the type level either.
 */

export interface PathParameter {
  name: string;
  in: "path";
  required: true;
  schema: Record<string, unknown>;
  description?: string;
}

export interface QueryParameter {
  name: string;
  in: "query";
  required?: boolean;
  schema: Record<string, unknown>;
  description?: string;
}

export interface ResponseConfig {
  description: string;
  schema?: Record<string, unknown>;
  headers?: Record<string, unknown>;
}

/** Keyed by HTTP status code, e.g. `{ 200: {...}, 401: {...} }`. */
export type ApiResponses = Record<number, ResponseConfig>;

export interface RequestBodyConfig {
  required?: string[];
  properties: Record<string, unknown>;
}

/** Config for POST/PUT/PATCH/DELETE-with-body endpoints. */
export interface AuthApiConfig {
  summary: string;
  description?: string;
  body?: RequestBodyConfig;
  params?: PathParameter[];
  responses: ApiResponses;
}

/** Config for GET (and other body-less) endpoints. */
export interface AuthGetApiConfig {
  summary: string;
  description?: string;
  params?: PathParameter[];
  queryParams?: QueryParameter[];
  responses: ApiResponses;
}
