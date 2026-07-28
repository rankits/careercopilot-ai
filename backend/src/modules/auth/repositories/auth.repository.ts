import { Prisma, User, UserRole } from "@prisma/client";
import { prisma } from "../../../shared/config/db.conf.js";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export const authRepository = {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  },

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  async createUser(input: CreateUserInput): Promise<User> {
    return prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role || UserRole.USER,
      },
    });
  },

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  },

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  },
};

export default authRepository;
