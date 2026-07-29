import { z } from "zod";

export const signinSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format").min(5),
    password: z.string().min(1, "Password is required"),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
