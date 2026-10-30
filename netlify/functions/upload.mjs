import { getStore } from '@netlify/blobs';
import { checkAuth, json } from '../lib/auth.mjs';

const MAX = 5 * 1024 * 1024; // giới hạn body của Netlify Functions là ~6MB, ảnh lớn hơn được gửi thành nhiều phần
const MAX_PARTS = 10;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const KEY_RE = /^[a-z0-9]+-[A-Za-z0-9_-]+\.(jpg|png|webp)$/;

// POST /api/upload?name=ten-anh                         (body = cả file ảnh)      -> { url }
// POST /api/upload?name=ten-anh&parts=3                 (body = phần 0)           -> { url, key }
// POST /api/upload?key=<key>&part=1 ... part=2          (body = các phần còn lại) -> { ok }
export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const denied = await checkAuth(req);
  if (denied) return denied;

  const type = (req.headers.get('content-type') || '').split(';')[0];
  const ext = TYPES[type];
  if (!ext) return json({ error: 'Chỉ nhận ảnh JPG, PNG, WEBP' }, 415);
  const buf = await req.arrayBuffer();
  if (!buf.byteLength) return json({ error: 'File rỗng' }, 400);
  if (buf.byteLength > MAX) return json({ error: 'Phần gửi lên quá lớn (tối đa 5MB)' }, 413);

  const q = new URL(req.url).searchParams;
  const store = getStore('vr360-images');

  // Các phần tiếp theo của một ảnh nhiều phần
  if (q.has('key')) {
    const key = q.get('key'), part = +q.get('part');
    if (!KEY_RE.test(key)) return json({ error: 'Key không hợp lệ' }, 400);
    const head = await store.getMetadata(key);
    if (!head?.metadata?.parts || !Number.isInteger(part) || part < 1 || part >= head.metadata.parts) {
      return json({ error: 'Phần ảnh không hợp lệ' }, 400);
    }
    await store.set(`${key}~${part}`, buf);
    return json({ ok: true });
  }

  const parts = Math.max(1, Math.min(MAX_PARTS, parseInt(q.get('parts')) || 1));
  const name = (q.get('name') || 'anh')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'anh';
  const key = `${Date.now().toString(36)}-${name}.${ext}`;
  if (parts === 1) await store.set(key, buf, { metadata: { type } });
  else {
    await store.set(`${key}~0`, buf);
    await store.set(key, '', { metadata: { type, parts } }); // bản ghi đầu mục: chỉ chứa số phần
  }
  return json({ url: `/api/img/${key}`, key });
};

export const config = { path: '/api/upload' };
