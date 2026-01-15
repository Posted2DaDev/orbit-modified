import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { isEmailValid } from "@/utils/email";

export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const workspaceGroupId = parseInt(req.query.id as string, 10);
  if (!workspaceGroupId) return res.status(400).json({ success: false, error: "Invalid workspace id" });

  const userId = req.session.userid ? Number(req.session.userid) : null;
  if (!userId) return res.status(401).json({ success: false, error: "Not logged in" });

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceGroupId_userId: { workspaceGroupId, userId } },
    select: { userId: true, email: true, emailVerified: true },
  });

  if (req.method === "GET") {
    return res.json({
      success: true,
      email: membership?.email ?? null,
      emailVerified: membership?.emailVerified ?? false,
    });
  }

  if (req.method === "POST") {
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const normalizedEmail = rawEmail.length ? rawEmail : null;

    if (normalizedEmail && !isEmailValid(normalizedEmail)) {
      return res.status(400).json({ success: false, error: "Invalid email address" });
    }

    const shouldKeepVerification =
      normalizedEmail &&
      membership?.email &&
      membership.email.toLowerCase() === normalizedEmail.toLowerCase() &&
      Boolean(membership.emailVerified);

    const emailVerified = shouldKeepVerification ? membership?.emailVerified ?? false : false;

    await prisma.workspaceMember.upsert({
      where: { workspaceGroupId_userId: { workspaceGroupId, userId } },
      update: { email: normalizedEmail, emailVerified },
      create: { workspaceGroupId, userId, email: normalizedEmail, emailVerified },
    });

    return res.json({ success: true, email: normalizedEmail, emailVerified });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
});
