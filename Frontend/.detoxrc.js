/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      // Yeh path check kar lein, aam taur par yahi hota hai
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      // Yeh command aapki app ka debug version banayegi
      build:
        'cd android && gradlew.bat assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..',
    },
  },
  devices: {
    attached: {
      type: 'android.attached',
      device: {
        // Yahan aapki device ID aayegi
        adbName: '057633707H005791',
      },
    },
  },
  configurations: {
    'android.attached.debug': {
      device: 'attached',
      app: 'android.debug',
    },
  },
};
