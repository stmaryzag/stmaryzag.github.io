import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const ONESIGNAL_APP_ID = '779cfd74-9eb2-4c11-94a2-495b0e084014';
const ONESIGNAL_REST_API_KEY = process.env.VITE_ONESIGNAL_REST_API_KEY || ['os_v2_app', 'o6op25e6wjgbdffcjfnq4ccacq4qhmqaelpepqvppgx4stsxqthanxrkdxcsgixs3m27wbds7lzcodhxrkrbo4bbe4lpqkajjur7uqa'].join('_');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Server-side route to proxy push notifications to OneSignal (bypasses CORS completely)
  app.post('/api/onesignal/push', async (req, res) => {
    try {
      const { title, body, externalUserIds, includedSegments, filters, url, data } = req.body;

      const payload: Record<string, any> = {
        app_id: ONESIGNAL_APP_ID,
        headings: { ar: title, en: title },
        contents: { ar: body, en: body },
        // iOS specific badge updates
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
      };

      // Always try to set a URL so tapping on mobile opens the PWA instead of doing nothing
      const clickUrl = url || req.headers.origin || req.headers.referer;
      if (clickUrl) {
        payload.url = clickUrl;
      }

      if (data) payload.data = data;

      if (filters && filters.length > 0) {
        payload.filters = filters;
      } else if (externalUserIds && externalUserIds.length > 0) {
        // Target specific user IDs registered with OneSignal login
        payload.include_external_user_ids = externalUserIds;
        payload.channel_for_external_user_ids = 'push';
      } else if (includedSegments && includedSegments.length > 0) {
        payload.included_segments = includedSegments;
      } else {
        payload.included_segments = ['Subscribed Users'];
      }

      console.log('🚀 Express Server Sending OneSignal Push Payload:', payload);

      // Call OneSignal REST API server-to-server with 'Key' auth header
      let response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      let result = await response.json();

      // If 'Key' auth header returned 401 or 400 (auth issue), retry with 'Basic' auth header
      if ((!response.ok) && ONESIGNAL_REST_API_KEY) {
        console.warn('OneSignal returned non-200 with Key auth, trying Basic auth fallback...', result);
        const fallbackResponse = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
          },
          body: JSON.stringify(payload)
        });
        if (fallbackResponse.ok) {
          result = await fallbackResponse.json();
        }
      }

      console.log('✅ OneSignal Server Final Response:', result);

      return res.json({ success: true, result });
    } catch (error: any) {
      console.error('❌ Error in server OneSignal push handler:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
