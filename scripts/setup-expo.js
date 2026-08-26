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

for (const file of targetFiles) {
  const targetPath = path.join(assetsDir, file);
  if (fs.existsSync(generatedIconPath)) {
    fs.copyFileSync(generatedIconPath, targetPath);
    console.log(`[Expo Setup] Copied generated icon to assets/${file}`);
  } else {
    const minimalPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    fs.writeFileSync(targetPath, Buffer.from(minimalPngBase64, 'base64'));
    console.log(`[Expo Setup] Created fallback assets/${file}`);
  }
}

// 2. Remove legacy React Native CLI bare directories and files for clean Expo project
const legacyPathsToRemove = ['android', 'ios', 'Gemfile', '.bundle'];

for (const item of legacyPathsToRemove) {
  const itemPath = path.join(projectRoot, item);
  if (fs.existsSync(itemPath)) {
    try {
      fs.rmSync(itemPath, { recursive: true, force: true });
      console.log(`[Expo Clean] Removed legacy React Native CLI item: ${item}`);
    } catch (err) {
      console.warn(`[Expo Clean] Warning removing ${item}:`, err.message);
    }
  }
}
