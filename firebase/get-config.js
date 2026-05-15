const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

const path = require('path');
const keyPath = process.env.FIREBASE_ADMIN_KEY_PATH
  || path.resolve(__dirname, '..', '.secrets', 'yapgitsinv2-firebase-adminsdk.json');
const sa = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

function base64url(buf) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function makeJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = base64url(Buffer.from(JSON.stringify({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase',
  })));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = base64url(sign.sign(sa.private_key));
  return `${header}.${payload}.${sig}`;
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': data.length }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: 'GET', headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const tokenRes = await post('https://oauth2.googleapis.com/token',
    `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${makeJwt()}`);
  const token = tokenRes.access_token;

  // Web apps listele
  const apps = await get(
    `https://firebase.googleapis.com/v1beta1/projects/yapgitsinv2/webApps`,
    token
  );
  console.log('WEB APPS:', JSON.stringify(apps, null, 2));

  if (apps.apps && apps.apps.length > 0) {
    const appId = apps.apps[0].appId;
    const config = await get(
      `https://firebase.googleapis.com/v1beta1/projects/yapgitsinv2/webApps/${appId}/config`,
      token
    );
    console.log('\nWEB CONFIG:', JSON.stringify(config, null, 2));
  }

  // Android apps
  const android = await get(
    `https://firebase.googleapis.com/v1beta1/projects/yapgitsinv2/androidApps`,
    token
  );
  console.log('\nANDROID APPS:', JSON.stringify(android, null, 2));
})();
