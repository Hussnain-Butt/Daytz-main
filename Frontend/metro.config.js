const { getDefaultConfig } = require('expo/metro-config'); // Use 'expo/metro-config' instead of '@expo/metro-config'

const config = getDefaultConfig(__dirname); // No extra parenthesis

module.exports = config;
