// Post-build script for IIS/iisnode deployment.
// Runs after `next build` to prepare dist/standalone/ for Plesk.
const fs   = require('fs');
const path = require('path');

const standalone = path.join(__dirname, '../dist/standalone');
const dist       = path.join(__dirname, '../dist');
const publicDir  = path.join(__dirname, '../public');

// 1. Patch server.js: handle iisnode named-pipe PORT
const serverJs = path.join(standalone, 'server.js');
let src = fs.readFileSync(serverJs, 'utf8');
if (!src.includes('isNaN(Number(rawPort))')) {
  src = src.replace(
    'const currentPort = parseInt(process.env.PORT, 10) || 3000',
    `const rawPort = process.env.PORT\nconst currentPort = (rawPort && isNaN(Number(rawPort))) ? rawPort : (parseInt(rawPort, 10) || 3000)`
  );
  fs.writeFileSync(serverJs, src);
  console.log('✓ server.js iisnode pipe patch applied');
}

// 2. Copy static files
const staticSrc  = path.join(dist, 'static');
const staticDest = path.join(standalone, 'dist', 'static');
fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
console.log('✓ static files copied to standalone/dist/static');

// 3. Copy public dir
if (fs.existsSync(publicDir)) {
  const publicDest = path.join(standalone, 'public');
  fs.cpSync(publicDir, publicDest, { recursive: true, force: true });
  console.log('✓ public/ copied to standalone/public');
}

// 4. Write web.config
const webConfig = `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>

    <handlers>
      <remove name="OPTIONSVerbHandler" />
      <add name="iisnode" path="server.js" verb="*" modules="iisnode" />
    </handlers>

    <defaultDocument>
      <files>
        <clear />
        <add value="index.html" />
      </files>
    </defaultDocument>

    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^server.js\\/debug[\\/]?" />
        </rule>

        <rule name="StaticContent" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^_next/static/.*" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" />
          </conditions>
          <action type="None" />
        </rule>

        <rule name="DynamicContent" patternSyntax="ECMAScript">
          <match url=".*" />
          <action type="Rewrite" url="server.js" />
        </rule>
      </rules>
    </rewrite>

    <security>
      <requestFiltering>
        <hiddenSegments>
          <clear />
          <add segment="web.config" />
          <add segment="node_modules" />
          <add segment="iisnode" />
          <add segment=".env" />
        </hiddenSegments>
      </requestFiltering>
    </security>

    <httpErrors errorMode="Detailed" />

  </system.webServer>
</configuration>`;

fs.writeFileSync(path.join(standalone, 'web.config'), webConfig);
console.log('✓ web.config written');

console.log('\n✅ IIS postbuild complete.');
