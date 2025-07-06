import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useUserStore } from '../store/useUserStore';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Step 1: Import zaroori providers
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

function RootLayoutNav() {
  const { auth0User, isLoading } = useAuth();
  const { showThankYouAfterAuth } = useUserStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const isUserLoggedIn = !!auth0User;
    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    // SCENARIO 1: User is Logged IN
    if (isUserLoggedIn) {
      // Priority 1: Agar 'showThankYou' flag on hai, to foran thank-you screen par bhejein.
      if (showThankYouAfterAuth) {
        router.replace('/(app)/thank-you');
        return;
      }
      // Priority 2: Agar user logged in hai lekin (auth) group ya root page par hai,
      // to usay app ke andar default screen par bhejein.
      if (!inAppGroup) {
        router.replace('/(app)/calendar');
        return;
      }
    }
    // SCENARIO 2: User is Logged OUT
    else {
      // Agar user logged out hai aur woh (auth) group mein nahi hai,
      // to usay foran login screen par bhejein.
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
        return;
      }
    }
  }, [auth0User, isLoading, segments, router, showThankYouAfterAuth]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="callback" />
      <Stack.Screen name="index" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    // Step 2: App ko GestureHandlerRootView se wrap karein
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Step 3: App ko BottomSheetModalProvider se wrap karein */}
      <BottomSheetModalProvider>
        {/* Aapka pehle se maujood AuthProvider iske andar rahega */}
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
});
