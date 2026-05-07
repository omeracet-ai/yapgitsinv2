// One-shot patch: add length: 36 to FK columns referencing UUID PKs.
// Targets `@Column({ type: 'varchar' [, nullable: true] })` immediately followed by `<name>Id:` field.
const fs = require('fs');
const path = require('path');

const targets = [
  'src/modules/jobs/job-question-reply.entity.ts',
  'src/modules/jobs/job-question.entity.ts',
  'src/modules/jobs/job.entity.ts',
  'src/modules/jobs/offer.entity.ts',
  'src/modules/bookings/booking.entity.ts',
  'src/modules/notifications/notification.entity.ts',
  'src/modules/service-requests/service-request.entity.ts',
  'src/modules/service-requests/service-request-application.entity.ts',
  'src/modules/providers/provider.entity.ts',
  'src/modules/reviews/review.entity.ts',
  'src/modules/tokens/token-transaction.entity.ts',
];

// Match: @Column({ type: 'varchar' [optional , nullable: true] })\n   <name>Id: ...
// Replace by injecting `, length: 36` before the closing `}`
const re = /@Column\(\{\s*type:\s*'varchar'((?:,\s*nullable:\s*true)?)\s*\}\)(\s*\n\s*\w+Id\s*:)/g;

let totalPatched = 0;
for (const rel of targets) {
  const file = path.join(__dirname, rel);
  if (!fs.existsSync(file)) { console.warn('[skip] missing', rel); continue; }
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(re, (_, nullable, tail) =>
    `@Column({ type: 'varchar', length: 36${nullable} })${tail}`);
  if (after !== before) {
    const count = (after.match(/length: 36/g) || []).length - (before.match(/length: 36/g) || []).length;
    fs.writeFileSync(file, after);
    console.log(`[patched] ${rel} (+${count} columns)`);
    totalPatched += count;
  } else {
    console.log(`[noop]    ${rel}`);
  }
}
console.log(`\n[done] ${totalPatched} FK columns patched`);
