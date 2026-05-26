// Phase 265e — Bot seed'lere realistic profil verisi: bio, city, hourlyRate.
// Yapgitsin'de "ham kart" hissini gidermek için.
const BASE = 'https://api.yapgitsin.tr';

const seeds = [
  {
    email: 'mehmet.demir.seed@yapgitsin.tr',
    pass:  'Yapgitsin1234!',
    patch: {
      workerBio: 'Tesisatçı ve boyacı. 12 yıllık deneyimle ev ve işyeri tesisat tamiri + iç-dış boyama hizmeti veriyorum. Malzemeli/malzemesiz çalışırım. Hızlı, temiz iş.',
      city: 'İstanbul',
      district: 'Kadıköy',
      hourlyRateMin: 350,
      hourlyRateMax: 600,
      serviceRadiusKm: 25,
      isAvailable: true,
      gender: 'male',
    },
  },
  {
    email: 'ayse.yilmaz.seed@yapgitsin.tr',
    pass:  'Yapgitsin1234!',
    patch: {
      workerBio: 'Profesyonel ev ve ofis temizliği + bahçe peyzaj uzmanıyım. Haftalık/aylık abonelik veya tek seferlik temizlikler için arayabilirsiniz. Referanslarım mevcut.',
      city: 'İstanbul',
      district: 'Beşiktaş',
      hourlyRateMin: 250,
      hourlyRateMax: 450,
      serviceRadiusKm: 20,
      isAvailable: true,
      gender: 'female',
    },
  },
  {
    email: 'kemal.sahin.seed@yapgitsin.tr',
    pass:  'Yapgitsin1234!',
    patch: {
      workerBio: 'Elektrik tesisatı + klima/kombi bakım onarım. Sigortalı çalışıyorum, kalite garantisi veriyorum. Acil arızalarda 2 saat içinde geliyorum.',
      city: 'Ankara',
      district: 'Çankaya',
      hourlyRateMin: 400,
      hourlyRateMax: 750,
      serviceRadiusKm: 30,
      isAvailable: true,
      gender: 'male',
    },
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // Admin token to verify identity (mavi tik) for all 3
  const ar = await fetch(`${BASE}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'yapgitsin_admin_pass_34' }),
  });
  const { access_token: atok } = await ar.json();

  for (const s of seeds) {
    // Login as seed
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: s.email, password: s.pass }),
    });
    if (!r.ok) {
      console.log('FAIL login', s.email, r.status);
      continue;
    }
    const { access_token: tok, user } = await r.json();
    console.log('—', user.fullName, '(' + user.id.slice(0, 8) + ')');

    // Patch profile
    const p = await fetch(`${BASE}/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
      body: JSON.stringify(s.patch),
    });
    console.log('  patch:', p.status);

    // Admin verify (mavi tik)
    const v = await fetch(`${BASE}/admin/users/${user.id}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + atok },
      body: JSON.stringify({ identityVerified: true }),
    });
    console.log('  verify:', v.status);
    await sleep(200);
  }

  // Wait briefly for cache; verify
  await sleep(2000);
  for (const s of seeds) {
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: s.email, password: s.pass }),
    });
    const { user } = await r.json();
    const v = await fetch(`${BASE}/users/${user.id}/profile`);
    const txt = await v.text();
    const d = JSON.parse(txt);
    console.log('VERIFY', user.fullName, '→ bio:', !!d.workerBio, 'city:', d.city, 'rate:', d.hourlyRateMin + '-' + d.hourlyRateMax, 'verified:', d.identityVerified);
  }
})().catch((e) => { console.error(e); process.exit(1); });
