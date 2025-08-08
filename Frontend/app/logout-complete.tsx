import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function LogoutCompleteScreen() {
  const router = useRouter();

  useEffect(() => {
    console.log('LogoutCompleteScreen: Logout redirect received, navigating to login...');
    // Give a small delay to show the screen briefly
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={styles.text}>Completing logout...</Text>
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
    marginTop: 15,
    fontSize: 16,
    textAlign: 'center',
  },
}); 