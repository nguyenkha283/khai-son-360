import { getStore } from '@netlify/blobs';
import { checkAuth, json } from '../lib/auth.mjs';

const MAX = 5 * 1024 * 1024; // giới hạn body của Netlify Functions là ~6MB
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// POST /api/upload?name=ten-anh  (body = file ảnh) -> { url: "/api/img/..." }
export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const denied = await checkAuth(req);
  if (denied) return denied;

  const type = (req.headers.get('content-type') || '').split(';')[0];
  const ext = TYPES[type];
  if (!ext) return json({ error: 'Chỉ nhận ảnh JPG, PNG, WEBP' }, 415);
  const buf = await req.arrayBuffer();
  if (!buf.byteLength) return json({ error: 'File rỗng' }, 400);
  if (buf.byteLength > MAX) return json({ error: 'Ảnh quá lớn (tối đa 5MB)' }, 413);

  const name = (new URL(req.url).searchParams.get('name') || 'anh')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'anh';
  const key = `${Date.now().toString(36)}-${name}.${ext}`;
  await getStore('vr360-images').set(key, buf, { metadata: { type } });
  return json({ url: `/api/img/${key}` });
};

export const config = { path: '/api/upload' };
