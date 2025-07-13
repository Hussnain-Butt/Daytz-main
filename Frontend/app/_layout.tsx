// File: app/_layout.tsx
// ✅ COMPLETE AND FINAL CODE (No Changes Needed, This is Correct)

import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useUserStore } from '../store/useUserStore';
import { ActivityIndicator, View, StyleSheet, Alert } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function RootLayoutNav() {
  const { auth0User, isReady } = useAuth();
  const { showThankYouAfterAuth, showWelcomeVideo } = useUserStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;

    const isUserLoggedIn = !!auth0User;
    const inAppGroup = segments[0] === '(app)';

    if (isUserLoggedIn) {
      if (showWelcomeVideo) {
        // Yeh logic bilkul sahi hai, welcome video par bhejega
        router.replace('/welcome-video');
      } else if (showThankYouAfterAuth) {
        router.replace('/(app)/thank-you');
      } else if (!inAppGroup) {
        router.replace('/(app)/calendar');
      }
    } else {
      if (inAppGroup) {
        router.replace('/(auth)/login');
      }
    }
  }, [isReady, auth0User, segments, showThankYouAfterAuth, showWelcomeVideo]);

  // ... (rest of the file is unchanged and correct)
  useEffect(() => {
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      console.log('A new FCM message arrived in Foreground!', JSON.stringify(remoteMessage));
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'New Notification',
          remoteMessage.notification.body || ''
        );
      }
    });

    const unsubscribeOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification caused app to open from background state:', remoteMessage);
      const dateId = remoteMessage.data?.dateId;
      if (dateId) {
        console.log(`Should navigate to date details for ID: ${dateId}`);
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
          }
        }
      });
    return unsubscribeForeground;
  }, []);

  if (!isReady) {
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
      {/* Yeh line bilkul zaroori aur sahi hai */}
      <Stack.Screen name="welcome-video" />
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
