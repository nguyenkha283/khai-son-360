import { getStore } from '@netlify/blobs';

// GET /api/img/<key> -> ảnh đã tải lên (ảnh nhiều phần được ghép lại khi gửi về)
export default async (req, context) => {
  const key = context.params.key;
  const store = getStore('vr360-images');
  const res = key && !key.includes('~') && await store.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!res) return new Response('Not found', { status: 404 });
  const { type = 'image/jpeg', parts = 1 } = res.metadata ?? {};

  let body = res.data;
  if (parts > 1) {
    let i = 0;
    body = new ReadableStream({
      async pull(ctrl) {
        const chunk = await store.get(`${key}~${i}`, { type: 'arrayBuffer' });
        if (!chunk) return ctrl.error(new Error(`Thiếu phần ${i} của ${key}`));
        ctrl.enqueue(new Uint8Array(chunk));
        if (++i === parts) ctrl.close();
      },
    });
  }
  return new Response(body, {
    headers: {
      'content-type': type,
      'cache-control': 'public, max-age=31536000, immutable', // tên file không bao giờ bị ghi đè
      'netlify-cdn-cache-control': 'public, max-age=31536000, immutable, durable',
    },
  });
};

export const config = { path: '/api/img/:key' };
