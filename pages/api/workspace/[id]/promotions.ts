import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";
import { getRobloxUserId, getRobloxUsername, getRobloxThumbnail } from "@/utils/roblox";
import { v4 as uuidv4 } from "uuid";

export default withSessionRoute(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const userId = req.session.userid;

  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  if (!id || typeof id !== "string") {
    return res.status(400).json({ success: false, error: "Invalid workspace ID" });
  }

  const workspaceId = Number.parseInt(id);

  if (Number.isNaN(workspaceId)) {
    return res.status(400).json({ success: false, error: "Invalid workspace ID" });
  }
  // Check if promotions feature is enabled
  const config = await prisma.config.findFirst({
    where: {
      workspaceGroupId: workspaceId,
      key: "promotions",
    },
  });

  let promotionsEnabled = false;
  if (config?.value) {
    let val = config.value;
    if (typeof val === "string") {
      try {
        val = JSON.parse(val);
      } catch {
        val = {};
      }
    }
    promotionsEnabled =
      typeof val === "object" && val !== null && "enabled" in val
        ? (val as { enabled?: boolean }).enabled ?? false
        : false;
  }

  if (!promotionsEnabled) {
    return res.status(404).json({ success: false, error: "Promotions feature not enabled" });
  }

  // Verify user has access to this workspace
  const user = await prisma.user.findFirst({
    where: { userid: userId },
    include: {
      roles: {
        where: { workspaceGroupId: workspaceId },
      },
    },
  });

  if (!user || user.roles.length === 0) {
    return res.status(403).json({ success: false, error: "Access denied" });
  }

  if (req.method === "GET") {
    return handleGetPromotions(req, res, workspaceId);
  } else if (req.method === "POST") {
    return handleCreatePromotion(req, res, workspaceId, userId);
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function handleGetPromotions(
  req: NextApiRequest,
  res: NextApiResponse,
  workspaceId: number
) {
  const { sort = "trending" } = req.query as { sort?: string };

  // Sort by score or createdAt
  const orderBy =
    sort === "new"
      ? "ORDER BY \"createdAt\" DESC"
      : "ORDER BY (COALESCE(\"upvotes\",0) - COALESCE(\"downvotes\",0)) DESC, \"createdAt\" DESC";
  // Use a single raw SELECT on the canonical Promotion table
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM "Promotion" WHERE "workspaceGroupId" = $1 ${orderBy}`,
    workspaceId
  );

  const enriched = await Promise.all(
    rows.map(async (r) => {
      const [recommenderName, recommenderAvatar, targetUsername, targetAvatar] = await Promise.all([
        getRobloxUsername(BigInt(r.recommenderId)).catch(() => "Unknown"),
        getRobloxThumbnail(BigInt(r.recommenderId)).catch(() => null),
        getRobloxUsername(BigInt(r.targetUserId)).catch(() => "Unknown"),
        getRobloxThumbnail(BigInt(r.targetUserId)).catch(() => null),
      ]);      return {
        id: r.id,
        recommenderId: String(r.recommenderId),
        recommenderName,
        recommenderAvatar,
        targetUserId: String(r.targetUserId),
        targetUsername,
        targetAvatar,
        currentRole: r.currentRole,
        recommendedRole: r.recommendedRole,
        reason: r.reason,
        upvotes: Number(r.upvotes || 0),
        downvotes: Number(r.downvotes || 0),
        comments: 0,
        createdAt: r.createdAt?.toISOString?.() || r.createdAt,
        status: "pending" as const,
      };
    })
  );

  return res.status(200).json({ success: true, promotions: enriched });
}

async function handleCreatePromotion(
  req: NextApiRequest,
  res: NextApiResponse,
  workspaceId: number,
  userId: string
) {
  const { targetUser, currentRole, recommendedRole, reason } = req.body;

  if (!targetUser || !currentRole || !recommendedRole || !reason) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
    });
  }

  // Resolve target user details
  let targetUserId: number;
  try {
    targetUserId = await getRobloxUserId(String(targetUser));
  } catch {
    return res.status(400).json({ success: false, error: "Invalid target user" });
  }

  let targetUsername, targetAvatar, recommenderName, recommenderAvatar;
  try {
    [targetUsername, targetAvatar, recommenderName, recommenderAvatar] = await Promise.all([
      getRobloxUsername(targetUserId),
      getRobloxThumbnail(targetUserId),
      getRobloxUsername(Number(userId)),
      getRobloxThumbnail(Number(userId)),
    ]);
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch Roblox user data" 
    });
  }

  const newId = uuidv4();
  const createdRows: any[] = await prisma.$queryRawUnsafe(
    `INSERT INTO "Promotion" (
      id, "workspaceGroupId", "recommenderId", "targetUserId", "currentRole", "recommendedRole", reason, upvotes, downvotes
    ) VALUES ($1::uuid,$2::int,$3::bigint,$4::bigint,$5::text,$6::text,$7::text,0,0)
    RETURNING id, "createdAt"`,
    newId,
    workspaceId,
    BigInt(userId as any),
    BigInt(targetUserId),
    String(currentRole),
    String(recommendedRole),
    String(reason)
  );
  const created = createdRows?.[0] ?? { id: newId, createdAt: new Date() };

  return res.status(201).json({
    success: true,
    message: "Promotion recommendation created successfully",
    promotion: {
      id: created.id,
      recommenderId: String(userId),
      recommenderName,
      recommenderAvatar,
      targetUserId: String(targetUserId),
      targetUsername,
      targetAvatar,
      currentRole,
      recommendedRole,
      reason,
      upvotes: 0,
      downvotes: 0,
      comments: 0,
      createdAt: created.createdAt?.toISOString?.() || new Date().toISOString(),
      status: "pending" as const,
    },
  });
}

