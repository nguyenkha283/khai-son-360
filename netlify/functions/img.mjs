import { getStore } from '@netlify/blobs';

// GET /api/img/<key> -> ảnh đã tải lên
export default async (req, context) => {
  const key = context.params.key;
  const res = key && await getStore('vr360-images').getWithMetadata(key, { type: 'arrayBuffer' });
  if (!res) return new Response('Not found', { status: 404 });
  return new Response(res.data, {
    headers: {
      'content-type': res.metadata?.type || 'image/jpeg',
      'cache-control': 'public, max-age=31536000, immutable', // tên file không bao giờ bị ghi đè
    },
  });
};

export const config = { path: '/api/img/:key' };
