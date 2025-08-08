describe('Attraction Screen', () => {
  // IMPORTANT: Yeh test assume kar raha hai ki aap pehle se hi Attraction screen par hain.
  // Asal project mein, aapko pehle login karna hoga aur calendar se is screen par navigate karna hoga.
  // Hum uss hisse ko baad mein add kar sakte hain.

  beforeAll(async () => {
    // App ko dobara launch karein taaki test saaf state se shuru ho.
    // Agar aapki app login screen par jaati hai, to aapko yahan login aur navigate ke steps add karne honge.
    await device.launchApp({ newInstance: true });

    // Example: Agar login ke baad calendar par jaate hain, to wahan se navigate karein.
    // await element(by.id('some-calendar-day-button')).tap();
    // Isko abhi ke liye comment kar rahe hain.
  });

  it('should display the main elements of the attraction screen', async () => {
    // Wait for the screen to load (max 15 seconds)
    await waitFor(element(by.id('page-title')))
      .toBeVisible()
      .withTimeout(15000);

    // Check if the title is correct
    await expect(element(by.id('page-title'))).toHaveText('Express Attraction To');

    // Check if the target user's name is visible
    await expect(element(by.id('target-user-name'))).toBeVisible();

    // Check if the submit button is visible
    await expect(element(by.id('submit-attraction-button'))).toBeVisible();
  });

  it('should update slider values and labels correctly', async () => {
    // --- Test Romantic Slider ---
    // Slider ko 100% (position 1.0) par set karein, jo value 3 ke barabar hai.
    await element(by.id('romantic-slider')).adjustSliderToPosition(1.0);
    // Check karein ki label "Partner" ho gaya hai.
    await expect(element(by.id('romantic-slider-value-label'))).toHaveText('Partner');

    // --- Test Sexual Slider ---
    // Slider ko 66% (position 0.66) par set karein, jo value 2 ke barabar hai.
    await element(by.id('sexual-slider')).adjustSliderToPosition(0.66);
    // Check karein ki label "Turned on" ho gaya hai.
    await expect(element(by.id('sexual-slider-value-label'))).toHaveText('Turned on');

    // --- Test Friendship Slider ---
    // Slider ko 33% (position 0.33) par set karein, jo value 1 ke barabar hai.
    await element(by.id('friendship-slider')).adjustSliderToPosition(0.33);
    // Check karein ki label "Hi" ho gaya hai.
    await expect(element(by.id('friendship-slider-value-label'))).toHaveText('Hi');
  });

  it('should show an error popup if trying to submit with 0 rating', async () => {
    // Pehle saare sliders ko 0 par reset karein
    await element(by.id('romantic-slider')).adjustSliderToPosition(0.0);
    await element(by.id('sexual-slider')).adjustSliderToPosition(0.0);
    await element(by.id('friendship-slider')).adjustSliderToPosition(0.0);

    // Submit button par tap karein
    await element(by.id('submit-attraction-button')).tap();

    // Check karein ki error popup dikh raha hai
    await waitFor(element(by.id('popup-title')))
      .toBeVisible()
      .withTimeout(2000);
    await expect(element(by.id('popup-title'))).toHaveText('No Rating Set');
    await expect(element(by.id('popup-message'))).toHaveText('Please adjust at least one slider.');

    // Popup ko band karein
    await element(by.id('popup-ok-button')).tap();
  });

  it('should show success popup on successful submission', async () => {
    // Kam se kam ek slider ko set karein
    await element(by.id('romantic-slider')).adjustSliderToPosition(0.33); // Set to 1

    // Submit button par tap karein
    await element(by.id('submit-attraction-button')).tap();

    // Check karein ki success popup dikh raha hai
    // Note: Is test ke liye aapko API call ko mock karna pad sakta hai taaki woh hamesha success de.
    // Abhi ke liye hum assume kar rahe hain ki API call kamyaab hogi.
    await waitFor(element(by.id('popup-title')))
      .toBeVisible()
      .withTimeout(10000); // API call ke liye zyada time
    await expect(element(by.id('popup-title'))).toHaveText('Success!');

    // Popup ko band karein
    await element(by.id('popup-ok-button')).tap();
  });
});
