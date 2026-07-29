import type { AdminWithRole } from "@/modules/admin/repositories/admin.repository.js";
import type { SafeAdmin } from "@/modules/admin/types/admin.types.js";

export const toSafeAdmin = (admin: AdminWithRole): SafeAdmin => ({
  id: admin.publicId,
  email: admin.email,
  firstName: admin.firstName,
  lastName: admin.lastName,
  profileImage: admin.profileImage,
  status: admin.status,
  role: admin.role.name,
  createdAt: admin.createdAt,
});

export interface SafeAdminResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  status: string;
  role: string;
  createdAt: string;
}

export const toSafeAdminResponse = (admin: SafeAdmin): SafeAdminResponseDto => ({
  id: admin.id,
  email: admin.email,
  firstName: admin.firstName,
  lastName: admin.lastName,
  profileImage: admin.profileImage,
  status: admin.status,
  role: admin.role,
  createdAt: admin.createdAt.toISOString(),
});
