// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getConfig, setConfig } from '@/utils/configEngine'
import { logAudit } from '@/utils/logs'
import { withPermissionCheck } from '@/utils/permissionsManager'

type Data = {
  success: boolean
  error?: string
  value?: any
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === 'GET') {
    const config = await getConfig('inactivity', parseInt(req.query.id as string));
    if (!config) {
      return res.status(200).json({ success: true, value: { webhookEnabled: false, webhookUrl: "" } });
    }
    return res.status(200).json({ success: true, value: config });
  }

  return withPermissionCheck(async (req: NextApiRequest, res: NextApiResponse<Data>) => {
    if (req.method === 'PATCH') {
      const workspaceId = parseInt(req.query.id as string);
      const before = await getConfig('inactivity', workspaceId);
      const after = { 
        webhookEnabled: req.body.webhookEnabled || false,
        webhookUrl: req.body.webhookUrl || ""
      };
      await setConfig('inactivity', after, workspaceId);
      try { await logAudit(workspaceId, (req as any).session?.userid || null, 'settings.general.inactivity.update', 'inactivity', { before, after }); } catch (e) {}
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }, 'admin')(req, res);
}
