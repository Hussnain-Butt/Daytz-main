// Test ko fail hone ke liye 5 minute (300,000 ms) dein
jest.setTimeout(300000);

describe('Login Screen', () => {
  // Har test se pehle app ko relaunch karein
  beforeAll(async () => {
    // delete: true app ki purani state ko saaf kar dega
    await device.launchApp({ newInstance: true, delete: true });
  });

  it('should show the login screen with welcome text', async () => {
    // Check karein ki 'welcome-text' wala element screen par dikh raha hai
    // Hum 30 second tak wait karenge
    await waitFor(element(by.id('welcome-text')))
      .toBeVisible()
      .withTimeout(30000);

    // Check karein ki text "Welcome to Daytz" hai
    await expect(element(by.id('welcome-text'))).toHaveText('Welcome to Daytz');
  });

  it('should show the login button and be tappable', async () => {
    // Check karein ki 'login-button' screen par hai
    await expect(element(by.id('login-button'))).toBeVisible();

    // Button par tap karein
    await element(by.id('login-button')).tap();
  });
});
