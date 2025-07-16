// File: app/(app)/calendar.tsx
// ✅ COMPLETE AND FINAL UPDATED FILE (WITH LOGOUT ICON)

import React, { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import VideoCalendar from '../../components/calendar';
import { colors } from '../../utils/theme';
import { useUserStore } from '../../store/useUserStore';
import {
  getCalendarDaysByUserId,
  getUnreadNotificationsCount,
  getUpcomingDates,
  getAttractionByUserFromUserToAndDate,
  addDateFeedback,
} from '../../api/api';
import { CalendarDay } from '../../types/CalendarDay';
import { UpcomingDate, DateOutcome } from '../../types/Date';
import { useRouter, useFocusEffect } from 'expo-router';
import { format, parseISO, isPast } from 'date-fns';
import { Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

// Asset Imports
const LOGO_IMAGE = require('../../assets/brand.png');
const COIN_ICON = require('../../assets/match.png');
const NOTIFICATION_ICON = require('../../assets/notification_bell_icon.png');
const calcHappyIcon = require('../../assets/calc-happy.png');
const calcErrorIcon = require('../../assets/calc-error.png');

// --- (FeedbackModal and BubblePopup components remain unchanged) ---
const FeedbackModal = ({ visible, onClose, onSubmit }) => {
  // ... (no changes in this component)
  const [selectedOutcome, setSelectedOutcome] = useState<DateOutcome | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectOutcome = (outcome: DateOutcome) => {
    setSelectedOutcome(outcome);
  };

  const handleSubmit = async () => {
    if (!selectedOutcome) {
      Alert.alert('Selection Required', 'Please select how your date went.');
      return;
    }
    setIsLoading(true);
    await onSubmit({ outcome: selectedOutcome, notes: notes });
    setIsLoading(false);
  };

  useEffect(() => {
    if (!visible) {
      setSelectedOutcome(null);
      setNotes('');
      setIsLoading(false);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>How was your date?</Text>
          <Text style={styles.modalSubtitle}>
            Let us know your experience to improve your matches.
          </Text>

          <View style={styles.feedbackOptionsContainer}>
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                styles.fullWidthButton,
                styles.amazingButton,
                selectedOutcome === 'amazing' && styles.selectedButton,
              ]}
              onPress={() => handleSelectOutcome('amazing')}>
              <Text style={styles.feedbackButtonText}>Date Went Amazing</Text>
            </TouchableOpacity>
            <View style={styles.halfWidthRow}>
              <TouchableOpacity
                style={[
                  styles.feedbackButton,
                  styles.halfWidthButton,
                  styles.stoodUpButton,
                  selectedOutcome === 'stood_up' && styles.selectedButton,
                ]}
                onPress={() => handleSelectOutcome('stood_up')}>
                <Text style={styles.feedbackButtonText}>Stood Up</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.feedbackButton,
                  styles.halfWidthButton,
                  styles.cancelledButton,
                  selectedOutcome === 'cancelled' && styles.selectedButton,
                ]}
                onPress={() => handleSelectOutcome('cancelled')}>
                <Text style={styles.feedbackButtonText}>Cancelled</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                styles.fullWidthButton,
                styles.otherButton,
                selectedOutcome === 'other' && styles.selectedButton,
              ]}
              onPress={() => handleSelectOutcome('other')}>
              <Text style={styles.feedbackButtonText}>Other</Text>
            </TouchableOpacity>
          </View>

          {selectedOutcome === 'other' && (
            <TextInput
              style={styles.notesInput}
              placeholder="Tell us more about your date... (max 2500 characters)"
              placeholderTextColor="#666"
              multiline
              maxLength={2500}
              value={notes}
              onChangeText={setNotes}
            />
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, !selectedOutcome && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={!selectedOutcome || isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
const BubblePopup = ({ visible, type, title, message, buttonText, onClose }) => {
  // ... (no changes in this component)
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
const getTypeOfAttraction = (r, s, f) => {
  // ... (no changes in this function)
  const interest = r + s + f;
  if (interest === 0) return 'Not Specified';
  if (s === 0 && r === 0 && f === 0) return 'No Interest';
  if (r === 0 && f === 0) return 'Hook Up';
  if (r === 0 && s === 0) return 'Friends!';
  if (f === 0 && s === 0) return 'Company';
  if (r === 0) return 'FWB';
  if (s === 0) return 'Platonic Dating';
  if (f === 0) return 'Lovers';
  if (interest < 5) return 'We Could Meet';
  if (interest === 5) return "I'm Into It";
  if (interest === 6) return 'Would Love to Meet';
  return 'My Person!';
};
const UpcomingDateItem = ({ item, onPress, onRatePress }) => {
  // ... (no changes in this component)
  const attractionType = getTypeOfAttraction(
    item.romanticRating,
    item.sexualRating,
    item.friendshipRating
  );

  const canGiveFeedback = isPast(parseISO(item.date)) && !item.myOutcome;
  const hasGivenFeedback = !!item.myOutcome;

  return (
    <TouchableOpacity style={styles.upcomingItem} onPress={() => onPress(item)}>
      <Avatar.Image size={52} source={{ uri: item.otherUser.profilePictureUrl }} />
      <View style={styles.upcomingItemDetails}>
        <Text style={styles.upcomingItemName} numberOfLines={1}>
          {item.otherUser.firstName}
        </Text>
        <Text style={styles.upcomingItemInfo} numberOfLines={1}>
          {format(parseISO(item.date), 'MMMM dd, yyyy')} at {item.locationMetadata.name}
        </Text>
        <Text style={styles.upcomingItemTime}>
          {item.time ? format(parseISO(`1970-01-01T${item.time}`), 'p') : 'Time not set'}
        </Text>
        {(item.romanticRating > 0 || item.sexualRating > 0 || item.friendshipRating > 0) && (
          <View style={styles.attractionTypeContainer}>
            <Ionicons name="heart-circle" size={16} color={colors.PinkPrimary || '#f87171'} />
            <Text style={styles.attractionTypeText}>{attractionType}</Text>
          </View>
        )}
      </View>
      <View style={styles.statusSection}>
        <View style={styles.statusContainer}>
          <Ionicons name="checkmark-circle" size={20} color={colors.Success || '#28a745'} />
          <Text style={styles.statusText}>Approved</Text>
        </View>
        {canGiveFeedback && (
          <TouchableOpacity style={styles.rateButton} onPress={() => onRatePress(item)}>
            <Text style={styles.rateButtonText}>Rate Date</Text>
          </TouchableOpacity>
        )}
        {hasGivenFeedback && <Text style={styles.feedbackSentText}>Feedback Sent</Text>}
      </View>
    </TouchableOpacity>
  );
};

const CalendarHomeScreen = () => {
  const { auth0User, logout, isReady: isAuthReady, isLoading: isAuthLoading } = useAuth();
  const { tokenBalance, userProfile } = useUserStore();
  const router = useRouter();

  const [isCalendarLoading, setIsCalendarLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [upcomingDates, setUpcomingDates] = useState<UpcomingDate[]>([]);
  const [isUpcomingLoading, setIsUpcomingLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFeedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedDateForFeedback, setSelectedDateForFeedback] = useState<UpcomingDate | null>(null);
  const [popupState, setPopupState] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showPopup = (title: string, message: string, type: 'success' | 'error' = 'error') => {
    setPopupState({ visible: true, title, message, type });
  };

  // --- (Logic functions remain unchanged) ---
  const fetchAllScreenData = useCallback(async () => {
    if (!auth0User?.sub) {
      setIsCalendarLoading(false);
      setIsUpcomingLoading(false);
      return;
    }
    if (!isRefreshing) {
      setIsCalendarLoading(true);
      setIsUpcomingLoading(true);
    }

    try {
      const [calendarResponse, upcomingResponse, countResponse] = await Promise.all([
        getCalendarDaysByUserId(),
        getUpcomingDates(),
        getUnreadNotificationsCount(),
      ]);

      const initialDates = upcomingResponse.data.map((d) => ({
        ...d,
        romanticRating: 0,
        sexualRating: 0,
        friendshipRating: 0,
      }));

      setCalendarData(calendarResponse.data);
      setUpcomingDates(initialDates);
      setUnreadCount(countResponse.data.unreadCount);
    } catch (apiError: any) {
      showPopup('Load Failed', 'Could not load your calendar data. Please try again.', 'error');
    } finally {
      setIsCalendarLoading(false);
      setIsUpcomingLoading(false);
      setIsRefreshing(false);
    }
  }, [auth0User, isRefreshing]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthReady && !isAuthLoading) fetchAllScreenData();
    }, [isAuthReady, isAuthLoading, fetchAllScreenData])
  );
  useEffect(() => {
    const fetchAttractionsForDates = async () => {
      if (
        upcomingDates.length === 0 ||
        !userProfile?.userId ||
        upcomingDates.every(
          (d) => d.romanticRating > 0 || d.sexualRating > 0 || d.friendshipRating > 0
        )
      ) {
        return;
      }

      const attractionPromises = upcomingDates.map((date) => {
        const myId = userProfile.userId;
        const otherId = date.otherUser.userId;

        let userFrom, userTo;
        if (date.userFrom === myId) {
          userFrom = myId;
          userTo = otherId;
        } else {
          userFrom = otherId;
          userTo = myId;
        }

        return getAttractionByUserFromUserToAndDate(
          userFrom,
          userTo,
          format(parseISO(date.date), 'yyyy-MM-dd')
        ).catch(() => null);
      });

      const attractionResults = await Promise.all(attractionPromises);

      const datesWithAttractions = upcomingDates.map((date, index) => {
        const attractionData = attractionResults[index]?.data;
        if (attractionData) {
          return {
            ...date,
            romanticRating: attractionData.romanticRating || 0,
            sexualRating: attractionData.sexualRating || 0,
            friendshipRating: attractionData.friendshipRating || 0,
          };
        }
        return date;
      });

      setUpcomingDates(datesWithAttractions);
    };

    fetchAttractionsForDates();
  }, [upcomingDates, userProfile?.userId]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (isAuthReady) fetchAllScreenData();
    else setIsRefreshing(false);
  }, [isAuthReady, fetchAllScreenData]);
  const handleFeedbackSubmit = async (feedback: { outcome: DateOutcome; notes?: string }) => {
    if (!selectedDateForFeedback) return;

    try {
      const response = await addDateFeedback(selectedDateForFeedback.dateId, feedback);

      setUpcomingDates((currentDates) =>
        currentDates.map((d) =>
          d.dateId === selectedDateForFeedback.dateId
            ? {
                ...d,
                myOutcome: response.data.outcome,
                myNotes: response.data.notes,
              }
            : d
        )
      );

      setFeedbackModalVisible(false);
      setSelectedDateForFeedback(null);
      showPopup('Thank You!', 'Your feedback has been submitted.', 'success');
    } catch (error) {
      console.error('Failed to submit feedback', error);
      showPopup('Submission Failed', 'Could not submit your feedback. Please try again.', 'error');
    }
  };

  const handleDateItemPress = (item: UpcomingDate) => {
    if (!item.updatedAt) {
      showPopup('Error', 'Cannot verify date status. Please refresh.', 'error');
      return;
    }
    try {
      const approvalTime = parseISO(item.updatedAt);
      const currentTime = new Date();
      const hours72_in_ms = 72 * 60 * 60 * 1000;
      const differenceInMs = currentTime.getTime() - approvalTime.getTime();
      if (differenceInMs < hours72_in_ms) {
        router.push(`/(app)/dates/${item.dateId}`);
      } else {
        showPopup(
          'Date Locked',
          'This date was approved more than 72 hours ago and can no longer be modified.',
          'error'
        );
      }
    } catch (e) {
      console.error('Error parsing date for 72-hour check:', e);
      showPopup('Error', 'An unexpected error occurred while checking the date.', 'error');
    }
  };

  const handleRatePress = (item: UpcomingDate) => {
    setSelectedDateForFeedback(item);
    setFeedbackModalVisible(true);
  };

  if (!isAuthReady || isAuthLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.GoldPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topHeader}>
        <View style={styles.headerGroupLeft}>
          <Image source={LOGO_IMAGE} style={styles.logoImage} />
          <View style={styles.tokenDisplayContainer}>
            <Image source={COIN_ICON} style={styles.tokenIcon} />
            <Text style={styles.tokenTextValue}>
              {tokenBalance !== null ? (
                `${tokenBalance} ${tokenBalance === 1 ? 'coin' : 'coins'}`
              ) : (
                <ActivityIndicator size="small" color="#FFFFFF" />
              )}
            </Text>
          </View>
        </View>
        <View style={styles.headerGroupRight}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(app)/profile')}>
            <Ionicons name="home-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              setUnreadCount(0);
              router.push('/(app)/notifications');
            }}>
            <Ionicons name="notifications-outline" size={25} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* ✅ LOGOUT BUTTON REPLACED WITH ICON */}
          <TouchableOpacity style={styles.iconButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={28} color={colors.PinkPrimary || '#f87171'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
        }>
        {isCalendarLoading ? (
          <View style={[styles.loadingContainer, { minHeight: 400 }]}>
            <ActivityIndicator size="large" color={colors.GoldPrimary} />
          </View>
        ) : (
          <View style={styles.calendarGridContainer}>
            <VideoCalendar user={auth0User} calendarData={calendarData} />
          </View>
        )}
        <View style={styles.upcomingSection}>
          <Text style={styles.upcomingTitle}>Upcoming & Past Dates</Text>
          {isUpcomingLoading && upcomingDates.length === 0 ? (
            <ActivityIndicator color="#FFF" style={{ marginTop: 20 }} />
          ) : upcomingDates.length > 0 ? (
            <View style={styles.listContainer}>
              {upcomingDates.map((item, index) => (
                <React.Fragment key={item.dateId}>
                  <UpcomingDateItem
                    item={item}
                    onPress={handleDateItemPress}
                    onRatePress={handleRatePress}
                  />
                  {index < upcomingDates.length - 1 && <View style={styles.separator} />}
                </React.Fragment>
              ))}
            </View>
          ) : (
            <Text style={styles.noUpcomingText}>No dates scheduled.</Text>
          )}
        </View>
      </ScrollView>

      <FeedbackModal
        visible={isFeedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
        onSubmit={handleFeedbackSubmit}
      />
      <BubblePopup
        visible={popupState.visible}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        buttonText="OK"
        onClose={() => setPopupState((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.Background || '#121212',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 15,
    height: 60,
  },
  headerGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerGroupRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 80,
    height: 28,
    resizeMode: 'contain',
    marginRight: 15,
  },
  tokenDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tokenIcon: { width: 20, height: 20, marginRight: 8 },
  tokenTextValue: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  iconButton: {
    paddingHorizontal: 8, // Added horizontal padding for better spacing
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 2,
    backgroundColor: 'red',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#121212',
  },
  notificationBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  // ✅ Removed logoutButton and logoutButtonText styles as they are no longer needed
  calendarGridContainer: { paddingHorizontal: 15 },
  upcomingSection: { marginTop: 30, paddingHorizontal: 15 },
  upcomingTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 10 },
  listContainer: {
    backgroundColor: colors.DarkGrey || '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  separator: { height: 1, backgroundColor: '#3A3A3C' },
  noUpcomingText: { color: '#AAAAAA', textAlign: 'center', marginTop: 20, fontSize: 16 },
  upcomingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  upcomingItemDetails: { flex: 1, marginLeft: 12, gap: 2 },
  upcomingItemName: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  upcomingItemInfo: { fontSize: 13, color: '#EBEBF599' },
  upcomingItemTime: { fontSize: 13, color: '#EBEBF599', fontWeight: '500' },
  attractionTypeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  attractionTypeText: {
    marginLeft: 6,
    fontSize: 13,
    color: colors.PinkPrimary || '#f87171',
    fontWeight: '600',
  },
  statusSection: { alignItems: 'center', marginLeft: 10 },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 167, 69, 0.15)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusText: {
    color: colors.Success || '#28a745',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  rateButton: {
    marginTop: 8,
    backgroundColor: colors.PinkPrimary,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  rateButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  feedbackSentText: { marginTop: 8, color: colors.GoldPrimary, fontSize: 12, fontStyle: 'italic' },
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
  errorButton: { backgroundColor: colors.PinkPrimary || '#FF6B6B' },
  successButton: { backgroundColor: colors.GoldPrimary || '#FFD700' },
  errorButtonText: { color: colors.White || '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  successButtonText: { color: colors.Black || '#000000', fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  modalSubtitle: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 25,
  },
  feedbackOptionsContainer: { marginBottom: 20 },
  halfWidthRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  feedbackButton: {
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButton: { width: '100%', marginBottom: 10 },
  halfWidthButton: { width: '48%' },
  amazingButton: { backgroundColor: '#00BFFF' },
  stoodUpButton: { backgroundColor: '#FFD700' },
  cancelledButton: { backgroundColor: '#FFA500' },
  otherButton: { backgroundColor: '#FF4500' },
  feedbackButtonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  selectedButton: { borderColor: '#fff', transform: [{ scale: 1.05 }] },
  notesInput: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 10,
    padding: 15,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  closeButton: {
    backgroundColor: '#555',
    paddingVertical: 15,
    borderRadius: 12,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  submitButton: {
    backgroundColor: colors.PinkPrimary,
    paddingVertical: 15,
    borderRadius: 12,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  disabledButton: { backgroundColor: '#888' },
});

export default CalendarHomeScreen;
