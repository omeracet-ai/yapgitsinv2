#!/usr/bin/env node
/**
 * Voldi-db — Google Play Console review demo account creator.
 *
 * Creates a canonical demo user in Firebase Auth + Firestore so the Play
 * Console review team can sign in to the app during review.
 *
 * Auth: firebase-admin Application Default Credentials.
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "D:\Yapgitsinv2\.secrets\yapgitsinv2-firebase-adminsdk.json"
 *
 * Usage:
 *   node scripts/create-play-review-account.js
 *   node scripts/create-play-review-account.js --email=demo@yapgitsin.tr
 *   node scripts/create-play-review-account.js --rotate   # rotate password if user exists
 *
 * Output: writes credentials to D:\Yapgitsinv2\.secrets\play-review-account.txt
 * (gitignored). Password is NEVER printed to stdout.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Module = require('module');

// Reuse firebase-admin installed in firebase/functions
const adminPath = path.resolve(__dirname, '../firebase/functions/node_modules');
if (!Module.globalPaths.includes(adminPath)) Module.globalPaths.push(adminPath);

let admin;
try {
  admin = require(path.join(adminPath, 'firebase-admin'));
} catch (e) {
  console.error('[play-review] firebase-admin not found at', adminPath);
  console.error('  Run: cd firebase/functions && npm install');
  process.exit(2);
}

// ─── Args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name, fallback = undefined) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split('=').slice(1).join('=');
  if (args.includes(`--${name}`)) return true;
  return fallback;
}

const EMAIL = flag('email', 'playconsole-review@yapgitsin.tr');
const DISPLAY_NAME = flag('name', 'Play Review Tester');
const ROTATE = !!flag('rotate', false);
const PROJECT_ID = flag('project', 'yapgitsinv2');

// ─── Password generator (CSPRNG, 22 chars, mixed) ───────────────────────
function generatePassword(len = 22) {
  // Avoid ambiguous chars (0/O, 1/l/I) and shell-special chars.
  const charset =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#%+=-';
  const out = [];
  const buf = crypto.randomBytes(len * 2);
  let i = 0;
  while (out.length < len && i < buf.length) {
    const v = buf[i++];
    const idx = v % charset.length;
    // Rejection sampling for uniform distribution
    if (v < Math.floor(256 / charset.length) * charset.length) {
      out.push(charset[idx]);
    }
  }
  // Guarantee at least one lower/upper/digit/symbol
  if (!/[a-z]/.test(out.join(''))) out[0] = 'a';
  if (!/[A-Z]/.test(out.join(''))) out[1] = 'Z';
  if (!/[0-9]/.test(out.join(''))) out[2] = '7';
  if (!/[@#%+=\-]/.test(out.join(''))) out[3] = '#';
  return out.join('');
}

// ─── Init admin ────────────────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
});
const auth = admin.auth();
const db = admin.firestore();

async function main() {
  const password = generatePassword(22);
  let userRecord;
  let action = 'created';

  try {
    userRecord = await auth.createUser({
      email: EMAIL,
      password,
      displayName: DISPLAY_NAME,
      emailVerified: true,
      disabled: false,
    });
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      userRecord = await auth.getUserByEmail(EMAIL);
      if (ROTATE) {
        await auth.updateUser(userRecord.uid, {
          password,
          displayName: DISPLAY_NAME,
          emailVerified: true,
          disabled: false,
        });
        action = 'rotated';
      } else {
        console.error(
          `[play-review] User ${EMAIL} already exists. Use --rotate to reset password.`
        );
        console.error(`  uid=${userRecord.uid}`);
        process.exit(3);
      }
    } else {
      throw e;
    }
  }

  // Firestore profile (matches firebase/functions onUserCreated shape).
  // Best-effort: if the project has no Firestore database provisioned,
  // log and continue — Auth account alone is enough for Play sign-in.
  let firestoreStatus = 'written';
  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('users').doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: DISPLAY_NAME,
        photoURL: null,
        phone: null,
        role: 'client',
        isVerified: true,
        isActive: true,
        isReviewAccount: true,
        city: 'İstanbul',
        latitude: 41.0082,
        longitude: 28.9784,
        locationApprox: true,
        locationSource: 'city-centroid',
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (fe) {
    firestoreStatus = `skipped (${fe.code || 'err'}: ${(fe.message || '').slice(0, 80)})`;
    console.error('[play-review] Firestore write failed:', firestoreStatus);
  }

  // Write secret file
  const secretDir = path.resolve(__dirname, '..', '.secrets');
  fs.mkdirSync(secretDir, { recursive: true });
  const secretPath = path.join(secretDir, 'play-review-account.txt');
  const iso = new Date().toISOString();
  const content = [
    '# Google Play Console — App access (test account)',
    '# Paste these into Play Console → Policy → App content → App access.',
    '# DO NOT COMMIT. .secrets/ is gitignored.',
    '',
    `email=${EMAIL}`,
    `password=${password}`,
    `displayName=${DISPLAY_NAME}`,
    `uid=${userRecord.uid}`,
    `project=${PROJECT_ID}`,
    `action=${action}`,
    `firestoreProfile=${firestoreStatus}`,
    `createdAt=${iso}`,
    '',
    '# Notes:',
    '# - emailVerified=true so the account works without mailbox access.',
    '# - role=client (standard user, not admin).',
    '# - Firestore users/{uid} doc is populated with isReviewAccount=true.',
    '# - If reviewers need sample data, run optional seeder separately.',
    '',
  ].join('\n');
  fs.writeFileSync(secretPath, content, { encoding: 'utf8', mode: 0o600 });

  // stdout — NEVER print the password
  console.log(JSON.stringify(
    {
      ok: true,
      action,
      email: EMAIL,
      uid: userRecord.uid,
      project: PROJECT_ID,
      passwordSavedTo: secretPath,
      firestoreProfile: firestoreStatus,
      hint: 'Password length: ' + password.length + ' chars',
    },
    null,
    2
  ));
}

main().catch((err) => {
  console.error('[play-review] FATAL:', err && err.message ? err.message : err);
  if (err && err.code) console.error('  code=' + err.code);
  process.exit(1);
});
