// Tek-seferlik: seed worker (omer.acet) "Salon Badana" ilanına teklif verir.
// Usage: node scripts/bid-salon-badana.js
const BASE = 'https://api.yapgitsin.tr';
const EMAIL = 'omer.acet@gmail.com';
const PASS = '123456789AA.';

async function main() {
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  if (!loginRes.ok) throw new Error(`login ${loginRes.status}: ${await loginRes.text()}`);
  const { access_token: token, user } = await loginRes.json();
  console.log('logged in as', user?.fullName, user?.id);

  const jobsRes = await fetch(`${BASE}/jobs?q=Salon+Badana&limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const jobsJson = await jobsRes.json();
  const list = Array.isArray(jobsJson) ? jobsJson : (jobsJson.data ?? []);
  const target = list.find((j) =>
    (j.title ?? '').toLowerCase().includes('salon') &&
    (j.title ?? '').toLowerCase().includes('badana')
  ) ?? list[0];
  if (!target) throw new Error('Salon Badana ilanı bulunamadı');
  console.log('target job:', target.id, target.title);

  const price = 800 + Math.floor(Math.random() * 1200); // 800-2000 TL
  const offerRes = await fetch(`${BASE}/jobs/${target.id}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      price,
      message: `Salon badana işiniz için ${price} ₺ teklif veriyorum. Aynı gün başlayabilirim.`,
    }),
  });
  const body = await offerRes.text();
  console.log('offer status', offerRes.status);
  console.log(body);
}

main().catch((e) => { console.error(e); process.exit(1); });
