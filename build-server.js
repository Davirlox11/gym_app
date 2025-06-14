const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Replace problematic db-storage.ts with the working version
  const sourceFile = path.join(__dirname, 'server', 'db-storage-alt.ts');
  const targetFile = path.join(__dirname, 'server', 'db-storage.ts');
  
  if (fs.existsSync(sourceFile)) {
    fs.copyFileSync(sourceFile, targetFile);
    console.log('Updated db-storage.ts with corrected version');
  }
  
  // Build with esbuild
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  console.log('Server build completed successfully');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}