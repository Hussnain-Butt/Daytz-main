// File: app/index.tsx
// ✅ COMPLETE AND FINAL CORRECTED CODE (Smart Entry Point)

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

/**
 * This is the root entry point of the app.
 * Its only job is to check the authentication status from `useAuth`
 * and immediately redirect the user to the correct part of the app.
 * It shows a loading indicator while the initial `isReady` check is happening.
 */
export default function RootIndex() {
  const { isReady, auth0User } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the auth state is determined.
    if (!isReady) {
      return;
    }

    // Once the auth state is ready, navigate away from this root index page.
    if (auth0User) {
      // User is logged in, go to the main app stack.
      router.replace('/(app)/calendar');
    } else {
      // User is not logged in, go to the login screen.
      router.replace('/(auth)/login');
    }
  }, [isReady, auth0User, router]); // Effect runs when auth state is ready

  // While the useEffect is waiting for `isReady`, show a loading screen.
  // This is the same loading screen as in `_layout.tsx` to provide a
  // seamless experience.
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827', // Match your theme
  },
});
