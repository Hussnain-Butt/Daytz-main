// File: components/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet, Easing, Platform } from 'react-native';

// Adjust path if your assets folder is elsewhere relative to this file
const logoPath = require('../assets/brand.png');

interface SplashScreenProps {
  onFinish: () => void; // Callback function when animation is done
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Fade in and scale up animation (takes 1 second)
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.back(1)),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
      // Wait for 3 seconds *after* animation completes (total ~4 seconds)
      Animated.delay(3000), // Adjusted delay
    ]).start(() => {
      // Animation sequence finished, call the callback
      if (onFinish) {
        onFinish();
      }
    });
  }, [opacityAnim, scaleAnim, onFinish]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={logoPath}
        style={[
          styles.logo,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827', // Match your theme's background
  },
  logo: {
    width: 250, // Adjust size as needed
    height: 100, // Adjust size as needed
  },
});

export default SplashScreen;
