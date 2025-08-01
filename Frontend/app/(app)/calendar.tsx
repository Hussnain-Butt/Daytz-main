// ✅ COMPLETE AND FINAL UPDATED FILE

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
import { format, parseISO, isPast, isValid } from 'date-fns';
import { Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

// Asset Imports
const LOGO_IMAGE = require('../../assets/brand.png');
const calcHappyIcon = require('../../assets/calc-happy.png');
const calcErrorIcon = require('../../assets/calc-error.png');

// --- FeedbackModal component (No changes needed) ---
const FeedbackModal = ({ visible, onClose, onSubmit }) => {
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
    await onSubmit({ outcome: selectedOutcome, notes });
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
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                styles.fullWidthButton,
                styles.noShowButton,
                selectedOutcome === 'no_show_cancelled' && styles.selectedButton,
              ]}
              onPress={() => handleSelectOutcome('no_show_cancelled')}>
              <Text style={styles.feedbackButtonText}>Stood Up / Cancelled</Text>
            </TouchableOpacity>
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
              placeholderTextColor={colors.placeholderTextColor || '#9CA4A4'}
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
              style={[
                styles.submitButton,
                (!selectedOutcome || isLoading) && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={!selectedOutcome || isLoading}>
              {isLoading ? (
                <ActivityIndicator color={colors.White} />
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

// --- BubblePopup component (No changes needed) ---
const BubblePopup = ({ visible, type, title, message, buttonText, onClose }) => {
  if (!visible) return null;
  const isSuccess = type === 'success';
  const imageSource = isSuccess ? calcHappyIcon : calcErrorIcon;
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.popupContainer}>
          <Image source={imageSource} style={styles.popupImage} />
          <View style={styles.bubble}>
            <Text style={styles.popupTitle}>{title}</Text>
            <Text style={styles.popupMessage}>{message}</Text>
            <TouchableOpacity
              style={[styles.popupButton, isSuccess ? styles.successButton : styles.errorButton]}
              onPress={onClose}>
              <Text style={isSuccess ? styles.successButtonText : styles.errorButtonText}>
                {buttonText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// --- Helper for attraction type (No changes needed) ---
const getTypeOfAttraction = (r: number, s: number, f: number) => {
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

// --- ✅✅✅ UpcomingDateItem component (YAHAN BADLAV KIYA GAYA HAI) ✅✅✅ ---
const UpcomingDateItem = ({
  item,
  onPress,
  onRatePress,
}: {
  item: UpcomingDate;
  onPress: (item: UpcomingDate) => void;
  onRatePress: (item: UpcomingDate) => void;
}) => {
  if (!item || !item.date || !item.otherUser) {
    return null;
  }

  const attractionType = getTypeOfAttraction(
    item.romanticRating,
    item.sexualRating,
    item.friendshipRating
  );

  const parsedDate = parseISO(item.date);
  const isValidDate = isValid(parsedDate);

  // ✅ YEH LOGIC AAPKI REQUIREMENT POORI KAREGA
  const isDateInPast = isValidDate && isPast(parsedDate); // Check if the date has passed
  const hasGivenFeedback = !!item.myOutcome; // Check if feedback is already submitted

  return (
    <TouchableOpacity style={styles.upcomingItem} onPress={() => onPress(item)}>
      <Avatar.Image size={52} source={{ uri: item.otherUser.profilePictureUrl }} />
      <View style={styles.upcomingItemDetails}>
        <Text style={styles.upcomingItemName} numberOfLines={1}>
          {item.otherUser.firstName}
        </Text>
        <Text style={styles.upcomingItemInfo} numberOfLines={1}>
          {isValidDate ? format(parsedDate, 'MMMM dd, yyyy') : 'Invalid Date'} at{' '}
          {item.locationMetadata?.name || 'N/A'}
        </Text>
        <Text style={styles.upcomingItemTime}>
          {item.time ? format(parseISO(`1970-01-01T${item.time}`), 'p') : 'Time not set'}
        </Text>
        {(item.romanticRating > 0 || item.sexualRating > 0 || item.friendshipRating > 0) && (
          <View style={styles.attractionTypeContainer}>
            <Ionicons name="heart-circle" size={16} color={colors.PinkPrimary} />
            <Text style={styles.attractionTypeText}>{attractionType}</Text>
          </View>
        )}
      </View>
      <View style={styles.statusSection}>
        <View style={styles.statusContainer}>
          <Ionicons name="checkmark-circle" size={20} color={colors.Success} />
          <Text style={styles.statusText}>Confirmed</Text>
        </View>

        {/* ✅ YAHAN CONDITIONAL RENDERING KA NAYA LOGIC HAI */}
        {hasGivenFeedback ? (
          // 1. Agar feedback de diya hai, to yeh dikhao
          <Text style={styles.feedbackSentText}>Feedback Sent</Text>
        ) : isDateInPast ? (
          // 2. Agar date guzar gayi hai aur feedback nahi diya, to active button dikhao
          <TouchableOpacity style={styles.rateButton} onPress={() => onRatePress(item)}>
            <Text style={styles.rateButtonText}>Rate Date</Text>
          </TouchableOpacity>
        ) : (
          // 3. Agar date aane wali hai, to disabled button dikhao
          <View style={[styles.rateButton, styles.disabledRateButton]}>
            <Text style={styles.disabledRateButtonText}>Rate Date</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// --- Main Screen ---
const CalendarHomeScreen = () => {
  const { auth0User, isReady: isAuthReady, isLoading: isAuthLoading } = useAuth();
  const { userProfile } = useUserStore();
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

  const showPopup = (title: string, message: string, type: 'success' | 'error' = 'error') =>
    setPopupState({ visible: true, type, title, message });

  const fetchAllScreenData = useCallback(async () => {
    if (!auth0User?.sub || !userProfile?.userId) {
      setIsCalendarLoading(false);
      setIsUpcomingLoading(false);
      return;
    }
    if (!isRefreshing) {
      setIsCalendarLoading(true);
      setIsUpcomingLoading(true);
    }

    try {
      // ✅ The app makes API calls here to fetch data.
      const [calRes, upRes, countRes] = await Promise.all([
        getCalendarDaysByUserId(),
        getUpcomingDates(),
        getUnreadNotificationsCount(),
      ]);

      const validDates = (upRes.data || []).filter((item) => item && item.date && item.otherUser);

      setUnreadCount(countRes.data.unreadCount);
      setCalendarData(calRes.data);

      if (validDates.length > 0) {
        const attractionPromises = validDates
          .filter((d) => d.status === 'approved')
          .map((d) => {
            const from =
              d.userFrom === userProfile.userId ? userProfile.userId : d.otherUser.userId;
            const to = from === userProfile.userId ? d.otherUser.userId : userProfile.userId;
            const parsedDate = parseISO(d.date);
            if (!isValid(parsedDate)) return Promise.resolve(null);

            return getAttractionByUserFromUserToAndDate(
              from,
              to,
              format(parsedDate, 'yyyy-MM-dd')
            ).catch(() => null);
          });

        const attractionResults = await Promise.all(attractionPromises);

        const datesWithAttraction = validDates.map((d) => {
          const parsedDate = parseISO(d.date);
          if (!isValid(parsedDate))
            return { ...d, romanticRating: 0, sexualRating: 0, friendshipRating: 0 };

          const attractionResult = attractionResults.find(
            (r) =>
              r &&
              r.data &&
              isValid(parseISO(r.data.date)) &&
              format(parseISO(r.data.date), 'yyyy-MM-dd') === format(parsedDate, 'yyyy-MM-dd')
          );

          if (attractionResult?.data) {
            return {
              ...d,
              romanticRating: attractionResult.data.romanticRating || 0,
              sexualRating: attractionResult.data.sexualRating || 0,
              friendshipRating: attractionResult.data.friendshipRating || 0,
            };
          }
          return { ...d, romanticRating: 0, sexualRating: 0, friendshipRating: 0 };
        });

        setUpcomingDates(datesWithAttraction);
      } else {
        setUpcomingDates([]);
      }
    } catch (error) {
      // ✅ This is where the server error is caught.
      console.error('Failed to fetch screen data:', error);
      showPopup('Load Failed', 'Could not load your calendar data. Please try again.', 'error');
    } finally {
      setIsCalendarLoading(false);
      setIsUpcomingLoading(false);
      setIsRefreshing(false);
    }
  }, [auth0User, isRefreshing, userProfile]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthReady && !isAuthLoading) fetchAllScreenData();
    }, [isAuthReady, isAuthLoading, fetchAllScreenData])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (isAuthReady) fetchAllScreenData();
    else setIsRefreshing(false);
  }, [isAuthReady, fetchAllScreenData]);

  const handleFeedbackSubmit = async (feedback: { outcome: DateOutcome; notes?: string }) => {
    if (!selectedDateForFeedback) return;
    try {
      const res = await addDateFeedback(selectedDateForFeedback.dateId, feedback);
      setUpcomingDates(
        upcomingDates.map((d) =>
          d.dateId === selectedDateForFeedback.dateId
            ? { ...d, myOutcome: res.data.outcome, myNotes: res.data.notes }
            : d
        )
      );
      setFeedbackModalVisible(false);
      setSelectedDateForFeedback(null);
      showPopup('Thank You!', 'Your feedback has been submitted.', 'success');
    } catch {
      showPopup('Submission Failed', 'Could not submit your feedback. Please try again.', 'error');
    }
  };

  const handleDateItemPress = (item: UpcomingDate) => {
    if (!item.updatedAt || !isValid(parseISO(item.updatedAt)))
      return showPopup('Error', 'Cannot verify date status. Please refresh.', 'error');
    try {
      const diff = new Date().getTime() - parseISO(item.updatedAt).getTime();
      if (diff < 72 * 3600000) router.push(`/(app)/dates/${item.dateId}`);
      else
        showPopup(
          'Date Locked',
          'This date was approved more than 72 hours ago and can no longer be modified.',
          'error'
        );
    } catch {
      showPopup('Error', 'An unexpected error occurred while checking the date.', 'error');
    }
  };

  const handleRatePress = (item: UpcomingDate) => {
    setSelectedDateForFeedback(item);
    setFeedbackModalVisible(true);
  };

  if (!isAuthReady || isAuthLoading)
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.GoldPrimary} />
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topHeader}>
        <View style={styles.headerGroupLeft}>
          <Image source={LOGO_IMAGE} style={styles.logoImage} />
        </View>
        <View style={styles.headerGroupRight}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(app)/profile')}>
            <Ionicons name="person-outline" size={26} color={colors.White} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              setUnreadCount(0);
              router.push('/(app)/notifications');
            }}>
            <Ionicons name="notifications-outline" size={26} color={colors.White} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.White}
          />
        }>
        {isCalendarLoading ? (
          <View style={[styles.loadingContainer, { minHeight: 400 }]}>
            <ActivityIndicator size="large" color={colors.GoldPrimary} />
          </View>
        ) : (
          <View style={styles.calendarGridContainer}>
            <VideoCalendar
              user={auth0User}
              calendarData={calendarData}
              plannedDates={upcomingDates}
            />
          </View>
        )}
        <View style={styles.upcomingSection}>
          <Text style={styles.upcomingTitle}>Upcoming & Past Plans</Text>
          {isUpcomingLoading && upcomingDates.length === 0 ? (
            <ActivityIndicator color={colors.White} style={{ marginTop: 20 }} />
          ) : upcomingDates.some((d) => d.status === 'approved') ? (
            <View style={styles.listContainer}>
              {upcomingDates
                .filter((item) => item.status === 'approved')
                .map((item, idx) => (
                  <React.Fragment key={item.dateId}>
                    <UpcomingDateItem
                      item={item}
                      onPress={handleDateItemPress}
                      onRatePress={handleRatePress}
                    />
                    {idx < upcomingDates.filter((i) => i.status === 'approved').length - 1 && (
                      <View style={styles.separator} />
                    )}
                  </React.Fragment>
                ))}
            </View>
          ) : (
            <Text style={styles.noUpcomingText}>No confirmed plans scheduled.</Text>
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
        type={popupState.type as 'success' | 'error'}
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
    backgroundColor: colors.Background || '#2D2D2D',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  headerGroupLeft: { flexDirection: 'row', alignItems: 'center' },
  headerGroupRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  logoImage: { width: 100, height: 30, resizeMode: 'contain' },
  iconButton: {},
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F46A6A',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.GreyDark || '#1E1E1E',
  },
  notificationBadgeText: { color: colors.White || '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  calendarGridContainer: { padding: 15 },
  upcomingSection: { marginTop: 20, paddingHorizontal: 15 },
  upcomingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.White || '#FFFFFF',
    marginBottom: 10,
  },
  listContainer: { backgroundColor: colors.GreyDark || '#1E1E1E', borderRadius: 12, padding: 10 },
  separator: { height: 1, backgroundColor: colors.LightBackground || '#3F3F3F' },
  noUpcomingText: {
    color: colors.GreyBackground || '#AAAAAA',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  upcomingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  upcomingItemDetails: { flex: 1, marginLeft: 12 },
  upcomingItemName: { fontSize: 16, fontWeight: '600', color: colors.White || '#FFFFFF' },
  upcomingItemInfo: { fontSize: 13, color: colors.Grey || '#9CA4A4' },
  upcomingItemTime: { fontSize: 13, color: colors.Grey || '#9CA4A4' },
  attractionTypeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  attractionTypeText: {
    marginLeft: 6,
    fontSize: 13,
    color: colors.PinkPrimary || '#ff149d',
    fontWeight: '600',
  },
  statusSection: { alignItems: 'center', marginLeft: 10, width: 90 },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(58, 219, 118, 0.15)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusText: {
    color: colors.Success || '#3ADB76',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  rateButton: {
    marginTop: 8,
    backgroundColor: colors.PinkPrimary || '#ff149d',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
    width: '100%',
    alignItems: 'center',
  },
  rateButtonText: { color: colors.White || '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  // ✅ NAYA STYLE: Disabled button ke liye
  disabledRateButton: {
    backgroundColor: colors.DarkGrey || '#555555',
  },
  // ✅ NAYA STYLE: Disabled button ke text ke liye
  disabledRateButtonText: {
    color: colors.Grey || '#9CA4A4',
    fontSize: 12,
    fontWeight: 'bold',
  },
  feedbackSentText: {
    marginTop: 8,
    color: colors.GoldPrimary || '#FFDB5C',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContainer: { alignItems: 'center', width: '90%', maxWidth: 350 },
  popupImage: { width: 220, height: 220, resizeMode: 'contain', marginBottom: -80 },
  bubble: {
    width: '100%',
    backgroundColor: colors.White || '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    paddingTop: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  popupTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.Black || '#000000',
    textAlign: 'center',
    marginBottom: 10,
  },
  popupMessage: {
    fontSize: 16,
    color: colors.LightBlack || '#222B45',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  popupButton: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  errorButton: { backgroundColor: colors.PinkPrimary || '#ff149d' },
  successButton: { backgroundColor: colors.GoldPrimary || '#FFDB5C' },
  errorButtonText: { color: colors.White || '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  successButtonText: { color: colors.Black || '#000000', fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: colors.GreyDark || '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    color: colors.White || '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: colors.GreyBackground || '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },
  feedbackOptionsContainer: { gap: 10, marginBottom: 20 },
  feedbackButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButton: { width: '100%' },
  amazingButton: { backgroundColor: colors.TealPrimary || '#00E0FF' },
  noShowButton: { backgroundColor: '#FFA500' },
  otherButton: { backgroundColor: '#FF4500' },
  feedbackButtonText: { color: colors.White || '#FFFFFF', fontWeight: 'bold' },
  selectedButton: { transform: [{ scale: 1.02 }] },
  notesInput: {
    backgroundColor: colors.LightBackground || '#3F3F3F',
    color: colors.White || '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  closeButton: {
    backgroundColor: '#4A4A4A',
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  closeButtonText: { color: colors.White || '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  submitButton: {
    backgroundColor: colors.PinkPrimary || '#ff149d',
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  submitButtonText: { color: colors.White || '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  disabledButton: { backgroundColor: colors.DarkGrey || '#828282' },
});

export default CalendarHomeScreen;
