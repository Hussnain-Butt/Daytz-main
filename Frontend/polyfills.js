// polyfills.js
// Essential polyfills for React Native and Expo

// Text Encoding polyfill for crypto operations
import 'text-encoding-polyfill';

// React Native Get Random Values polyfill  
import 'react-native-get-random-values';

// Buffer polyfill (using built-in buffer)
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// Process polyfill
import process from 'process';
global.process = process;

// URL polyfill
import 'react-native-url-polyfill/auto';

console.log('Polyfills loaded successfully'); 