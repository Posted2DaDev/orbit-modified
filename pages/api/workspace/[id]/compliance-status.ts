import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";

type ComplianceStatusResponse = {
  success: boolean;
  userId?: number;
  policies?: Array<{
    id: string;
    name: string;
    acknowledgedAt: string | null;
    isOverdue: boolean;
    deadline: string | null;
  }>;
  summary?: {
    total: number;
    acknowledged: number;
    pending: number;
    overdue: number;
    complianceRate: number;
  };
  error?: string;
};

export default withSessionRoute(
  async (req: NextApiRequest, res: NextApiResponse<ComplianceStatusResponse>) => {
    const workspaceGroupId = parseInt(req.query.id as string, 10);
    if (!workspaceGroupId) {
      return res.status(400).json({ success: false, error: "Invalid workspace id" });
    }

    const userId = req.session.userid ? Number(req.session.userid) : null;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Not logged in" });
    }

    const targetUserId = req.query.userId ? Number(req.query.userId) : userId;

    if (req.method === "GET") {
      // Fetch all policies requiring acknowledgment
      const policies = await prisma.document.findMany({
        where: {
          workspaceGroupId,
          requiresAcknowledgment: true,
        },
        select: {
          id: true,
          name: true,
          acknowledgmentDeadline: true,
          acknowledgments: {
            where: { userId: BigInt(targetUserId) },
            select: { acknowledgedAt: true },
          },
        },
      });

      const now = new Date();
      const policyDetails = policies.map((policy) => {
        const acknowledgment = policy.acknowledgments[0];
        const isOverdue =
          policy.acknowledgmentDeadline &&
          new Date(policy.acknowledgmentDeadline) < now &&
          !acknowledgment;

        return {
          id: policy.id,
          name: policy.name,
          acknowledgedAt: acknowledgment?.acknowledgedAt
            ? new Date(acknowledgment.acknowledgedAt).toISOString()
            : null,
          isOverdue: Boolean(isOverdue),
          deadline: policy.acknowledgmentDeadline
            ? new Date(policy.acknowledgmentDeadline).toISOString()
            : null,
        };
      });

      const acknowledged = policyDetails.filter((p) => p.acknowledgedAt).length;
      const pending = policyDetails.length - acknowledged;
      const overdue = policyDetails.filter((p) => p.isOverdue).length;

      return res.json({
        success: true,
        userId: targetUserId,
        policies: policyDetails,
        summary: {
          total: policyDetails.length,
          acknowledged,
          pending,
          overdue,
          complianceRate:
            policyDetails.length > 0
              ? Math.round((acknowledged / policyDetails.length) * 100)
              : 100,
        },
      });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
);
