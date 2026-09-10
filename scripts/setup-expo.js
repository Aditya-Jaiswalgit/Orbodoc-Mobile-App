const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

// 1. Ensure assets directory & icons
const assetsDir = path.join(projectRoot, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const generatedIconPath = 'C:\\Users\\asus\\.gemini\\antigravity-ide\\brain\\9206f02d-a693-49c3-a4f9-4a6ebb8e6ec6\\icon_1787723200958.jpg';
const targetFiles = ['icon.png', 'splash-icon.png', 'adaptive-icon.png', 'favicon.png'];

// Minimal valid 1x1 transparent PNG base64
const minimalPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

for (const file of targetFiles) {
  const targetPath = path.join(assetsDir, file);
  // Project artwork must never be overwritten by a startup script.
  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, Buffer.from(minimalPngBase64, 'base64'));
    console.log(`[Expo Setup] Created missing assets/${file}`);
  }
}
