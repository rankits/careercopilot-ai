import type {
  ApiResponses,
  AuthApiConfig,
  AuthGetApiConfig,
  PathParameter,
  QueryParameter,
} from "../types/swagger.types.js";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/**
 * Documents this API's actual success envelope (see
 * `shared/utils/response.ts#successResponse`): `{ status, message, data? }`.
 * `extra` merges additional top-level fields some endpoints return
 * alongside the envelope (e.g. auth's `accessToken` /
 * `accessTokenExpiresInSeconds`, sent outside `data` by the controllers).
 */
export const successSchema = (
  message: string,
  data?: Record<string, unknown>,
  extra?: Record<string, unknown>,
) => ({
  type: "object",
  properties: {
    status: { type: "string", example: "success" },
    message: { type: "string", example: message },
    ...(data && {
      data:
        data.type && typeof data.type === "string"
          ? data
          : {
              type: "object",
              properties: data,
            },
    }),
    ...extra,
  },
});

/**
 * Documents this API's actual error envelope (see
 * `shared/utils/response.ts#errorResponse` and `shared/middlewares/errorHandler.ts`):
 * `{ status: "error", message, code? }`.
 */
export const errorSchema = (message: string, code?: string) => ({
  type: "object",
  properties: {
    status: { type: "string", example: "error" },
    message: { type: "string", example: message },
    ...(code && { code: { type: "string", example: code } }),
  },
});

/** Builds the OpenAPI `responses` object from our shorthand `ApiResponses` config. */
const buildResponses = (responses: ApiResponses): Record<string, unknown> => {
  return Object.entries(responses).reduce(
    (acc, [status, response]) => {
      acc[status] = {
        description: response.description,
        ...(response.schema && {
          content: {
            "application/json": {
              schema: response.schema,
            },
          },
        }),
        ...(response.headers && { headers: response.headers }),
      };
      return acc;
    },
    {} as Record<string, unknown>,
  );
};

/** Builds the OpenAPI `requestBody` object (POST / PUT / PATCH) from our shorthand config. */
const buildRequestBody = (body?: AuthApiConfig["body"]) => {
  if (!body) return undefined;

  return {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          ...(body.required && { required: body.required }),
          properties: body.properties,
        },
      },
    },
  };
};

/** Merges path + query parameters into the single OpenAPI `parameters` array. */
const buildParameters = (params?: PathParameter[], queryParams?: QueryParameter[]) => {
  const allParams = [...(params || []), ...(queryParams || [])];
  return allParams.length ? allParams : undefined;
};

const buildSecurity = (secure: boolean) => (secure ? [{ BearerAuth: [] }] : undefined);

/** Keeps only the path parameters that actually appear as `{name}` in this specific path string. */
const filterParamsForPath = (path: string, params?: PathParameter[]) => {
  if (!params) return undefined;
  return params.filter((p) => path.includes(`{${p.name}}`));
};

/**
 * Base factory: builds a single path/method's OpenAPI operation object from
 * our shorthand config, for one or more path strings that share it (e.g. a
 * resource nested under two different parent routes).
 */
export const createApiMethod = (
  method: HttpMethod,
  path: string | string[],
  config: AuthApiConfig | AuthGetApiConfig,
  secure: boolean,
  tags: string[],
): Record<string, Record<string, unknown>> => {
  const hasBody = method !== "get" && method !== "delete";
  const paths = Array.isArray(path) ? path : [path];

  const result: Record<string, Record<string, unknown>> = {};

  paths.forEach((p) => {
    const filteredPathParams = filterParamsForPath(p, config.params);
    const security = buildSecurity(secure);

    result[p] = {
      [method]: {
        tags,
        summary: config.summary,
        ...(config.description && { description: config.description }),
        ...(security && { security }),
        ...(hasBody && "body" in config && { requestBody: buildRequestBody(config.body) }),
        parameters: buildParameters(
          filteredPathParams,
          "queryParams" in config ? config.queryParams : undefined,
        ),
        responses: buildResponses(config.responses),
      },
    };
  });

  return result;
};

export const createApiPost = (path: string | string[], config: AuthApiConfig, secure: boolean, tags: string[]) =>
  createApiMethod("post", path, config, secure, tags);

export const createApiGet = (path: string | string[], config: AuthGetApiConfig, secure: boolean, tags: string[]) =>
  createApiMethod("get", path, config, secure, tags);

export const createApiPut = (path: string | string[], config: AuthApiConfig, secure: boolean, tags: string[]) =>
  createApiMethod("put", path, config, secure, tags);

export const createApiPatch = (path: string | string[], config: AuthApiConfig, secure: boolean, tags: string[]) =>
  createApiMethod("patch", path, config, secure, tags);

export const createApiDelete = (path: string | string[], config: AuthGetApiConfig, secure: boolean, tags: string[]) =>
  createApiMethod("delete", path, config, secure, tags);

/**
 * Declares every HTTP method mounted on a single path at once - the usual
 * shape for a resource route (e.g. `GET/PATCH /users/me`), so the path
 * string is written only once.
 */
export const createApiEndpoint = (
  path: string,
  methods: {
    get?: { config: AuthGetApiConfig; secure?: boolean };
    post?: { config: AuthApiConfig; secure?: boolean };
    put?: { config: AuthApiConfig; secure?: boolean };
    patch?: { config: AuthApiConfig; secure?: boolean };
    delete?: { config: AuthGetApiConfig; secure?: boolean };
  },
  tags: string[],
): Record<string, Record<string, unknown>> => {
  const endpoint: Record<string, unknown> = {};

  (Object.entries(methods) as Array<[HttpMethod, (typeof methods)[keyof typeof methods]]>).forEach(
    ([method, options]) => {
      if (!options) return;
      const result = createApiMethod(method, "_temp", options.config, options.secure ?? false, tags);
      const methodConfig = result["_temp"]?.[method];
      if (methodConfig) endpoint[method] = methodConfig;
    },
  );

  return { [path]: endpoint };
};
