const { withProjectBuildGradle } = require('@expo/config-plugins');

const withGradlePlugin = (config) => {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy') {
      // Add the maven repository to the buildscript repositories
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /buildscript\s*\{\s*repositories\s*\{/,
        `buildscript {
    repositories {
        maven {
            url "https://plugins.gradle.org/m2/"
        }`
      );
    }
    return cfg;
  });
};

module.exports = withGradlePlugin;
