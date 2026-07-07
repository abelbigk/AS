#!/usr/bin/env node
/**
 * Manual React Native bundle creation for Android release build
 * Run this before building the APK to ensure index.android.bundle exists
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = __dirname;
const bundleDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets');
const bundlePath = path.join(bundleDir, 'index.android.bundle');
const sourcemapPath = path.join(bundleDir, 'index.android.bundle.map');

// Ensure assets directory exists
if (!fs.existsSync(bundleDir)) {
  fs.mkdirSync(bundleDir, { recursive: true });
  console.log(`✓ Created ${bundleDir}`);
}

console.log('Creating React Native bundle for Android...');

try {
  // Use Expo CLI to create the bundle
  execSync(
    `npx expo export:embed --platform android --output-dir "${bundleDir}" --entry-file index.js`,
    { stdio: 'inherit', cwd: projectRoot }
  );
  
  console.log(`✓ Bundle created at ${bundlePath}`);
  console.log(`✓ Sourcemap created at ${sourcemapPath}`);
  
  // Verify the bundle exists
  if (fs.existsSync(bundlePath)) {
    const size = (fs.statSync(bundlePath).size / 1024 / 1024).toFixed(2);
    console.log(`✓ Bundle size: ${size} MB`);
  } else {
    throw new Error('Bundle file was not created!');
  }
} catch (error) {
  console.error('✗ Failed to create bundle:', error.message);
  process.exit(1);
}
