// File: app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  // Yeh auth screens ke liye ek simple Stack navigator set up karta hai
  return <Stack screenOptions={{ headerShown: false }} />;
}