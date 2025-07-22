// File: app/(app)/propose-date.tsx
// ✅ COMPLETE AND FINAL UPDATED CODE

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Keyboard,
  TextInput,
  StatusBar as RNStatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  FlatList,
} from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { format, parseISO, isValid } from 'date-fns';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import {
  createDate,
  getUserById,
  isAuthTokenApiError,
  getUserTokenBalance,
  getDateByUserFromUserToAndDate,
} from '../../api/api';
import { CreateDatePayload, DateObject as DateType } from '../../types/Date';
import { User } from '../../types/User';
import { useUserStore } from '../../store/useUserStore';

// --- Assets ---
const BACK_ARROW_ICON = require('../../assets/back_arrow_icon.png');
const BRAND_LOGO = require('../../assets/brand.png');
const calcHappyIcon = require('../../assets/calc-happy.png');
const calcErrorIcon = require('../../assets/calc-error.png');

// --- Screen Colors ---
const screenColors = {
  background: '#121212',
  textPrimary: '#FFFFFF',
  textSecondary: '#EBEBF599',
  inputBackground: '#2C2C2E',
  inputPlaceholder: '#8E8E93',
  buttonBackground: '#FFD700',
  buttonText: '#000000',
  avatarBorder: '#8E44AD',
  infoBoxBackground: '#2C2C2E',
  PinkPrimary: '#FF6B6B',
  GoldPrimary: '#FFD700',
  Black: '#000000',
  White: '#FFFFFF',
};

// --- BUBBLE POPUP COMPONENT ---
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

// --- Custom Hook for Debouncing ---
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const ProposeDateScreen = () => {
  const router = useRouter();
  // ✅✅✅ CHANGE: Attraction ratings ko yahan receive karein ✅✅✅
  const params = useLocalSearchParams<{
    userToId: string;
    dateForProposal: string;
    targetUserName?: string;
    targetUserProfilePic?: string;
    romanticRating: string;
    sexualRating: string;
    friendshipRating: string;
    isUpdate: string;
  }>();

  const {
    userToId,
    dateForProposal,
    targetUserName,
    targetUserProfilePic,
    romanticRating: romanticRatingStr,
    sexualRating: sexualRatingStr,
    friendshipRating: friendshipRatingStr,
    isUpdate,
  } = params;

  const { auth0User: authUser, logout } = useAuth();
  const { setTokenBalance: setStoreTokenBalance } = useUserStore();

  const [targetUser, setTargetUser] = useState<Partial<User> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [existingDateStatus, setExistingDateStatus] = useState<DateType['status'] | null>(null);

  const initialEventDate = dateForProposal ? parseISO(dateForProposal) : new Date();
  const [selectedEventDate, setSelectedEventDate] = useState<Date>(
    isValid(initialEventDate) ? initialEventDate : new Date()
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [venueName, setVenueName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [popupState, setPopupState] = useState({
    visible: false,
    type: 'error' as 'success' | 'error',
    title: '',
    message: '',
    onCloseCallback: undefined as (() => void) | undefined,
  });

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsPosition, setSuggestionsPosition] = useState({ top: 0, width: 0, left: 0 });
  const debouncedVenueName = useDebounce(venueName, 500);
  const venueInputRef = useRef<TextInput>(null);

  const showPopup = (
    title: string,
    message: string,
    type: 'success' | 'error' = 'error',
    onCloseCallback?: () => void
  ) => {
    setPopupState({ visible: true, title, message, type, onCloseCallback });
  };

  const GOOGLE_PLACES_API_KEY = 'AIzaSyCxKxK1sBXyfpme2zIJaseUa8E_KWWqHkM';

  const fetchPlaceSuggestions = useCallback(async (input: string) => {
    if (!input || input.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_PLACES_API_KEY}`
      );
      const json = await response.json();
      if (json.predictions) {
        setSuggestions(json.predictions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching place suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);
  useEffect(() => {
    if (debouncedVenueName) {
      fetchPlaceSuggestions(debouncedVenueName);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedVenueName, fetchPlaceSuggestions]);

  useEffect(() => {
    RNStatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') RNStatusBar.setBackgroundColor(screenColors.background);

    if (!userToId || !dateForProposal || !authUser?.sub) {
      showPopup('Error', 'Required information is missing.', 'error', () => router.back());
      return;
    }
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        if (targetUserName) {
          setTargetUser({ firstName: targetUserName, profilePictureUrl: targetUserProfilePic });
        } else {
          const response = await getUserById(userToId);
          setTargetUser(response.data || { firstName: 'User Not Found' });
        }
      } catch (fetchError) {
        setTargetUser({ firstName: 'Error Loading User' });
      }
      try {
        const dateResponse = await getDateByUserFromUserToAndDate(
          authUser.sub,
          userToId,
          dateForProposal
        );
        if (dateResponse.data?.status)
          setExistingDateStatus(dateResponse.data.status as DateType['status']);
      } catch (dateError) {
        console.log('No existing date found, which is normal.');
      }
      setIsLoading(false);
    };
    fetchInitialData();
  }, [userToId, dateForProposal, authUser?.sub, targetUserName, targetUserProfilePic]);

  const handleTimeConfirm = (time: Date) => {
    setSelectedTime(time);
    setShowTimePicker(false);
  };
  const handleSelectSuggestion = (suggestion: any) => {
    setVenueName(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  // ✅✅✅ CHANGE: API Payload mein ab ratings shaamil hain ✅✅✅
  const handleProposeDate = useCallback(async () => {
    Keyboard.dismiss();
    if (!authUser?.sub || !userToId) {
      showPopup('Error', 'Authentication issue.', 'error');
      return;
    }
    if (!selectedTime || !venueName.trim()) {
      showPopup('Validation Error', 'Please fill out venue and time.', 'error');
      return;
    }

    setIsSubmitting(true);

    const payload: CreateDatePayload = {
      userTo: userToId,
      date: format(selectedEventDate, 'yyyy-MM-dd'),
      time: format(selectedTime, 'HH:mm:ss'),
      locationMetadata: { name: venueName.trim(), address: '' },
      romanticRating: parseInt(romanticRatingStr || '0', 10),
      sexualRating: parseInt(sexualRatingStr || '0', 10),
      friendshipRating: parseInt(friendshipRatingStr || '0', 10),
      isUpdate: isUpdate === 'true',
    };

    try {
      await createDate(payload);
      const tokenResponse = await getUserTokenBalance();
      setStoreTokenBalance(tokenResponse.data.tokenBalance);
      showPopup('Success!', 'Your date proposal has been sent.', 'success', () =>
        router.replace('/(app)/calendar')
      );
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message || err.message || 'Failed to send proposal.';
      showPopup('Proposal Failed', backendMessage, 'error');
      if (isAuthTokenApiError(err)) logout && logout();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    authUser,
    userToId,
    selectedEventDate,
    selectedTime,
    venueName,
    isUpdate,
    router,
    setStoreTokenBalance,
    romanticRatingStr,
    sexualRatingStr,
    friendshipRatingStr,
    logout,
  ]);

  const measureVenueInput = () => {
    venueInputRef.current?.measure((fx, fy, width, height, px, py) => {
      setSuggestionsPosition({ top: py + height + 4, width, left: px });
    });
  };

  const renderFooter = () => {
    if (existingDateStatus === 'pending') {
      return (
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxText}>Proposal Already Sent</Text>
          <Text style={styles.infoBoxSubText}>Waiting for the other user to respond.</Text>
        </View>
      );
    }
    if (existingDateStatus === 'approved') {
      return (
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxText}>Date is Confirmed!</Text>
          <Text style={styles.infoBoxSubText}>You can check the details in your calendar.</Text>
        </View>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.disabledButton]}
        onPress={handleProposeDate}
        disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={screenColors.buttonText} />
        ) : (
          <Text style={styles.submitButtonText}>Submit</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={screenColors.textPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.innerContainer}>
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Image source={BACK_ARROW_ICON} style={styles.backIcon} />
              </TouchableOpacity>
              <Image source={BRAND_LOGO} style={styles.headerLogo} />
              <View style={{ width: 40 }} />
            </View>
            <View style={styles.mainContent}>
              <View style={styles.userInfoContainer}>
                {targetUser?.profilePictureUrl ? (
                  <Avatar.Image
                    size={64}
                    source={{ uri: targetUser.profilePictureUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <Avatar.Icon size={64} icon="account" style={styles.avatarPlaceholder} />
                )}
                <Text style={styles.userName}>{targetUser?.firstName || 'User'}</Text>
              </View>
              <Text style={styles.dateDisplay}>
                Date: {format(selectedEventDate, 'MMM dd, yyyy')}
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Venue</Text>
                <TextInput
                  ref={venueInputRef}
                  style={styles.textInput}
                  placeholder="e.g., boo Club, East Anaheim Street..."
                  placeholderTextColor={screenColors.inputPlaceholder}
                  value={venueName}
                  onChangeText={setVenueName}
                  onFocus={measureVenueInput}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.textInput}>
                  <Text
                    style={[
                      styles.inputText,
                      !selectedTime && { color: screenColors.inputPlaceholder },
                    ]}>
                    {selectedTime ? format(selectedTime, 'p') : 'Select a time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
        <View style={styles.footer}>{renderFooter()}</View>
      </KeyboardAvoidingView>
      {showSuggestions && suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.place_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => handleSelectSuggestion(item)}>
              <Text style={styles.suggestionText}>{item.description}</Text>
            </TouchableOpacity>
          )}
          style={[
            styles.suggestionsList,
            {
              top: suggestionsPosition.top,
              left: suggestionsPosition.left,
              width: suggestionsPosition.width,
            },
          ]}
          keyboardShouldPersistTaps="always"
        />
      )}
      <DateTimePickerModal
        isVisible={showTimePicker}
        mode="time"
        onConfirm={handleTimeConfirm}
        onCancel={() => setShowTimePicker(false)}
      />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: screenColors.background,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  scrollContentContainer: { flexGrow: 1, justifyContent: 'space-between' },
  innerContainer: { paddingHorizontal: 20 },
  mainContent: { flex: 1 },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    height: 60,
  },
  backButton: { padding: 8, marginLeft: -8 },
  backIcon: { width: 32, height: 32, resizeMode: 'contain' },
  headerLogo: { width: 100, height: 40, resizeMode: 'contain' },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  avatar: { borderWidth: 3, borderColor: screenColors.avatarBorder },
  avatarPlaceholder: {
    backgroundColor: '#48484A',
    borderWidth: 3,
    borderColor: screenColors.avatarBorder,
  },
  userName: { fontSize: 20, fontWeight: '600', color: screenColors.textPrimary, marginLeft: 16 },
  dateDisplay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: screenColors.textPrimary,
    marginVertical: 15,
  },
  inputContainer: { marginBottom: 24 },
  inputLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: screenColors.textPrimary,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: screenColors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: screenColors.textPrimary,
    height: 52,
    justifyContent: 'center',
  },
  inputText: { fontSize: 16, color: screenColors.textPrimary },
  footer: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: screenColors.background,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  submitButton: {
    backgroundColor: screenColors.buttonBackground,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: { backgroundColor: '#555' },
  submitButtonText: { fontSize: 18, fontWeight: 'bold', color: screenColors.buttonText },
  infoBox: {
    backgroundColor: screenColors.infoBoxBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  infoBoxText: { fontSize: 18, fontWeight: 'bold', color: screenColors.textPrimary },
  infoBoxSubText: { fontSize: 14, color: screenColors.textSecondary, marginTop: 4 },
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
  suggestionsList: {
    position: 'absolute',
    maxHeight: 200,
    backgroundColor: screenColors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: screenColors.avatarBorder,
    zIndex: 1000,
    elevation: 10,
  },
  suggestionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#3A3A3C' },
  suggestionText: { color: screenColors.textPrimary, fontSize: 16 },
});

export default ProposeDateScreen;
