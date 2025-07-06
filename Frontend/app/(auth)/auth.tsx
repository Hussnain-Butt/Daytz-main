import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext'; // ** Ensure this path is correct **

// Logo - Check Path
const logoPath = require('../../assets/brand.png'); // ** Ensure this path is correct **

const AuthScreen = () => {
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    if (isLoading) return;
    try {
      console.log('Auth Screen: Initiating login via AuthContext...');
      await login();
      console.log('Auth Screen: Login process started. Waiting for AuthContext update.');
    } catch (error) {
      // Corrected catch block
      console.error('Auth Screen: Login failed', error);
      // Optional: Show an error message to the user here
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
        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
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
    padding: 16,
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
    marginBottom: 12,
  },
  loginButton: {
    minWidth: '60%',
    maxWidth: 300,
    alignItems: 'center',
    backgroundColor: '#06b6d4',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
    height: 48,
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#555d69', // A more distinct disabled color might be good
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  termsText: {
    marginTop: 16,
    paddingHorizontal: 16,
    fontSize: 12,
    textAlign: 'center',
    color: '#9ca3af',
  },
});

export default AuthScreen;
