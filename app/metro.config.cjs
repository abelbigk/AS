const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const repoRoot = path.resolve(__dirname, '..');

config.projectRoot = __dirname;
config.watchFolders = [repoRoot];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'copy-anything': path.join(__dirname, 'node_modules', 'copy-anything', 'dist', 'index.js'),
  'is-what': path.join(__dirname, 'node_modules', 'is-what', 'dist', 'index.js'),
};

module.exports = config;
