import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";

export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const actingUserId = req.session.userid ? Number(req.session.userid) : null;
  if (!actingUserId) return res.status(401).json({ success: false, error: "Not authenticated" });

  const actor = await prisma.user.findUnique({
    where: { userid: BigInt(actingUserId) },
    select: { isOwner: true },
  });

  if (!actor?.isOwner) {
    return res.status(403).json({ success: false, error: "Owner access required" });
  }

  const members = await prisma.workspaceMember.findMany({
    select: {
      userId: true,
      workspaceGroupId: true,
      isAdmin: true,
      email: true,
      emailVerified: true,
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  const recipientsMap = new Map<
    number,
    {
      userId: number;
      username: string;
      email: string | null;
      emailVerified: boolean;
      workspaces: Set<number>;
      isWorkspaceAdmin: boolean;
    }
  >();

  for (const member of members) {
    const id = Number(member.userId);
    const existing = recipientsMap.get(id);

    const preferredEmail = member.email ?? existing?.email ?? null;
    const emailVerified = preferredEmail
      ? (member.email?.toLowerCase() === preferredEmail.toLowerCase()
          ? Boolean(member.emailVerified)
          : Boolean(existing?.emailVerified))
      : false;

    recipientsMap.set(id, {
      userId: id,
      username: member.user.username || `User ${id}`,
      email: preferredEmail,
      emailVerified,
      workspaces: new Set([...(existing?.workspaces ?? []), member.workspaceGroupId]),
      isWorkspaceAdmin: Boolean(existing?.isWorkspaceAdmin || member.isAdmin),
    });
  }

  const recipients = Array.from(recipientsMap.values())
    .map((r) => ({
      ...r,
      workspaces: Array.from(r.workspaces),
    }))
    .sort((a, b) => a.username.localeCompare(b.username));

  return res.json({ success: true, recipients });
});
