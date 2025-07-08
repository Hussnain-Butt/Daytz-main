// File: app/_layout.tsx
// ✅ COMPLETE AND FINAL CORRECTED CODE

import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useUserStore } from '../store/useUserStore';
import { ActivityIndicator, View, StyleSheet, Alert, Platform } from 'react-native';

// --- Imports for libraries ---
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

// Configure how notifications are handled when the app is in the FOREGROUND
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function RootLayoutNav() {
  const { auth0User, isLoading } = useAuth();
  const { showThankYouAfterAuth } = useUserStore();
  const segments = useSegments();
  const router = useRouter();

  // --- Main navigation logic ---
  useEffect(() => {
    if (isLoading) return;
    const isUserLoggedIn = !!auth0User;
    const inAppGroup = segments[0] === '(app)';
    if (isUserLoggedIn) {
      if (showThankYouAfterAuth) {
        router.replace('/(app)/thank-you');
      } else if (!inAppGroup) {
        router.replace('/(app)/calendar');
      }
    } else {
      if (inAppGroup) {
        router.replace('/(auth)/login');
      }
    }
  }, [auth0User, isLoading, segments, showThankYouAfterAuth]);

  // --- Firebase Notification Listeners ---
  useEffect(() => {
    // --- Listener for when the app is in the FOREGROUND ---
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      console.log('A new FCM message arrived in Foreground!', JSON.stringify(remoteMessage));

      // ✅ --- THIS IS THE FIX ---
      // This line will show a native Alert popup when a notification is received
      // while the app is open.
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'New Notification',
          remoteMessage.notification.body || ''
        );
      }
    });

    // --- Listener for when a user taps on a notification ---
    const unsubscribeOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification caused app to open from background state:', remoteMessage);
      const dateId = remoteMessage.data?.dateId;
      if (dateId) {
        console.log(`Should navigate to date details for ID: ${dateId}`);
        // Example: router.push(`/(app)/dates/${dateId}`);
      }
    });

    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('Notification caused app to open from killed state:', remoteMessage);
          const dateId = remoteMessage.data?.dateId;
          if (dateId) {
            console.log(`Should navigate to date details for ID: ${dateId}`);
            // Example: setTimeout(() => router.push(`/(app)/dates/${dateId}`), 1000);
          }
        }
      });

    return unsubscribeForeground;
  }, []);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
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
