// File: app/welcome-video.tsx
// ✅ COMPLETE AND FINAL CODE (Centered Video + Fixed Loader + Delayed Skip Button)

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { useRouter } from 'expo-router';
import { useUserStore } from '../../store/useUserStore'; // Uncommented this import

const WELCOME_VIDEO_ASSET = require('../../assets/Welcome-Video.mp4'); // Ensure this path is correct

export default function WelcomeVideoScreen() {
  const router = useRouter();
  const { setShowWelcomeVideo } = useUserStore(); // Uncommented this line
  const videoRef = useRef<Video>(null);

  const [status, setStatus] = useState<AVPlaybackStatusSuccess | null>(null);

  // State to control the loader visibility based on video buffering
  // We'll adjust the logic to hide it even if expo-av misreports isBuffering
  const [showLoader, setShowLoader] = useState(true);

  // New state to control when the skip button should appear after a delay
  const [showSkipAfterDelay, setShowSkipAfterDelay] = useState(false);

  // Function to handle the end of the video or skip action
  const handleEnd = () => {
    setShowWelcomeVideo(false); // Uncommented this line
    router.replace('/(app)/thank-you'); // Navigate to the thank-you screen
  };

  useEffect(() => {
    // This effect handles navigation after the video finishes playing
    if (status?.isLoaded && status.didJustFinish) {
      const timer = setTimeout(() => {
        handleEnd();
      }, 300); // Small delay before navigating
      return () => clearTimeout(timer);
    }
  }, [status?.didJustFinish, status?.isLoaded]);

  useEffect(() => {
    let skipTimer: NodeJS.Timeout | null = null;
    // Start the timer for the skip button only when the video is loaded and playing
    if (status?.isLoaded && status.isPlaying && !status.didJustFinish) {
      skipTimer = setTimeout(() => {
        setShowSkipAfterDelay(true);
      }, 10000); // Show skip button after 10 seconds
    } else {
      // If video is not playing or finished, reset the skip button visibility
      setShowSkipAfterDelay(false);
    }

    // Cleanup function to clear the timer if the component unmounts
    // or if the video state changes (e.g., video finishes before 10s)
    return () => {
      if (skipTimer) {
        clearTimeout(skipTimer);
      }
    };
  }, [status?.isLoaded, status?.isPlaying, status?.didJustFinish]); // Re-run when video load/play status changes

  // The skip button is shown only when:
  // 1. The video is loaded
  // 2. The video has not finished
  // 3. The 10-second delay has passed (showSkipAfterDelay is true)
  // We removed the !isBuffering condition here
  const showSkipButton = status?.isLoaded && !status.didJustFinish && showSkipAfterDelay;

  return (
    <SafeAreaView style={styles.container}>
      <Video
        ref={videoRef}
        source={WELCOME_VIDEO_ASSET}
        style={styles.videoPlayer}
        // 'CONTAIN' ensures the video fits within the bounds while maintaining aspect ratio
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay // Video should play automatically
        isLooping={false} // Video should not loop
        onPlaybackStatusUpdate={(playbackStatus) => {
          if (playbackStatus.isLoaded) {
            // Update the status object
            setStatus(playbackStatus as AVPlaybackStatusSuccess);

            // Logic to hide the loader:
            // Hide loader if video is playing and has progressed past a small initial buffer
            if (playbackStatus.isPlaying && playbackStatus.positionMillis > 500) {
              setShowLoader(false);
            } else if (playbackStatus.isBuffering && !playbackStatus.isPlaying) {
              // Show loader if explicitly buffering and not playing (e.g., initial load)
              setShowLoader(true);
            } else if (!playbackStatus.isLoaded) {
              // Show loader if not loaded yet
              setShowLoader(true);
            }

            // Added detailed console logs for debugging
            console.log('Video Status Update:', {
              isLoaded: playbackStatus.isLoaded,
              isPlaying: playbackStatus.isPlaying,
              isBuffering: playbackStatus.isBuffering,
              didJustFinish: playbackStatus.didJustFinish,
              positionMillis: playbackStatus.positionMillis,
              durationMillis: playbackStatus.durationMillis,
              error: (playbackStatus as any).error, // Cast to any to access error if present
              currentShowLoaderState: showLoader, // Log the state of our loader flag
            });
          } else {
            console.log('Video Status Update: Not Loaded Yet', playbackStatus);
            setShowLoader(true); // Ensure loader is shown if not loaded
          }
        }}
      />

      {/* Loader overlay, visible only when showLoader is true */}
      {showLoader && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      {/* Skip button, visible only when showSkipButton is true */}
      {showSkipButton && (
        <TouchableOpacity style={styles.skipButton} onPress={handleEnd}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Black background for the entire screen
    justifyContent: 'center', // Center video vertically
    alignItems: 'center', // Center video horizontally
  },
  videoPlayer: {
    width: '100%', // Take full width of the screen
    // Maintain a 9:16 aspect ratio (common for vertical videos). Adjust if your video has a different aspect ratio.
    aspectRatio: 9 / 16,
  },
  loadingOverlay: {
    // This overlay covers the entire screen to keep the spinner centered
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent', // Transparent background for the overlay
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Ensure loader is above the video
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 50 : 70, // Adjust top position for Android/iOS
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black background
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    zIndex: 20, // Ensure skip button is above the loader
  },
  skipButtonText: {
    color: '#FFFFFF', // White text color
    fontSize: 15,
    fontWeight: 'bold',
  },
});
