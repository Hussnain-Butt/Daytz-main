const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function (config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('Cannot modify an Android build.gradle file that is not groovy');
    }

    const newConfig = `
                manifestPlaceholders = [
                    auth0Domain: "dev-il3jgemg2szpurs5.us.auth0.com",
                    auth0Scheme: "com.daytz.app"
                ]
    `;

    // defaultConfig ke andar isey daal do
    config.modResults.contents = config.modResults.contents.replace(
      /defaultConfig\s?{/,
      `defaultConfig {\n${newConfig}`
    );

    return config;
  });
};
