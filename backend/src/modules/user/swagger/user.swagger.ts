import { createApiEndpoint, createApiGet, successSchema, errorSchema } from "../../../shared/swagger/factory.js";
import { safeUserSchema, paginatedSchema, commonSecureResponses, commonAdminResponses } from "../../../shared/swagger/schemas.js";

const BASE_URL = "/api/v1/users";
const TAGS = ["Users"];

const listItemSchema = {
  type: "object",
  properties: {
    id: safeUserSchema.properties.id,
    email: safeUserSchema.properties.email,
    firstName: safeUserSchema.properties.firstName,
    lastName: safeUserSchema.properties.lastName,
    role: safeUserSchema.properties.role,
    status: safeUserSchema.properties.status,
    isEmailVerified: safeUserSchema.properties.isEmailVerified,
    createdAt: safeUserSchema.properties.createdAt,
  },
};

export const userSwagger = {
  ...createApiEndpoint(
    `${BASE_URL}/me`,
    {
      get: {
        config: {
          summary: "Get my profile",
          responses: {
            200: { description: "Own profile", schema: successSchema("Profile fetched", safeUserSchema) },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
      patch: {
        config: {
          summary: "Update my profile",
          description: "Partial update - at least one field must be provided.",
          body: {
            properties: {
              firstName: { type: "string", maxLength: 80, example: "Jane" },
              lastName: { type: "string", maxLength: 80, example: "Doe" },
              phone: { type: "string", nullable: true, example: "+14155552671" },
              profileImage: { type: "string", format: "uri", nullable: true, example: "https://example.com/avatar.png" },
              bio: { type: "string", maxLength: 500, nullable: true, example: "Backend engineer." },
            },
          },
          responses: {
            200: { description: "Profile updated", schema: successSchema("Profile updated", safeUserSchema) },
            400: {
              description: "No fields provided, or a field failed validation",
              schema: errorSchema("Payload is incorrect or missing fields."),
            },
            ...commonSecureResponses,
          },
        },
        secure: true,
      },
    },
    TAGS,
  ),

  ...createApiGet(
    BASE_URL,
    {
      summary: "List users (admin only)",
      description: "Paginated user directory. Requires the ADMIN role.",
      queryParams: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "1-indexed page number" },
        { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 }, description: "Page size" },
        { name: "search", in: "query", schema: { type: "string" }, description: "Matches email, first name, or last name (case-insensitive)" },
      ],
      responses: {
        200: {
          description: "Paginated users",
          schema: successSchema("Users fetched", paginatedSchema(listItemSchema)),
        },
        ...commonAdminResponses,
      },
    },
    true,
    TAGS,
  ),
};
