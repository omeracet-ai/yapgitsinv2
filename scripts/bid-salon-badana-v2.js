// Salon Badana ilanına farklı seed worker'larla teklif ver.
// Birden fazla seed user dener; ilk login olabilen ile teklif verir.
const BASE = 'https://api.yapgitsin.tr';
const CANDIDATES = [
  { email: 'emre@v2.test',     pass: 'Test1234' },
  { email: 'selin@v2.test',    pass: 'Test1234' },
  { email: 'zeynep@test.com',  pass: 'Test1234' },
  { email: 'hasan@test.com',   pass: 'Test1234' },
  { email: 'demo@yapgitsin.tr',pass: 'Yapgitsin1234!' },
];

async function login(email, pass) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!r.ok) return null;
  return r.json();
}

async function main() {
  let creds = null;
  for (const c of CANDIDATES) {
    const data = await login(c.email, c.pass);
    if (data?.access_token) {
      creds = { ...c, token: data.access_token, user: data.user };
      console.log('login OK:', c.email, '→', data.user?.fullName, data.user?.id);
      break;
    } else {
      console.log('login FAIL:', c.email);
    }
  }
  if (!creds) throw new Error('Hiçbir seed user prod\'da login olamadı');

  const jobsRes = await fetch(`${BASE}/jobs?q=Salon+Badana&limit=20`, {
    headers: { Authorization: `Bearer ${creds.token}` },
  });
  const jobsJson = await jobsRes.json();
  const list = Array.isArray(jobsJson) ? jobsJson : (jobsJson.data ?? []);
  const target = list.find((j) =>
    (j.title ?? '').toLowerCase().includes('salon') &&
    (j.title ?? '').toLowerCase().includes('badana')
  ) ?? list[0];
  if (!target) throw new Error('Salon Badana ilanı bulunamadı');
  console.log('target:', target.id, target.title);

  const price = 800 + Math.floor(Math.random() * 1500);
  const r = await fetch(`${BASE}/jobs/${target.id}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creds.token}`,
    },
    body: JSON.stringify({
      price,
      message: `${creds.user?.fullName ?? 'Usta'} olarak ${price} ₺ teklif veriyorum.`,
    }),
  });
  console.log('offer status', r.status);
  console.log(await r.text());
}

main().catch((e) => { console.error(e); process.exit(1); });
