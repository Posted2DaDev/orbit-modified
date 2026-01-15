import { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/utils/email";

/**
 * Verify email with code
 * POST /api/workspace/[id]/email-verify/confirm
 * Body: { email: string, code: string }
 */
export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		if (!req.session?.userid) {
			return res.status(401).json({ error: "Not authenticated" });
		}

		const workspaceId = parseInt(req.query.id as string);
		const { email, code } = req.body;

		if (!email || !code) {
			return res.status(400).json({ error: "Email and code are required" });
		}

		const trimmedEmail = email.trim().toLowerCase();

		// Find and validate token
		const token = await prisma.emailVerificationToken.findUnique({
			where: {
				workspaceGroupId_userId_email: {
					workspaceGroupId: workspaceId,
					userId: BigInt(req.session.userid),
					email: trimmedEmail,
				},
			},
		});

		if (!token) {
			return res.status(400).json({ error: "No verification code sent for this email" });
		}

		if (token.usedAt) {
			return res.status(400).json({ error: "This code has already been used" });
		}

		if (new Date() > token.expiresAt) {
			return res.status(400).json({ error: "Verification code has expired" });
		}

		if (token.code !== code) {
			return res.status(400).json({ error: "Invalid verification code" });
		}

		// Mark token as used and update user email
		const user = await prisma.user.findUnique({
			where: { userid: BigInt(req.session.userid) },
		});

		await Promise.all([
			prisma.emailVerificationToken.update({
				where: { id: token.id },
				data: { usedAt: new Date() },
			}),
			prisma.workspaceMember.update({
				where: {
					workspaceGroupId_userId: {
						workspaceGroupId: workspaceId,
						userId: BigInt(req.session.userid),
					},
				},
				data: {
					email: trimmedEmail,
					emailVerified: true,
				},
			}),
		]);

		// Send confirmation email
		await sendEmail({
			to: trimmedEmail,
			subject: "Email verified successfully",
			html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; }
    .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Email Verified!</h1>
    </div>
    <div class="content">
      <p>Hi ${user?.username || "there"},</p>
      <div class="success-icon">✅</div>
      <p>Thank you for verifying your email address. Your email has been successfully confirmed.</p>
      <p>You can now use this email for important communications and account recovery.</p>
      <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">If you have any questions, please contact support.</p>
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
			message: "Email verified successfully",
			email: trimmedEmail,
		});
	} catch (error) {
		console.error("Email verification error:", error);
		return res.status(500).json({ error: "Failed to verify email" });
	}
});
