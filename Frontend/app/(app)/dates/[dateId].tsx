// File: app/(app)/dates/[dateId].tsx
// ✅ COMPLETE AND FINAL UPDATED CODE WITH BUBBLE POPUP

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  Modal, // BubblePopup ke liye import
} from 'react-native';
import { Avatar } from 'react-native-paper';
import { format, parseISO } from 'date-fns';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getDateById,
  updateDate,
  getPlayableVideoUrl,
  isAuthTokenApiError,
} from '../../../api/api';
import { DetailedDateObject } from '../../../types/Date';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const BACK_ARROW_ICON = require('../../../assets/back_arrow_icon.png');
const BRAND_LOGO = require('../../../assets/brand.png');

// =====> ALERT KI TASVEEREIN IMPORT KAREIN (PATH THEEK KAREIN) <=====
const calcHappyIcon = require('../../../assets/calc-happy.png');
const calcErrorIcon = require('../../../assets/calc-error.png');
// =====================================================================

const screenColors = {
  background: '#121212',
  textPrimary: '#FFFFFF',
  textSecondary: '#EBEBF599',
  cardBackground: '#1C1C1E',
  acceptButton: '#28a745',
  declineButton: '#dc3545',
  buttonText: '#FFFFFF',
  avatarBorder: '#A020F0',
  // Bubble Popup ke liye colors
  PinkPrimary: '#FF6B6B',
  GoldPrimary: '#FFD700',
  Black: '#000000',
  White: '#FFFFFF',
};

// --- NEW BUBBLE POPUP COMPONENT ---
const BubblePopup = ({ visible, type, title, message, buttonText, onClose }) => {
  if (!visible) {
    return null;
  }

  const isSuccess = type === 'success';
  const imageSource = isSuccess ? calcHappyIcon : calcErrorIcon;
  const buttonStyle = isSuccess ? styles.successButton : styles.errorButton;
  const buttonTextStyle = isSuccess ? styles.successButtonText : styles.errorButtonText;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.popupContainer}>
          <Image source={imageSource} style={styles.popupImage} />
          <View style={styles.bubble}>
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

const DateDetailScreen = () => {
  const router = useRouter();
  const { dateId } = useLocalSearchParams<{ dateId: string }>();
  const { auth0User, logout } = useAuth();

  const [dateDetails, setDateDetails] = useState<DetailedDateObject | null>(null);
  const [playableVideoUrl, setPlayableVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef<Video>(null);
  const [videoStatus, setVideoStatus] = useState<any>({});

  // =====> CUSTOM POPUP KE LIYE STATE <=====
  const [popupState, setPopupState] = useState({
    visible: false,
    type: 'error' as 'success' | 'error',
    title: '',
    message: '',
    onCloseCallback: undefined as (() => void) | undefined,
  });
  // ======================================

  // =====> CUSTOM POPUP DIKHANE KE LIYE HELPER FUNCTION <=====
  const showPopup = (
    title: string,
    message: string,
    type: 'success' | 'error' = 'error',
    onCloseCallback?: () => void
  ) => {
    setPopupState({
      visible: true,
      title,
      message,
      type,
      onCloseCallback,
    });
  };
  // ========================================================

  const fetchDateDetails = useCallback(async () => {
    if (!dateId) return;
    setIsLoading(true);
    try {
      const response = await getDateById(dateId);
      setDateDetails(response.data);
      if (response.data?.userFrom?.videoUrl) {
        const videoResponse = await getPlayableVideoUrl({
          vimeoUri: response.data.userFrom.videoUrl,
        });
        setPlayableVideoUrl(videoResponse.data.playableUrl);
      }
    } catch (error) {
      console.error('[DateDetailScreen] Error fetching date details:', error);
      showPopup('Error', 'Failed to load date details.', 'error', () => router.back());
      if (isAuthTokenApiError(error)) logout && logout();
    } finally {
      setIsLoading(false);
    }
  }, [dateId, logout]);

  useEffect(() => {
    fetchDateDetails();
  }, [fetchDateDetails]);

  const handleUpdateStatus = async (status: 'approved' | 'declined') => {
    console.log(`[DateDetailScreen] handleUpdateStatus triggered with status: ${status}`);

    if (!dateId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await updateDate(dateId, { status });
      console.log('[DateDetailScreen] API call successful. Response data:', response.data);

      showPopup('Success', `Date proposal has been ${status}.`, 'success', () => {
        console.log('[DateDetailScreen] OK pressed on success popup. Refetching details...');
        fetchDateDetails();
        if (status === 'approved') {
          router.back();
        }
      });
    } catch (error: any) {
      console.error(
        '[DateDetailScreen] API call to updateDate FAILED. Error:',
        JSON.stringify(error, null, 2)
      );
      const errorMessage = error.response?.data?.message || 'An error occurred while responding.';
      showPopup('Error', errorMessage, 'error');
    } finally {
      console.log('[DateDetailScreen] Process finished. Setting isSubmitting to false.');
      setIsSubmitting(false);
    }
  };

  const renderFooter = () => {
    if (!dateDetails || !auth0User) return null;
    const isRecipient = dateDetails.userTo.userId === auth0User.sub;

    if (isRecipient && dateDetails.status === 'pending') {
      return (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleUpdateStatus('approved')}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color={screenColors.buttonText} />
            ) : (
              <Text style={styles.actionButtonText}>Accept</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => handleUpdateStatus('declined')}
            disabled={isSubmitting}>
            <Text style={styles.actionButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxText}>
          Status: {dateDetails.status.charAt(0).toUpperCase() + dateDetails.status.slice(1)}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  if (!dateDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Date not found.</Text>
      </SafeAreaView>
    );
  }

  const proposingUser = dateDetails.userFrom;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image source={BACK_ARROW_ICON} style={styles.backIcon} />
          </TouchableOpacity>
          <Image source={BRAND_LOGO} style={styles.brandLogo} />
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.title}>Date Proposal From</Text>

        <View style={styles.userInfoContainer}>
          <Avatar.Image
            size={64}
            source={{ uri: proposingUser.profilePictureUrl }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{proposingUser.firstName || 'User'}</Text>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>
            {format(parseISO(dateDetails.date), 'MMMM dd, yyyy')}
          </Text>
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>
            {dateDetails.time ? format(parseISO(`1970-01-01T${dateDetails.time}`), 'p') : 'Not set'}
          </Text>
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Venue:</Text>
          <Text style={styles.detailValue}>{dateDetails.locationMetadata?.name || 'N/A'}</Text>
        </View>

        {playableVideoUrl && (
          <View>
            <Text style={styles.videoLabel}>Bio Video</Text>
            <View style={styles.videoContainer}>
              <Video
                ref={videoRef}
                style={styles.video}
                source={{ uri: playableVideoUrl }}
                useNativeControls={false}
                resizeMode={ResizeMode.COVER}
                isLooping
                onPlaybackStatusUpdate={(status) => setVideoStatus(() => status)}
              />
              <TouchableOpacity
                style={styles.playButton}
                onPress={() =>
                  videoStatus.isPlaying
                    ? videoRef.current?.pauseAsync()
                    : videoRef.current?.playAsync()
                }>
                <Ionicons name={videoStatus.isPlaying ? 'pause' : 'play'} size={32} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>{renderFooter()}</View>

      {/* Naya popup render ho raha hai */}
      <BubblePopup
        visible={popupState.visible}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        buttonText="OK"
        onClose={() => {
          const callback = popupState.onCloseCallback;
          setPopupState((prev) => ({ ...prev, visible: false, onCloseCallback: undefined }));
          if (callback) {
            callback();
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: screenColors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: screenColors.background,
  },
  scrollContent: { paddingBottom: 120, paddingHorizontal: 20 },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    height: 60,
  },
  backButton: { padding: 8 },
  backIcon: { width: 32, height: 32 },
  brandLogo: { width: 100, height: 40, resizeMode: 'contain' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: screenColors.textPrimary,
    textAlign: 'center',
    marginVertical: 15,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: screenColors.cardBackground,
    borderRadius: 15,
    marginBottom: 20,
  },
  avatar: { borderWidth: 2, borderColor: screenColors.avatarBorder },
  userName: { fontSize: 20, fontWeight: '600', color: screenColors.textPrimary, marginLeft: 16 },
  detailCard: {
    backgroundColor: screenColors.cardBackground,
    borderRadius: 15,
    padding: 16,
    marginBottom: 10,
  },
  detailLabel: { fontSize: 14, color: screenColors.textSecondary, marginBottom: 4 },
  detailValue: { fontSize: 18, color: screenColors.textPrimary, fontWeight: '500' },
  videoLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: screenColors.textPrimary,
    marginTop: 20,
    marginBottom: 12,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
    borderRadius: 15,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 },
  playButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 10,
    backgroundColor: screenColors.background,
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  actionContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  acceptButton: { backgroundColor: screenColors.acceptButton },
  declineButton: { backgroundColor: screenColors.declineButton },
  actionButtonText: { fontSize: 18, fontWeight: 'bold', color: screenColors.buttonText },
  infoBox: {
    backgroundColor: screenColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  infoBoxText: { fontSize: 18, fontWeight: 'bold', color: screenColors.textPrimary },

  // --- NAYE BUBBLE POPUP KE STYLES ---
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
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 20,
    paddingTop: 90,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  popupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 15,
  },
  popupMessage: {
    fontSize: 17,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
  },
  popupButton: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  errorButton: {
    backgroundColor: screenColors.PinkPrimary,
  },
  successButton: {
    backgroundColor: screenColors.GoldPrimary,
  },
  errorButtonText: {
    color: screenColors.White,
    fontSize: 15,
    fontWeight: 'bold',
  },
  successButtonText: {
    color: screenColors.Black,
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default DateDetailScreen;
