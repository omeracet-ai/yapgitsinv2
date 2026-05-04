const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hizmet_db.sqlite');

// Admin kullanicisini tam yetkilendir
db.run(
  UPDATE users SET
    tokenBalance     = 999999,
    identityVerified = 1,
    isPhoneVerified  = 1,
    isAvailable      = 1,
    workerCategories = '["Temizlik","Boya & Badana","Nakliyat","Elektrikci","Tesisat","Klima Servis","Mobilya Montaj"]',
    workerBio        = 'Platform yoneticisi - tum kategorilerde yetkili.',
    hourlyRateMin    = 0,
    hourlyRateMax    = 9999,
    serviceRadiusKm  = 999,
    city             = 'Istanbul',
    district         = 'Tum Sehirler',
    asCustomerTotal  = 0,
    asWorkerTotal    = 0,
    reputationScore  = 999
  WHERE role = 'admin'
, function(e) {
  if (e) { console.log('HATA:', e.message); }
  else    { console.log('Admin tam yetkilendirildi. Etkilenen:', this.changes, 'kayit'); }

  db.get("SELECT id, fullName, email, role, tokenBalance, identityVerified, isPhoneVerified FROM users WHERE role='admin'", function(e2, r) {
    if (r) {
      console.log('');
      console.log('=== ADMIN KULLANICI ===');
      console.log('ID              :', r.id);
      console.log('Ad              :', r.fullName);
      console.log('Email           :', r.email);
      console.log('Rol             :', r.role);
      console.log('Token Bakiyesi  :', r.tokenBalance);
      console.log('Kimlik Dogrulama:', r.identityVerified ? 'ONAYLANDI' : 'bekliyor');
      console.log('Telefon Dogrulama:', r.isPhoneVerified ? 'ONAYLANDI' : 'bekliyor');
      console.log('');
      console.log('Giris Bilgileri:');
      console.log('  Admin Panel  -> username: admin  | sifre: admin');
      console.log('  Flutter App  -> email: admin@hizmet.app | sifre: admin');
    }
    db.close();
  });
});
