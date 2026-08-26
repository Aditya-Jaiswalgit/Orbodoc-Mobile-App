// Auto-ensure Expo assets
try {
  require('./scripts/setup-expo.js');
} catch (e) {
  // Ignore if script fails
}

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
