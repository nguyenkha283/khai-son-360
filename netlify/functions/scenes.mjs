import { getStore } from '@netlify/blobs';
import { checkAuth, json } from '../lib/auth.mjs';

const store = () => getStore({ name: 'vr360', consistency: 'strong' });

// GET  /api/scenes          -> dữ liệu đã lưu (404 nếu chưa có, trang tự dùng dữ liệu trong code)
// POST /api/scenes          -> lưu dữ liệu (cần mật khẩu)
// POST /api/scenes?check=1  -> chỉ kiểm tra mật khẩu
export default async (req) => {
  if (req.method === 'GET') {
    const data = await store().get('scenes', { type: 'json' });
    if (!data) return json({ error: 'Chưa có dữ liệu' }, 404, { 'cache-control': 'no-store' });
    return json(data, 200, { 'cache-control': 'no-store' });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const denied = await checkAuth(req);
  if (denied) return denied;
  if (new URL(req.url).searchParams.has('check')) return json({ ok: true });

  let data;
  try { data = await req.json(); } catch { return json({ error: 'JSON không hợp lệ' }, 400); }
  if (!Array.isArray(data?.scenes) || !data.scenes.every(s => s && typeof s.id === 'string' && Array.isArray(s.hotspots ?? []))) {
    return json({ error: 'Dữ liệu cảnh không hợp lệ' }, 400);
  }
  const s = store();
  const savedAt = new Date().toISOString();
  await s.setJSON('scenes', data);
  await s.setJSON(`history/${savedAt}`, data); // bản sao lưu mỗi lần lưu
  return json({ ok: true, savedAt });
};

export const config = { path: '/api/scenes' };
