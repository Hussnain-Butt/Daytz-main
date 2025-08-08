// src/components/ConditionalPagerView.web.tsx
// Yeh file sirf Web ke liye istemal hogi.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native'; // react-native ke core components web par chalte hain

// Web ke liye ek dummy component provide karte hain.
// Kyunki humara main component (stories.tsx) pehle hi check kar raha hai Platform.OS,
// yeh component web par render nahi hona chahiye. Hum ise null return karwate hain.
const WebPagerViewStub: React.FC<any> = (props) => {
  // Development mode mein ek warning dikha sakte hain agar yeh render ho jaye galti se
  if (__DEV__) {
    console.warn(
      'ConditionalPagerView (Web Stub) was rendered. This should ideally not happen if Platform.OS check in the parent component is correct.'
    );
  }
  // Return null kyunki parent component web ke liye alag UI dikha raha hai
  return null;

  // Ya phir ek placeholder dikha sakte hain agar zaroorat pade:
  // return (
  //   <View {...props} style={styles.container}>
  //     <Text style={styles.text}>PagerView is not available on web.</Text>
  //   </View>
  // );
};

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#333',
//   },
//   text: {
//     color: 'orange',
//   },
// });

export default WebPagerViewStub;
