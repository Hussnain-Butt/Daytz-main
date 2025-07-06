// File: app/index.tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
// Option 1: Redirect (Layout should ideally handle this anyway)
// import { Redirect } from 'expo-router';
// export default function RootIndex() { return <Redirect href="/login" />; } // Or some other initial guess

// Option 2: Show Loading (Layout will quickly take over)
export default function RootIndex() {
  // This screen might flash briefly before _layout determines auth state
  // after the splash screen.
  console.log("app/index.tsx rendering briefly - should be replaced by layout's logic.");
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827', // Match theme
  },
});

// Option 3: Return null (If you're confident layout handles everything instantly)
// export default function RootIndex() { return null; }
