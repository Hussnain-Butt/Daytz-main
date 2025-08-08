// --- COMPLETE FINAL UPDATED CODE: app/(app)/upload-day-video.tsx ---

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Image,
  Modal,
  // ✅ CHANGE: StatusBar ko import karein
  StatusBar as RNStatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { uploadCalendarVideo } from '../../api/api';
import { parse, format } from 'date-fns'; // already imported
import { Video, ResizeMode } from 'expo-av';

type ImagePickerAsset = ImagePicker.ImagePickerAsset;

const MAX_VIDEO_DURATION_SECONDS = 60;
const MAX_VIDEO_DURATION_MS = MAX_VIDEO_DURATION_SECONDS * 1000;

// Image paths
const ERROR_IMAGE = require('../../assets/calc-error.png');
const HAPPY_IMAGE = require('../../assets/calc-happy.png');

// --- NEW BUBBLE POPUP COMPONENT (UNCHANGED) ---
const BubblePopup = ({ visible, type, title, message, buttonText, onClose }) => {
  if (!visible) {
    return null;
  }
  const isSuccess = type === 'success';
  const imageSource = isSuccess ? HAPPY_IMAGE : ERROR_IMAGE;
  const buttonStyle = isSuccess ? styles.successButton : styles.errorButton;
  const buttonTextStyle = isSuccess ? styles.successButtonText : styles.errorButtonText;
  const bubbleBgColor = styles.bubbleLight;
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.popupContainer}>
          <Image source={imageSource} style={styles.popupImage} />
          <View style={[styles.bubble, bubbleBgColor]}>
            <Text style={styles.popupTitle}>{title}</Text>
            <Text style={styles.popupMessage}>{message}</Text>
            <TouchableOpacity style={[styles.popupButton, buttonStyle]} onPress={onClose}>
              <Text style={buttonTextStyle}>{buttonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
// --- END OF BUBBLE POPUP COMPONENT ---

// ... (Baaki saara logic bilkul waisa hi hai, usay yahan se hata raha hoon)
const UploadDayVideo = () => {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { auth0User: authUser } = useAuth();
  const [videoAsset, setVideoAsset] = useState<ImagePickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoPlayerRef = useRef<Video>(null);

  const [popupState, setPopupState] = useState({
    visible: false,
    type: 'error' as 'success' | 'error',
    title: '',
    message: '',
    buttonText: 'Got It',
    onClose: () => {},
  });

  const showPopup = (type, title, message, buttonText = 'Got It', onCloseCallback = null) => {
    setPopupState({
      visible: true,
      type,
      title,
      message,
      buttonText,
      onClose: () => {
        setPopupState({ ...popupState, visible: false });
        if (onCloseCallback) {
          onCloseCallback();
        }
      },
    });
  };

  const handleSelectedVideo = (asset: ImagePickerAsset) => {
    console.log('Selected/Recorded Video Asset:', JSON.stringify(asset, null, 2));
    if (asset.duration && asset.duration > MAX_VIDEO_DURATION_MS) {
      const errorMessage = `Please select or record a video shorter than ${MAX_VIDEO_DURATION_SECONDS} seconds. This video is ${Math.round(
        asset.duration / 1000
      )} seconds.`;
      showPopup('error', 'Video Too Long', errorMessage);
      setVideoAsset(null);
      videoPlayerRef.current?.unloadAsync();
      return;
    }
    setVideoAsset(asset);
    setUploadProgress(0);
  };

  const pickVideoFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showPopup(
        'error',
        'Permission Denied',
        'Sorry, we need camera roll permissions to upload videos.'
      );
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleSelectedVideo(result.assets[0]);
      }
    } catch (error) {
      console.error('ImagePicker Library Error: ', error);
      showPopup('error', 'Error', 'There was an error picking the video from the library.');
    }
  };

  const recordVideoWithCamera = async () => {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus.status !== 'granted') {
      showPopup(
        'error',
        'Permission Denied',
        'Sorry, we need camera permissions to record videos.'
      );
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.7,
        videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleSelectedVideo(result.assets[0]);
      }
    } catch (error) {
      console.error('ImagePicker Camera Error: ', error);
      showPopup('error', 'Error', 'There was an error recording the video.');
    }
  };

  const dataUriToBlob = (dataUri: string): Blob | null => {
    if (typeof atob === 'undefined') {
      return null;
    }
    try {
      const byteString = atob(dataUri.split(',')[1]);
      const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: mimeString });
    } catch (e) {
      return null;
    }
  };

  const handleUpload = async () => {
    if (!videoAsset || !date || !authUser) {
      showPopup('error', 'Error', 'Missing video, date, or authentication. Please try again.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      const uri = videoAsset.uri;
      const fileName = videoAsset.fileName || uri.split('/').pop() || `video_${Date.now()}.mp4`;
      let mimeType = videoAsset.mimeType;

      if (!mimeType) {
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (extension === 'mp4') mimeType = 'video/mp4';
        else if (extension === 'mov') mimeType = 'video/quicktime';
        else mimeType = 'application/octet-stream';
      }

      if (Platform.OS === 'web' && uri.startsWith('data:')) {
        const blob = dataUriToBlob(uri);
        if (blob) {
          formData.append('video', blob, fileName);
        } else {
          throw new Error('Failed to convert video data URI to Blob.');
        }
      } else {
        formData.append('video', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name: fileName,
          type: mimeType,
        } as any);
      }
      formData.append('date', date);

      await uploadCalendarVideo(formData, (progressEvent) => {
        if (progressEvent && progressEvent.total && progressEvent.total > 0) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(Math.min(percentCompleted, 100));
        }
      });

      showPopup(
        'success',
        'Success!',
        'Nice! Let me see who I might know, hang tight and check back later.',
        'Great!',
        handleSuccessPopupClose
      );
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Could not upload video.';
      showPopup('error', 'Upload Failed', errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSuccessPopupClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/calendar');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Upload Your Video</Text>
          <Text style={styles.dateText}>
            For Date: {date ? format(parse(date, 'yyyy-MM-dd', new Date()), 'MMMM do, yyyy') : ''}
          </Text>

          <View style={styles.previewWrapper}>
            {videoAsset ? (
              <Video
                ref={videoPlayerRef}
                source={{ uri: videoAsset.uri }}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                style={styles.videoPreview}
              />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>Pick or record a video</Text>
                <Text style={styles.placeholderSubText}>
                  (Max {MAX_VIDEO_DURATION_SECONDS} seconds)
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.actionButton,
                styles.recordButton,
                isUploading && styles.buttonDisabled,
              ]}
              onPress={recordVideoWithCamera}
              disabled={isUploading}>
              <Text style={styles.buttonText}>Record</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.actionButton,
                styles.pickButton,
                isUploading && styles.buttonDisabled,
              ]}
              onPress={pickVideoFromLibrary}
              disabled={isUploading}>
              <Text style={styles.buttonText}>{videoAsset ? 'Change' : 'Upload'}</Text>
            </TouchableOpacity>
          </View>

          {videoAsset && (
            <TouchableOpacity
              style={[styles.button, styles.uploadButton, isUploading && styles.buttonDisabled]}
              onPress={handleUpload}
              disabled={isUploading}>
              {isUploading ? (
                <View style={styles.loadingIndicatorContainer}>
                  <ActivityIndicator size="small" color="#000000" />
                  <Text style={styles.uploadingText}>
                    Uploading... {uploadProgress > 0 ? `${uploadProgress}%` : ''}
                  </Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Upload Now</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
            disabled={isUploading}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BubblePopup
        visible={popupState.visible}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        buttonText={popupState.buttonText}
        onClose={popupState.onClose}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ✅ CHANGE: paddingTop ko Android ke liye add kiya gaya hai
  safeArea: {
    flex: 1,
    backgroundColor: '#2D2D2D',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  container: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  dateText: { fontSize: 18, color: '#E0E0E0', marginBottom: 25, textAlign: 'center' },
  previewWrapper: {
    width: '90%',
    aspectRatio: 16 / 9,
    backgroundColor: '#1a1a1a',
    marginBottom: 25,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  videoPreview: { width: '100%', height: '100%' },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    padding: 10,
  },
  placeholderText: { color: '#888', fontSize: 16, textAlign: 'center' },
  placeholderSubText: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 5 },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    flexDirection: 'row',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '85%',
    marginBottom: 15,
  },
  actionButton: { flex: 1, marginHorizontal: 5, width: undefined },
  buttonText: { color: '#000000', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  recordButton: { backgroundColor: '#FF6B6B' },
  pickButton: { backgroundColor: '#3cd9d6' },
  uploadButton: { backgroundColor: '#FFDB5C', width: '85%' },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#777',
    width: '85%',
  },
  cancelButtonText: { color: '#CCC', fontSize: 16, fontWeight: 'bold' },
  buttonDisabled: { opacity: 0.6 },
  loadingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: { color: '#000000', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },

  // --- NEW BUBBLE POPUP STYLES (Updated Design) ---
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popupContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
  },
  popupImage: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
    zIndex: 1,
    marginBottom: -80,
  },
  bubble: {
    position: 'relative',
    borderRadius: 25,
    padding: 20,
    paddingTop: 90,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  bubbleLight: {
    backgroundColor: '#FFFFFF',
  },
  popupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  popupMessage: {
    fontSize: 15,
    color: '#333333',
    marginBottom: 25,
    lineHeight: 22,
    textAlign: 'center',
  },
  popupButton: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  errorButton: {
    backgroundColor: '#FFDB5C',
  },
  successButton: {
    backgroundColor: '#3cd9d6',
  },
  errorButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  successButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default UploadDayVideo;
