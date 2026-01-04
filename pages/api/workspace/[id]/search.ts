import type { NextApiRequest, NextApiResponse } from 'next';
import { withSessionRoute } from '@/lib/withSession';
import prisma from '@/utils/database';

type SearchResults = {
  users: Array<{ userid: BigInt; username: string; picture?: string | null }>;
  sessions: Array<{ id: string; name: string; date: Date }>;
  policies: Array<{ id: string; name: string }>;
  documents: Array<{ id: string; title: string }>;
};

type Data = {
  success: boolean;
  results?: SearchResults;
  error?: string;
};

export default withSessionRoute(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const q = req.query.q as string | undefined;
    const workspaceId = parseInt(id as string);

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'Invalid workspace ID' });
    }

    const results: SearchResults = {
      users: [],
      sessions: [],
      policies: [],
      documents: [],
    };

    // If bootstrap, return empty results to populate default quick links
    if (req.query.bootstrap) {
      return res.status(200).json({ success: true, results });
    }

    if (!q || q.length < 1) {
      return res.status(200).json({ success: true, results });
    }

    // Search users (members in workspace)
    if (q.length > 0) {
      const users = await prisma.workspaceMember.findMany({
        where: {
          workspaceGroupId: workspaceId,
          user: {
            username: {
              contains: q,
              mode: 'insensitive',
            },
          },
        },
        include: {
          user: {
            select: {
              userid: true,
              username: true,
              picture: true,
            },
          },
        },
        take: 5,
      });

      results.users = users.map((m) => ({
        userid: m.user.userid,
        username: m.user.username || '',
        picture: m.user.picture,
      }));
    }

    // Search sessions
    if (q.length > 0) {
      const sessions = await prisma.session.findMany({
        where: {
          sessionType: {
            workspaceGroupId: workspaceId,
          },
          name: {
            contains: q,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          date: true,
        },
        take: 5,
      });

      results.sessions = sessions;
    }

    // Search documents
    if (q.length > 0) {
      const documents = await prisma.document.findMany({
        where: {
          workspaceGroupId: workspaceId,
          title: {
            contains: q,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          title: true,
        },
        take: 5,
      });

      results.documents = documents;
    }

    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ success: false, error: 'Search failed' });
  }
});
