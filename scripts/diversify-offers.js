// Boş veya az teklifli ilanlara çeşitli seed worker'larla teklif ekler.
const BASE = 'https://api.yapgitsin.tr';

// Daha önce çalıştığı doğrulanan seed'ler + birkaç deneme adayı.
const CANDIDATES = [
  { email: 'omer.acet@gmail.com', pass: '123456789AA.' },
  { email: 'demo@yapgitsin.tr',    pass: 'Yapgitsin1234!' },
  { email: 'veli@yapgitsin.tr',    pass: 'Yapgitsin1234!' },
  { email: 'sabri@yapgitsin.tr',   pass: 'Yapgitsin1234!' },
  { email: 'yusuf@yapgitsin.tr',   pass: 'Yapgitsin1234!' },
  { email: 'hasan@yapgitsin.tr',   pass: 'Yapgitsin1234!' },
  { email: 'zeynep@yapgitsin.tr',  pass: 'Yapgitsin1234!' },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function login(email, pass) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!r.ok) return null;
  return r.json();
}

async function listJobs(token) {
  const r = await fetch(`${BASE}/jobs?limit=30`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await r.json();
  return Array.isArray(data) ? data : (data.data ?? []);
}

async function listOffers(token, jobId) {
  const r = await fetch(`${BASE}/jobs/${jobId}/offers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}

async function bid(token, jobId, price, msg) {
  const r = await fetch(`${BASE}/jobs/${jobId}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ price, message: msg }),
  });
  return { status: r.status, body: await r.text() };
}

(async () => {
  // Login all candidates
  console.log('=== LOGIN PROBE ===');
  const sessions = [];
  for (const c of CANDIDATES) {
    const s = await login(c.email, c.pass);
    if (s?.access_token) {
      sessions.push({ ...c, token: s.access_token, user: s.user });
      console.log('  ✓', c.email, '→', s.user?.fullName, s.user?.id);
    } else {
      console.log('  ✗', c.email);
    }
  }

  // Get jobs + figure who hasn't bid on what
  const probe = sessions[0];
  const jobs = await listJobs(probe.token);
  console.log(`\n=== JOBS (${jobs.length}) ===`);

  for (const job of jobs) {
    const offers = await listOffers(probe.token, job.id);
    const bidUserIds = new Set(offers.map(o => o.userId));
    const lacking = sessions.filter(s =>
      !bidUserIds.has(s.user.id) && job.customerId !== s.user.id
    );

    if (lacking.length === 0 || offers.length >= 4) continue;
    console.log(`\n[${job.title}] | mevcut ${offers.length} teklif`);

    // Add up to 3 new diverse offers per job
    let added = 0;
    for (const s of lacking) {
      if (added >= 3) break;
      const price = 500 + Math.floor(Math.random() * 2000);
      const msg = `${s.user.fullName} olarak ${price} ₺ teklif veriyorum. Detay için mesaj atın.`;
      const res = await bid(s.token, job.id, price, msg);
      if (res.status === 201) {
        console.log(`  + ${s.user.fullName} → ${price} ₺ ✓`);
        added++;
      } else {
        const err = JSON.parse(res.body).message ?? res.body;
        console.log(`  - ${s.user.fullName} → ${res.status}: ${String(err).slice(0, 60)}`);
      }
      await sleep(150);
    }
  }

  console.log('\n=== DONE ===');
})().catch(e => { console.error(e); process.exit(1); });
