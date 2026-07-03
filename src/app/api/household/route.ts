import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import {
  listPendingInvites,
  listTenantMembers,
} from "@/lib/household-service";
import { findTenantById } from "@/lib/tenant-repository";

export const GET = withAuth(async (_request, auth) => {
  const [tenant, members, invites] = await Promise.all([
    findTenantById(auth.tenantId),
    listTenantMembers(auth.tenantId),
    listPendingInvites(auth.tenantId),
  ]);

  const currentMember = members.find((m) => m.userId === auth.userId);

  return NextResponse.json({
    tenant: {
      id: auth.tenantId,
      name: tenant?.name ?? auth.tenantName,
    },
    currentMember: currentMember
      ? {
          id: currentMember.id,
          role: currentMember.role,
          email: currentMember.email,
          userId: currentMember.userId,
        }
      : null,
    members: members.map((m) => ({
      id: m.id,
      email: m.email,
      role: m.role,
      userId: m.userId,
    })),
    invites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    })),
  });
});
