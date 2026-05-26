// 3 yeni seed usta kaydeder + boş ilanlara teklif verdirir.
const BASE = 'https://api.yapgitsin.tr';

const seeds = [
  { fullName: 'Mehmet Demir', email: 'mehmet.demir.seed@yapgitsin.tr', phoneNumber: '+905300000201', password: 'Yapgitsin1234!', categories: ['Tesisat', 'Boya & Badana'] },
  { fullName: 'Ayşe Yılmaz',  email: 'ayse.yilmaz.seed@yapgitsin.tr',  phoneNumber: '+905300000202', password: 'Yapgitsin1234!', categories: ['Temizlik', 'Bahçe & Peyzaj'] },
  { fullName: 'Kemal Şahin',  email: 'kemal.sahin.seed@yapgitsin.tr',  phoneNumber: '+905300000203', password: 'Yapgitsin1234!', categories: ['Elektrikçi', 'Klima & Isıtma'] },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function register(s) {
  const r = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: s.fullName,
      email: s.email,
      phoneNumber: s.phoneNumber,
      password: s.password,
      kvkkConsent: true,
      termsConsent: true,
    }),
  });
  return { ok: r.ok, status: r.status, body: await r.text() };
}

async function login(s) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: s.email, password: s.password }),
  });
  if (!r.ok) return null;
  return r.json();
}

async function patchMe(token, body) {
  const r = await fetch(`${BASE}/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return r.ok;
}

async function bid(token, jobId, price, msg) {
  const r = await fetch(`${BASE}/jobs/${jobId}/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ price, message: msg }),
  });
  return { status: r.status, body: await r.text() };
}

(async () => {
  console.log('=== REGISTER + BID ===');
  const sessions = [];
  for (const s of seeds) {
    let reg = await register(s);
    if (!reg.ok) {
      const err = (() => { try { return JSON.parse(reg.body).message; } catch { return reg.body.slice(0, 80); } })();
      console.log(`  ${s.email} → register ${reg.status}: ${err}`);
      // try login (user may already exist)
    }
    const sess = await login(s);
    if (!sess?.access_token) {
      console.log(`  ${s.email} → login FAIL`);
      continue;
    }
    console.log(`  ✓ ${s.fullName} (${sess.user.id.slice(0, 8)})`);
    // Set workerCategories
    await patchMe(sess.access_token, { workerCategories: s.categories });
    sessions.push({ ...s, token: sess.access_token, user: sess.user });
    await sleep(200);
  }

  if (sessions.length === 0) {
    console.error('Hiçbir seed oluşturulamadı.');
    process.exit(1);
  }

  // List jobs
  const probeTok = sessions[0].token;
  const jobsRes = await fetch(`${BASE}/jobs?limit=30`, {
    headers: { Authorization: `Bearer ${probeTok}` },
  });
  const data = await jobsRes.json();
  const jobs = Array.isArray(data) ? data : (data.data ?? []);
  console.log(`\n=== BID PHASE (${jobs.length} ilan) ===`);

  // For each job, each new seed bids if not already
  for (const job of jobs) {
    const or = await fetch(`${BASE}/jobs/${job.id}/offers`, {
      headers: { Authorization: `Bearer ${probeTok}` },
    });
    const offers = await or.json();
    const offersList = Array.isArray(offers) ? offers : [];
    const bidUserIds = new Set(offersList.map(o => o.userId));

    if (offersList.length >= 5) continue; // already plenty

    for (const s of sessions) {
      if (bidUserIds.has(s.user.id) || job.customerId === s.user.id) continue;
      const price = 600 + Math.floor(Math.random() * 1800);
      const msg = `${s.fullName} - bu işi yapabilirim, ${price} ₺. Aynı hafta başlarım.`;
      const res = await bid(s.token, job.id, price, msg);
      if (res.status === 201) {
        console.log(`  + ${job.title.padEnd(30)} ← ${s.fullName} (${price} ₺)`);
      } else {
        let err;
        try { err = JSON.parse(res.body).message; } catch { err = res.body.slice(0, 80); }
        console.log(`  ! ${job.title.padEnd(30)} ← ${s.fullName} ${res.status}: ${err}`);
      }
      await sleep(150);
    }
  }
  console.log('\n=== DONE ===');
})().catch(e => { console.error(e); process.exit(1); });
