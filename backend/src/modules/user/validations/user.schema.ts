import { z, ZodTypeAny } from "zod";

const withEnvelope = (body: ZodTypeAny, query: ZodTypeAny = z.object({}).optional()) =>
  z.object({ body, query, params: z.object({}).optional() });

export const updateProfileSchema = withEnvelope(
  z
    .object({
      firstName: z.string().trim().min(1).max(80).optional(),
      lastName: z.string().trim().min(1).max(80).optional(),
      phone: z
        .string()
        .trim()
        .regex(/^\+?[1-9]\d{7,14}$/, "Phone must be a valid E.164 number, e.g. +14155552671")
        .nullable()
        .optional(),
      profileImage: z
        .string()
        .trim()
        .url("Profile image must be a valid URL")
        .nullable()
        .optional(),
      bio: z.string().trim().max(500, "Bio must be 500 characters or fewer").nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
);

const listUsersQueryBody = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().min(1).optional(),
});

export const listUsersQuerySchema = withEnvelope(z.object({}).optional(), listUsersQueryBody);

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>["body"];
export type ListUsersQuery = z.infer<typeof listUsersQueryBody>;
