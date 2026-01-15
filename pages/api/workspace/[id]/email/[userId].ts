import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { isEmailValid } from "@/utils/email";

export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const workspaceGroupId = parseInt(req.query.id as string, 10);
  if (!workspaceGroupId) return res.status(400).json({ success: false, error: "Invalid workspace id" });

  const actingUserId = req.session.userid ? Number(req.session.userid) : null;
  if (!actingUserId) return res.status(401).json({ success: false, error: "Not logged in" });

  const targetUserId = parseInt(req.query.userId as string, 10);
  if (!targetUserId) return res.status(400).json({ success: false, error: "Invalid target user id" });

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceGroupId_userId: { workspaceGroupId, userId: actingUserId } },
    select: { userId: true },
  });
  if (!membership) return res.status(403).json({ success: false, error: "Not a workspace member" });

  const actor = await prisma.user.findFirst({
    where: { userid: BigInt(actingUserId) },
    include: { roles: { where: { workspaceGroupId }, take: 1 } },
  });

  const actorRole = actor?.roles?.[0];
  const perms = actorRole?.permissions || [];
  const isOwnerRole = actorRole?.isOwnerRole;
  const allowed = isOwnerRole || perms.includes("manage_activity") || perms.includes("manage_users") || perms.includes("manage_workspace");
  if (!allowed) return res.status(403).json({ success: false, error: "Insufficient permissions" });

  const targetMembership = await prisma.workspaceMember.findUnique({
    where: { workspaceGroupId_userId: { workspaceGroupId, userId: targetUserId } },
    select: { email: true, emailVerified: true },
  });

  if (req.method === "GET") {
    return res.json({
      success: true,
      email: targetMembership?.email ?? null,
      emailVerified: targetMembership?.emailVerified ?? false,
    });
  }

  if (req.method === "PUT") {
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const normalizedEmail = rawEmail.length ? rawEmail : null;

    if (normalizedEmail && !isEmailValid(normalizedEmail)) {
      return res.status(400).json({ success: false, error: "Invalid email address" });
    }

    const shouldKeepVerification =
      normalizedEmail &&
      targetMembership?.email &&
      targetMembership.email.toLowerCase() === normalizedEmail.toLowerCase() &&
      Boolean(targetMembership.emailVerified);

    const emailVerified = shouldKeepVerification ? targetMembership?.emailVerified ?? false : false;

    await prisma.workspaceMember.upsert({
      where: { workspaceGroupId_userId: { workspaceGroupId, userId: targetUserId } },
      update: { email: normalizedEmail, emailVerified },
      create: { workspaceGroupId, userId: targetUserId, email: normalizedEmail, emailVerified },
    });

    return res.json({ success: true, email: normalizedEmail, emailVerified });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
});
