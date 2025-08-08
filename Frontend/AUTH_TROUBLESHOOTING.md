# Auth0 Authentication Troubleshooting Guide

## Issues Fixed

### 1. Redirect URI Mismatch
- **Problem**: Backend had `com.daytz://oauth/callback` while frontend expected `com.daytz.app://callback`
- **Fix**: Updated backend auth_config.json to match frontend

### 2. Android Deep Linking Configuration
- **Problem**: Auth0 scheme was set to `com.daytz.app.auth0` instead of `com.daytz.app`
- **Fix**: Updated app.json and withAndroidAuth0.js to use consistent scheme

### 3. Intent Filters
- **Problem**: Missing proper intent filters for Auth0 callback
- **Fix**: Added additional intent filter for Auth0 callback path

## Testing Steps

1. **Build and Install App**
   ```bash
   cd Frontend-Fresh
   npm install
   expo run:android
   # or
   expo run:ios
   ```

2. **Test Deep Linking**
   - Navigate to DeepLinkTest screen in your app
   - Try the "Test Basic Deep Link" button
   - Try the "Test Callback with Params" button
   - Both should redirect to callback screen

3. **Test Authentication Flow**
   - Go to login screen
   - Tap "Login / Sign Up"
   - Browser should open with Auth0 login
   - After login, should redirect back to app

## Auth0 Dashboard Settings

Make sure these settings are correct in your Auth0 dashboard:

### Application Settings
- **Application Type**: Native
- **Allowed Callback URLs**: 
  ```
  com.daytz.app://callback
  ```
- **Allowed Logout URLs**:
  ```
  com.daytz.app://logout-complete
  ```

### Advanced Settings → Grant Types
Make sure these are enabled:
- ✅ Authorization Code
- ✅ Refresh Token
- ✅ Implicit

## Common Issues and Solutions

### "Browser window was closed" Error
- **Cause**: App scheme mismatch or intent filter issue
- **Solution**: Ensure all schemes match exactly (`com.daytz.app`)

### App doesn't return after Auth0 login
- **Cause**: Intent filter not working or scheme mismatch
- **Solution**: Check app.json intent filters and rebuild app

### "No authentication data received"
- **Cause**: Auth0 callback not reaching the app
- **Solution**: Test deep linking first, then check Auth0 dashboard settings

## Debug Commands

### Check if deep linking is working:
```bash
# Android
adb shell am start -W -a android.intent.action.VIEW -d "com.daytz.app://callback?code=test" com.daytz.app

# iOS (Simulator)
xcrun simctl openurl booted "com.daytz.app://callback?code=test"
```

### Check app logs:
```bash
# React Native
npx react-native log-android
# or
npx react-native log-ios

# Expo
expo logs
```

## Files Modified

1. `Backend/auth_config.json` - Fixed redirect URI
2. `Frontend-Fresh/app.json` - Fixed Android scheme and intent filters
3. `Frontend-Fresh/withAndroidAuth0.js` - Fixed Auth0 scheme
4. `Frontend-Fresh/app/callback.tsx` - Improved callback handling
5. `Frontend-Fresh/contexts/AuthContext.tsx` - Better error handling
6. `Frontend-Fresh/app/DeepLinkTest.tsx` - Testing utilities

## Next Steps

1. Rebuild the app completely
2. Test deep linking using DeepLinkTest screen
3. Test authentication flow
4. If issues persist, check Auth0 dashboard settings
5. Enable Auth0 logs for debugging

## Contact

If authentication still doesn't work after following this guide, please share:
1. Complete logs from app startup to login attempt
2. Screenshots of Auth0 dashboard settings
3. Results from DeepLinkTest screen 