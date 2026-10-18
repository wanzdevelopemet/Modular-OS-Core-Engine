const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const srcPublic = path.join(projectRoot, 'modules', 'forum-module', 'public');
const srcFrontend = path.join(projectRoot, 'modules', 'forum-module', 'frontend');
const destDir = path.join(projectRoot, 'modules', 'forum-module', 'frontend', 'dist');

const source = fs.existsSync(srcPublic) ? srcPublic : srcFrontend;

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.cpSync(source, destDir, {
  recursive: true,
  filter: (src) => !src.includes(path.sep + 'dist') && !src.endsWith('dist')
});

console.log(`[Forum Staging] Staged static assets from ${path.relative(projectRoot, source)} -> ${path.relative(projectRoot, destDir)}`);

