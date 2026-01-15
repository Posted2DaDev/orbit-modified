import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/utils/email";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

/**
 * Request email verification code
 * POST /api/workspace/[id]/email-verify/request
 * Body: { email: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const session = await getServerSession(req, res, authOptions);
		if (!session?.user?.id) {
			return res.status(401).json({ error: "Not authenticated" });
		}

		const workspaceId = parseInt(req.query.id as string);
		const { email } = req.body;

		if (!email || typeof email !== "string") {
			return res.status(400).json({ error: "Email is required" });
		}

		const trimmedEmail = email.trim().toLowerCase();

		// Validate email format
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
			return res.status(400).json({ error: "Invalid email format" });
		}

		// Check if user is a member of this workspace
		const membership = await prisma.workspaceMember.findUnique({
			where: {
				workspaceGroupId_userId: {
					workspaceGroupId: workspaceId,
					userId: BigInt(session.user.id),
				},
			},
		});

		if (!membership) {
			return res.status(403).json({ error: "Not a member of this workspace" });
		}

		// Check if email is already verified in this workspace
		const existingMember = await prisma.workspaceMember.findUnique({
			where: {
				workspaceGroupId_userId: {
					workspaceGroupId: workspaceId,
					userId: BigInt(session.user.id),
				},
			},
		});

		if (existingMember?.email === trimmedEmail && existingMember?.emailVerified) {
			return res.status(400).json({ error: "This email is already verified" });
		}

		// Generate 6-digit code
		const code = Math.floor(100000 + Math.random() * 900000).toString();

		// Delete any existing pending verification tokens for this email
		await prisma.emailVerificationToken.deleteMany({
			where: {
				workspaceGroupId: workspaceId,
				userId: BigInt(session.user.id),
				usedAt: null,
			},
		});

		// Create verification token
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
		const token = await prisma.emailVerificationToken.create({
			data: {
				workspaceGroupId: workspaceId,
				userId: BigInt(session.user.id),
				email: trimmedEmail,
				code,
				expiresAt,
			},
		});

		// Send verification email
		await sendEmail({
			to: trimmedEmail,
			subject: "Verify your email address",
			html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; }
    .code-box { background: white; border: 2px solid #667eea; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea; font-family: 'Courier New', monospace; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    .expiry { color: #ef4444; font-weight: bold; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verify Your Email</h1>
    </div>
    <div class="content">
      <p>Hi,</p>
      <p>You requested to verify your email address. Use the code below to complete verification:</p>
      <div class="code-box">
        <div class="code">${code}</div>
      </div>
      <p>This code will expire in 24 hours.</p>
      <p class="expiry">⏰ Expires at: ${expiresAt.toLocaleString()}</p>
      <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Varyn. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
		});

		return res.status(200).json({
			message: "Verification code sent to your email",
			expiresAt,
		});
	} catch (error) {
		console.error("Email verification request error:", error);
		return res.status(500).json({ error: "Failed to send verification code" });
	}
}
