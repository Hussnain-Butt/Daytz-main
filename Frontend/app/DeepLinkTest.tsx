import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import * as Linking from 'expo-linking';

const TEST_DEEP_LINK = 'com.daytz.app://callback';
const TEST_DEEP_LINK_WITH_PARAMS = 'com.daytz.app://callback?code=test123&state=test';

export default function DeepLinkTest() {
  const handleTestBasicDeepLink = async () => {
    try {
      const supported = await Linking.canOpenURL(TEST_DEEP_LINK);
      if (supported) {
        await Linking.openURL(TEST_DEEP_LINK);
        Alert.alert('Basic Deep Link Triggered', 'Agar app callback screen par redirect ho jaye, to basic deep link sahi hai.');
      } else {
        Alert.alert('Deep Link Not Supported', 'Intent filter ya scheme config me problem hai.');
      }
    } catch (err) {
      Alert.alert('Deep Link Error', String(err));
    }
  };

  const handleTestCallbackWithParams = async () => {
    try {
      const supported = await Linking.canOpenURL(TEST_DEEP_LINK_WITH_PARAMS);
      if (supported) {
        await Linking.openURL(TEST_DEEP_LINK_WITH_PARAMS);
        Alert.alert('Callback Link with Params Triggered', 'Agar callback screen par params show ho, to deep linking sahi se working hai.');
      } else {
        Alert.alert('Deep Link Not Supported', 'Intent filter me masla hai.');
      }
    } catch (err) {
      Alert.alert('Deep Link Error', String(err));
    }
  };

  const checkLinkingConfig = async () => {
    try {
      const initialUrl = await Linking.getInitialURL();
      Alert.alert('Current URL', initialUrl || 'No initial URL');
    } catch (err) {
      Alert.alert('Error checking URL', String(err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deep Link Test Screen</Text>
      
      <View style={styles.buttonContainer}>
        <Button title="Test Basic Deep Link" onPress={handleTestBasicDeepLink} />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button title="Test Callback with Params" onPress={handleTestCallbackWithParams} />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button title="Check Current URL" onPress={checkLinkingConfig} />
      </View>
      
      <Text style={styles.info}>
        • Basic Deep Link: {TEST_DEEP_LINK}
        {'\n'}• Callback with Params: {TEST_DEEP_LINK_WITH_PARAMS}
        {'\n\n'}Agar buttons par click karne se app callback screen par jaye, to deep linking working hai.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 30,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 15,
    width: '80%',
  },
  info: {
    color: '#ccc',
    marginTop: 30,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
}); 