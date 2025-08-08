// File: app/(app)/thank-you.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../../store/useUserStore'; // Adjust path if your store is elsewhere
import { colors } from '../../utils/theme'; // Adjust path if your theme is elsewhere
import { SafeAreaView } from 'react-native-safe-area-context';

const ThankYouScreen = () => {
  const router = useRouter();
  const {
    userProfile,
    setProfileJustCompletedForNav,
    setShowThankYouAfterAuth,
    showThankYouAfterAuth,
    profileJustCompletedForNav,
  } = useUserStore();

  useEffect(() => {
    console.log('ThankYouScreen: Mounted. Starting 3-second timer.');
    const timer = setTimeout(() => {
      console.log('ThankYouScreen: Timer elapsed. Resetting flags and navigating.');
      if (setProfileJustCompletedForNav) {
        setProfileJustCompletedForNav(false);
      }
      if (setShowThankYouAfterAuth) {
        setShowThankYouAfterAuth(false);
      }

      if (userProfile && !userProfile.is_profile_complete) {
        console.log('ThankYouScreen: Profile still incomplete, navigating to /profile.');
        router.replace('/(app)/profile');
      } else {
        console.log(
          'ThankYouScreen: Profile complete or no profile data, navigating to /calendar.'
        );
        router.replace('/(app)/calendar');
      }
    }, 3000); // 3 seconds

    return () => {
      console.log('ThankYouScreen: Unmounting. Clearing timer.');
      clearTimeout(timer);
    };
  }, [router, userProfile, setProfileJustCompletedForNav, setShowThankYouAfterAuth]);

  let titleText = 'Processing...'; // Fallback title
  let messageText = 'Please wait a moment.'; // Fallback message

  if (showThankYouAfterAuth) {
    // This is for when the user has just logged in / new profile created
    titleText = 'Welcome!';
    messageText =
      'You have taken your first step to getting out and meeting new people! Congratulations!';
  } else if (profileJustCompletedForNav) {
    // This is for when the user manually completes their profile
    titleText = 'Profile Complete!';
    messageText = 'Thank you for setting up your profile.';
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.popupContainer}>
        {/* Calc Happy Image */}
        <Image source={require('../../assets/calc-happy.png')} style={styles.popupImage} />
        {/* Message Box */}
        <View style={styles.bubble}>
          <Text style={styles.popupTitle}>{titleText}</Text>
          <Text style={styles.popupMessage}>{messageText}</Text>
          <Text style={styles.subMessage}>We're getting things ready for you...</Text>
          <ActivityIndicator
            size="large"
            color={colors.GoldPrimary || '#FFD700'}
            style={styles.spinner}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.Background || '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
  },
  popupImage: {
    width: 220, // Image ka size bada kiya gaya hai
    height: 220,
    resizeMode: 'contain',
    zIndex: 1,
    marginBottom: -80, // Image ko bubble ke upar overlap karne ke liye
  },
  bubble: {
    width: '90%',
    backgroundColor: '#FFFFFF', // Light white background
    borderRadius: 25,
    padding: 20,
    paddingTop: 90, // Image ke overlap ke liye top padding
    alignItems: 'center', // Bubble ke content ko center align kiya gaya hai
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  popupTitle: {
    fontSize: 28, // Title ka size ahem hai
    fontWeight: 'bold',
    color: '#000000', // Dark text for light background
    textAlign: 'center',
    marginBottom: 15,
  },
  popupMessage: {
    fontSize: 17,
    color: '#333333', // Dark grey text
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  subMessage: {
    fontSize: 17,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  spinner: {
    marginTop: 20, // Spinner aur text ke beech thoda faasla
  },
});

export default ThankYouScreen;
