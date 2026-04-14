const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow PDF files to be bundled as Metro assets (needed for catalog PDFs on iOS/Android/web)
config.resolver.assetExts.push('pdf');

module.exports = config;
