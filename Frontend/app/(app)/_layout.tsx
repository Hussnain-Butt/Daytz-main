// file: app/(app)/_layout.tsx

import { Stack } from 'expo-router';
import React from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function AppProtectedLayout() {
  // Hum bas `isReady` flag ka intezar karenge.
  // Root layout pehle se hi `isLoading` ke liye ek loading screen dikha raha hai.
  // Yeh ek extra safety hai agar navigation foran ho jaye.
  const { isReady } = useAuth();

  // Jab tak AuthContext (auth + DB profile) ready nahi hota, kuch na dikhayein ya loading dikhayein.
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  // Jab session poori tarah ready ho, to app ki screens dikhayein.
  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
});
