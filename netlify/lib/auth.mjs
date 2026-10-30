import { createHash, timingSafeEqual } from 'node:crypto';

const sha = s => createHash('sha256').update(String(s)).digest();

// Mật khẩu đặt ở biến môi trường ADMIN_PASSWORD trên Netlify
export async function checkAuth(req) {
  const expected = globalThis.Netlify?.env?.get('ADMIN_PASSWORD') ?? process.env.ADMIN_PASSWORD;
  if (!expected) return json({ error: 'Chưa đặt ADMIN_PASSWORD trên Netlify (đặt xong cần deploy lại)' }, 500);
  const given = req.headers.get('x-admin-password') || '';
  if (timingSafeEqual(sha(given), sha(expected))) return null;
  await new Promise(r => setTimeout(r, 800)); // làm chậm dò mật khẩu
  return json({ error: 'Sai mật khẩu' }, 401);
}

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
