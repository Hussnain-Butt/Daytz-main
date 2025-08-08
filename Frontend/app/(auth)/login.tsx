// File: app/(auth)/login.tsx
// ✅ CORRECTED AND UPDATED

import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { deleteItemAsync } from 'expo-secure-store';

const logoPath = require('../../assets/brand.png');

// This is the session key used in AuthContext.tsx
const AUTH_SESSION_KEY = 'daytzFinalAuthSession_v1';

const LoginScreen = () => {
  // Correctly destructure auth0User from the context
  const { login, isLoading, auth0User } = useAuth();

  useEffect(() => {
    if (auth0User) {
      console.log('Login Screen: User is already authenticated:', auth0User.sub);
    }
  }, [auth0User]);

  const handleLogin = async () => {
    if (isLoading) return;
    try {
      console.log('Login Screen: Initiating login via AuthContext...');
      await login();
      console.log('Login Screen: Login process started. Waiting for AuthContext update.');
    } catch (error) {
      console.error('Login Screen: Login failed', error);
      Alert.alert('Login Error', 'An unexpected error occurred during login.');
    }
  };

  // Temporary debug function to clear the correct session key
  const handleClearSession = async () => {
    try {
      await deleteItemAsync(AUTH_SESSION_KEY);
      Alert.alert('Success', 'Stored session cleared! Please restart the app.', [{ text: 'OK' }]);
    } catch (error) {
      console.error('Error clearing session:', error);
      Alert.alert('Error', 'Failed to clear session.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image source={logoPath} style={styles.logo} resizeMode="contain" />
        <Text style={styles.welcomeText} testID="welcome-text">
          Welcome to Daytz
        </Text>

        {auth0User && (
          <Text style={styles.debugText}>
            Already logged in as: {auth0User.email || auth0User.sub}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
          testID="login-button">
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>Login / Sign Up</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: 180,
    height: 70,
    marginBottom: 25,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 35,
  },
  debugText: {
    fontSize: 12,
    color: '#fbbf24',
    textAlign: 'center',
    marginBottom: 10,
  },
  loginButton: {
    backgroundColor: '#06b6d4',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  loginButtonDisabled: {
    backgroundColor: '#0891b2',
    opacity: 0.8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
  },
  clearButton: {
    backgroundColor: '#be123c',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default LoginScreen;
