import { z } from "zod";
import { signinSchema } from "../validations/auth.schema.js";

export type SigninInput = z.infer<typeof signinSchema>["body"];

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}
