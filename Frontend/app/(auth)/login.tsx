// File: app/(auth)/login.tsx
import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext'; // ** Ensure this path is correct **
import { deleteItemAsync } from 'expo-secure-store';

// Logo - Update path if necessary
const logoPath = require('../../assets/brand.png'); // ** Ensure this path is correct **

const LoginScreen = () => {
  const { login, isLoading, user } = useAuth();
  const router = useRouter();

  // For debugging - show if user is already logged in
  useEffect(() => {
    if (user) {
      console.log('Login Screen: User is already authenticated:', user.sub);
    }
  }, [user]);

  const handleLogin = async () => {
    if (isLoading) return;
    try {
      console.log('Login Screen: Initiating login via AuthContext...');
      await login();
      console.log('Login Screen: Login process started. Waiting for AuthContext update.');
    } catch (error) {
      console.error('Login Screen: Login failed', error);
      // Maybe show an alert here
    }
  };

  const handleTestDeepLink = () => {
    router.push('/DeepLinkTest');
  };

  // Temporary function to clear stored credentials
  const handleClearCredentials = async () => {
    try {
      await deleteItemAsync('daytzAuthCredentials_v3');
      Alert.alert('Success', 'Credentials cleared! Please restart the app.', [{ text: 'OK' }]);
    } catch (error) {
      console.error('Error clearing credentials:', error);
      Alert.alert('Error', 'Failed to clear credentials');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image source={logoPath} style={styles.logo} resizeMode="contain" />
        <Text style={styles.welcomeText}>Welcome to Daytz</Text>

        {user && (
          <Text style={styles.debugText}>Already logged in as: {user.email || user.sub}</Text>
        )}

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}>
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
  },
  testButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  clearButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 12,
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
