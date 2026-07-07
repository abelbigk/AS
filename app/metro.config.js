const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('tailwindcss-react-native');

const config = getDefaultConfig(__dirname);

module.exports = config;
