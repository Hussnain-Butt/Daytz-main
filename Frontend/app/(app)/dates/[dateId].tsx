// File: app/(app)/dates/[dateId].tsx
// ✅ COMPLETE AND FINAL UPDATED CODE (WITH THEME-MATCHING RESCHEDULE MODAL)

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
  Modal,
  Alert,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Avatar } from 'react-native-paper';
import { format, parseISO, isValid } from 'date-fns';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getDateById,
  updateDate,
  cancelDate,
  getPlayableVideoUrl,
  isAuthTokenApiError,
} from '../../../api/api';
import { DetailedDateObject } from '../../../types/Date';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

// Assets
const BACK_ARROW_ICON = require('../../../assets/back_arrow_icon.png');
const BRAND_LOGO = require('../../../assets/brand.png');
const calcHappyIcon = require('../../../assets/calc-happy.png');
const calcErrorIcon = require('../../../assets/calc-error.png');

const screenColors = {
  background: '#121212',
  textPrimary: '#FFFFFF',
  textSecondary: '#EBEBF599',
  cardBackground: '#1C1C1E',
  inputBackground: '#3F3F3F',
  inputBorder: '#555555',
  acceptButton: '#28a745',
  declineButton: '#dc3545',
  rescheduleButton: '#FFD700',
  cancelModalButton: '#4A4A4A',
  submitModalButton: '#ff149d',
  buttonText: '#FFFFFF',
  avatarBorder: '#A020F0',
  PinkPrimary: '#ff149d',
  GoldPrimary: '#FFD700',
  Black: '#000000',
  White: '#FFFFFF',
};

// Reusable Bubble Popup Component
const BubblePopup = ({ visible, type, title, message, buttonText, onClose }) => {
  if (!visible) return null;
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

// Reschedule Modal Component
const RescheduleModal = ({ visible, onClose, onSubmit, currentDateDetails }) => {
  const [newDate, setNewDate] = useState(
    currentDateDetails.date && isValid(parseISO(currentDateDetails.date))
      ? format(parseISO(currentDateDetails.date), 'yyyy-MM-dd')
      : ''
  );
  const [newTime, setNewTime] = useState(
    currentDateDetails.time
      ? format(parseISO(`1970-01-01T${currentDateDetails.time}`), 'HH:mm')
      : ''
  );
  const [newVenue, setNewVenue] = useState(currentDateDetails.locationMetadata?.name || '');

  const handleReschedule = () => {
    if (!newDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid Format', 'Please enter the date in YYYY-MM-DD format.');
      return;
    }
    if (!newTime.match(/^\d{2}:\d{2}$/)) {
      Alert.alert('Invalid Format', 'Please enter the time in HH:mm format.');
      return;
    }
    if (!newVenue.trim()) {
      Alert.alert('Venue Required', 'Please enter a venue for the date.');
      return;
    }
    onSubmit({
      date: newDate,
      time: `${newTime}:00`,
      locationMetadata: { name: newVenue },
    });
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Reschedule Date</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Date (YYYY-MM-DD)"
            value={newDate}
            onChangeText={setNewDate}
            placeholderTextColor={screenColors.textSecondary}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.modalInput}
            placeholder="Time (HH:mm)"
            value={newTime}
            onChangeText={setNewTime}
            placeholderTextColor={screenColors.textSecondary}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.modalInput}
            placeholder="Venue"
            value={newVenue}
            onChangeText={setNewVenue}
            placeholderTextColor={screenColors.textSecondary}
          />
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelModalButton]}
              onPress={onClose}>
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.submitModalButton]}
              onPress={handleReschedule}>
              <Text style={styles.actionButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

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
  const [popupState, setPopupState] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
    onCloseCallback: undefined,
  });
  const [isRescheduleModalVisible, setRescheduleModalVisible] = useState(false);

  const showPopup = (title, message, type = 'error', onCloseCallback = undefined) => {
    setPopupState({ visible: true, title, message, type, onCloseCallback });
  };

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
      showPopup('Error', 'Failed to load date details.', 'error', () => router.back());
      if (isAuthTokenApiError(error)) logout?.();
    } finally {
      setIsLoading(false);
    }
  }, [dateId, logout, router]);

  useEffect(() => {
    fetchDateDetails();
  }, [fetchDateDetails]);

  const handleUpdateStatus = async (status: 'approved' | 'declined') => {
    if (!dateId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDate(dateId, { status });
      // Fetch the latest details to show the updated status immediately
      await fetchDateDetails();
      showPopup('Success', `Date proposal has been ${status}.`, 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'An error occurred.';
      showPopup('Error', errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDate = () => {
    Alert.alert('Cancel Date', 'Are you sure you want to cancel this date?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          if (!dateId || isSubmitting) return;
          setIsSubmitting(true);
          try {
            await cancelDate(dateId);
            showPopup(
              'Date Cancelled',
              'The date has been successfully cancelled.',
              'success',
              () => router.back()
            );
          } catch (error: any) {
            showPopup('Error', error.response?.data?.message || 'Failed to cancel date.', 'error');
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  const handleRescheduleSubmit = async (newDetails: {
    date: string;
    time: string;
    locationMetadata: any;
  }) => {
    if (!dateId || isSubmitting) return;
    setIsSubmitting(true);
    setRescheduleModalVisible(false);
    try {
      await updateDate(dateId, newDetails);
      showPopup(
        'Date Rescheduled',
        'The date details have been updated.',
        'success',
        fetchDateDetails
      );
    } catch (error: any) {
      showPopup('Error', error.response?.data?.message || 'Failed to reschedule date.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ --- THIS IS THE FIX ---
  // The footer logic is now clearer and correctly shows the action buttons
  // to the recipient of the date proposal.
  const renderFooter = () => {
    if (!dateDetails || !auth0User) return null;

    const isRecipient = dateDetails.userTo.userId === auth0User.sub;
    const isSender = dateDetails.userFrom.userId === auth0User.sub;
    const isParticipant = isSender || isRecipient;

    // SCENARIO 1: The date is pending, and the current user is the recipient.
    // ACTION: Show "Accept" and "Decline" buttons.
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

    // SCENARIO 2: The date is already approved, and the current user is a participant.
    // ACTION: Show "Reschedule" and "Cancel" buttons.
    if (isParticipant && dateDetails.status === 'approved') {
      return (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rescheduleButton]}
            onPress={() => setRescheduleModalVisible(true)}
            disabled={isSubmitting}>
            <Text style={styles.actionButtonText}>Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={handleCancelDate}
            disabled={isSubmitting}>
            <Text style={styles.actionButtonText}>Cancel Date</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // SCENARIO 3 (DEFAULT): For any other status (declined, cancelled, or pending for the sender)
    // ACTION: Show a simple status info box.
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

  if (!dateDetails || !auth0User) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image source={BACK_ARROW_ICON} style={styles.backIcon} />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Date not found.</Text>
      </SafeAreaView>
    );
  }

  const displayUser =
    auth0User.sub === dateDetails.userFrom.userId ? dateDetails.userTo : dateDetails.userFrom;

  const videoProposingUser = dateDetails.userFrom;

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

        <Text style={styles.title}>Date with {displayUser.firstName || 'User'}</Text>

        <View style={styles.userInfoContainer}>
          <Avatar.Image
            size={64}
            source={{ uri: displayUser.profilePictureUrl }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{displayUser.firstName || 'User'}</Text>
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
            <Text style={styles.videoLabel}>Bio Video from {videoProposingUser.firstName}</Text>
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

      <BubblePopup
        visible={popupState.visible}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        buttonText="OK"
        onClose={() => {
          const callback = popupState.onCloseCallback;
          setPopupState((prev) => ({ ...prev, visible: false, onCloseCallback: undefined }));
          if (callback) callback();
        }}
      />

      {dateDetails && (
        <RescheduleModal
          visible={isRescheduleModalVisible}
          onClose={() => setRescheduleModalVisible(false)}
          onSubmit={handleRescheduleSubmit}
          currentDateDetails={dateDetails}
        />
      )}
    </SafeAreaView>
  );
};

// Styles remain unchanged
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
  rescheduleButton: { backgroundColor: screenColors.rescheduleButton },
  actionButtonText: { fontSize: 18, fontWeight: 'bold', color: screenColors.buttonText },
  infoBox: {
    backgroundColor: screenColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  infoBoxText: { fontSize: 18, fontWeight: 'bold', color: screenColors.textPrimary },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popupContainer: { alignItems: 'center', width: '100%', maxWidth: 350 },
  popupImage: { width: 220, height: 220, resizeMode: 'contain', zIndex: 1, marginBottom: -80 },
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
  errorButton: { backgroundColor: screenColors.PinkPrimary },
  successButton: { backgroundColor: screenColors.GoldPrimary },
  errorButtonText: { color: screenColors.White, fontSize: 15, fontWeight: 'bold' },
  successButtonText: { color: screenColors.Black, fontSize: 15, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: screenColors.cardBackground,
    borderRadius: 15,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: screenColors.textPrimary,
    marginBottom: 25,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: screenColors.inputBackground,
    color: screenColors.textPrimary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: screenColors.inputBorder,
  },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelModalButton: { backgroundColor: screenColors.cancelModalButton },
  submitModalButton: { backgroundColor: screenColors.submitModalButton },
});

export default DateDetailScreen;
