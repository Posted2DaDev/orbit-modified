import type { NextApiRequest, NextApiResponse } from 'next';
import { withPermissionCheck } from '@/utils/permissionsManager';
import { setConfig, getConfig } from '@/utils/configEngine';
import { logAudit } from '@/utils/logs';

type ActivityTrackingConfig = {
  weekStartsOn: 'sunday' | 'monday';
  trackedRoles: Record<string, boolean>;
};

type Data = {
  success: boolean;
  error?: string;
  weekStartsOn?: 'sunday' | 'monday';
  trackedRoles?: Record<string, boolean>;
};

export default withPermissionCheck(handler, 'admin');

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === 'GET') {
    try {
      const workspaceId = parseInt(req.query.id as string);
      const config = await getConfig('activityTracking', workspaceId);

      const defaultConfig: ActivityTrackingConfig = {
        weekStartsOn: 'sunday',
        trackedRoles: {},
      };

      const trackingConfig = config || defaultConfig;

      return res.status(200).json({
        success: true,
        weekStartsOn: trackingConfig.weekStartsOn || 'sunday',
        trackedRoles: trackingConfig.trackedRoles || {},
      });
    } catch (error) {
      console.error('Failed to fetch activity tracking config:', error);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const workspaceId = parseInt(req.query.id as string);
      const { weekStartsOn, trackedRoles } = req.body;

      if (!workspaceId) {
        return res.status(400).json({ success: false, error: 'Invalid workspace ID' });
      }

      const before = await getConfig('activityTracking', workspaceId);
      
      const newConfig: ActivityTrackingConfig = {
        weekStartsOn: weekStartsOn || 'sunday',
        trackedRoles: trackedRoles || {},
      };

      await setConfig('activityTracking', newConfig, workspaceId);

      try {
        await logAudit(
          workspaceId,
          (req as any).session?.userid || null,
          'settings.activity.tracking.update',
          'activityTracking',
          { before, after: newConfig }
        );
      } catch (e) {}

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to update activity tracking config:', error);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
