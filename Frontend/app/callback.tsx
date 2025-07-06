// --- COMPLETE UPDATED CODE: app/callback.tsx ---

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function CallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Pehla useEffect sirf ek baar chalega, auth errors ko check karne ke liye.
  useEffect(() => {
    console.log('CallbackScreen: Mounted.');

    // Auth0 se redirect hone par error check karein.
    if (params.error) {
      console.error(
        'CallbackScreen: Received an error from Auth0:',
        params.error,
        params.error_description ? `- ${params.error_description}` : ''
      );
      // User ko error dikhakar login page par bhej dein.
      // Yahan alert dikhana bhi ek achha option ho sakta hai.
      router.replace('/(auth)/login');
      return;
    }

    // Agar code aur state hai, toh AuthContext isko handle kar raha hai.
    // Humein yahan kuch khaas karne ki zaroorat nahi hai.
    if (params.code && params.state) {
      console.log('CallbackScreen: Code received. AuthContext is handling token exchange.');
    }
  }, []); // Iska dependency array khaali rakhein taaki yeh sirf ek baar chale.

  // Dusra useEffect auth state (user) ke badlav ko dekhta rahega.
  useEffect(() => {
    // AuthContext ne user ko successfully load kar liya hai.
    if (user && !isAuthLoading) {
      console.log(
        'CallbackScreen: AuthContext confirms user is authenticated. RootLayout will handle redirect.'
      );
      // Yahan se redirect karne ki bajaye, RootLayout ko karne dein.
      // Lekin ek fallback ke taur par yahan bhi rakhna surakshit hai.
      // router.replace('/(app)/calendar'); // Commented out to let RootLayout handle it
    }
  }, [user, isAuthLoading, router]);

  // Jab tak authentication chal raha hai, loading screen dikhayein.
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={styles.text}>Completing sign in...</Text>
      <Text style={styles.subText}>Please wait, we are securely authenticating you.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    color: '#ffffff',
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
});
