// Phase 258 — cross-platform launcher for patch-nextjs-iisnode.ps1.
// Invoked by the npm `postbuild` lifecycle hook (runs automatically after `build`).
// On win32 it runs the PowerShell pipe-PORT patch (idempotent — no-ops if the
// JS postbuild already applied the same shim). On other platforms it no-ops so
// CI / local non-Windows builds don't fail.
const { execFileSync } = require('child_process');
const path = require('path');

if (process.platform !== 'win32') {
  console.log('postbuild: skip iisnode pipe patch (non-win32)');
  process.exit(0);
}

const script = path.join(__dirname, 'patch-nextjs-iisnode.ps1');
try {
  execFileSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script],
    { stdio: 'inherit' },
  );
} catch (e) {
  console.error('postbuild: iisnode pipe patch failed:', e.message);
  process.exit(1);
}
