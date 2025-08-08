// File: AuthScreen.tsx (or similar name)
// ✅ CORRECTED AND UPDATED

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const logoPath = require('../../assets/brand.png');

const AuthScreen = () => {
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    if (isLoading) return;
    try {
      console.log('Auth Screen: Initiating login...');
      await login();
    } catch (error) {
      console.error('Auth Screen: Login failed', error);
      Alert.alert('Login Error', 'An error occurred while trying to log in.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <Image source={logoPath} style={styles.logo} resizeMode="contain" />
        <Text style={styles.welcomeText}>Welcome to Daytz</Text>

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.loginButtonText}>Login / Sign Up</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  innerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 180,
    height: 70,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 6,
    marginBottom: 24,
  },
  loginButton: {
    width: '90%',
    maxWidth: 320,
    alignItems: 'center',
    backgroundColor: '#06b6d4',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    height: 48,
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#0e7490',
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#9ca3af',
  },
});

export default AuthScreen;
