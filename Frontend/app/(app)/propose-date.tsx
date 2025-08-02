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
  TouchableWithoutFeedback,
} from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { format, parseISO, isValid } from 'date-fns';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
// FIX: Corrected import path for AuthContext
import { useAuth } from '../../contexts/AuthContext';
import {
  createDate,
  getUserById,
  isAuthTokenApiError,
  getDateByUserFromUserToAndDate,
  getAttractionByUserFromUserToAndDate,
} from '../../api/api';
import { CreateDatePayload, DateObject as DateType } from '../../types/Date';
import { User } from '../../types/User';
import { Attraction as AttractionResponse } from '../../types/Attraction';
import { useUserStore } from '../../store/useUserStore';

// --- Assets, Colors, Components ---
const BACK_ARROW_ICON = require('../../assets/back_arrow_icon.png');
const BRAND_LOGO = require('../../assets/brand.png');
const calcHappyIcon = require('../../assets/calc-happy.png');
const calcErrorIcon = require('../../assets/calc-error.png');
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

// BubblePopup Component
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

// Google Places API Key
const GOOGLE_PLACES_API_KEY = 'AIzaSyBwOm3P6Ji4Bleg3bLsT2TiumWAQF57uBM';

const ProposeDateScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ userToId: string; dateForProposal: string }>();
  const { userToId, dateForProposal } = params;
  const { auth0User: authUser, logout } = useAuth();

  const [targetUser, setTargetUser] = useState<Partial<User> | null>(null);
  const [myAttraction, setMyAttraction] = useState<AttractionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingDate, setExistingDate] = useState<DateType | null>(null);
  const [selectedEventDate, setSelectedEventDate] = useState<Date | null>(null);
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

  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const venueInputRef = useRef<TextInput>(null);
  const [venueInputLayout, setVenueInputLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const showPopup = (
    title: string,
    message: string,
    type: 'success' | 'error' = 'error',
    onCloseCallback?: () => void
  ) => {
    setPopupState({ visible: true, title, message, type, onCloseCallback });
  };

  useEffect(() => {
    RNStatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') RNStatusBar.setBackgroundColor(screenColors.background);

    if (!userToId || !dateForProposal || !authUser?.sub) {
      setError('Required information is missing to propose a date.');
      setIsLoading(false);
      return;
    }

    const dateStringOnly = dateForProposal.split('T')[0];
    const parts = dateStringOnly.split('-');
    const initialEventDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

    if (!isValid(initialEventDate) || parts.length < 3) {
      setError('The provided date is invalid.');
      setIsLoading(false);
      return;
    }
    setSelectedEventDate(initialEventDate);

    const fetchInitialData = async () => {
      try {
        const [userResponse, dateResponse, attractionResponse] = await Promise.all([
          getUserById(userToId),
          getDateByUserFromUserToAndDate(authUser.sub!, userToId, dateForProposal),
          getAttractionByUserFromUserToAndDate(authUser.sub!, userToId, dateForProposal),
        ]);

        if (!userResponse.data) throw new Error('Target user not found.');
        setTargetUser(userResponse.data);

        if (dateResponse.data) setExistingDate(dateResponse.data);

        if (!attractionResponse.data) {
          throw new Error('Could not load your attraction details to create a proposal.');
        }
        setMyAttraction(attractionResponse.data);
      } catch (err: any) {
        console.error('Failed to fetch initial data for propose date screen:', err);
        setError(err.message || 'Failed to load details. Please try again.');
        if (isAuthTokenApiError(err)) logout?.();
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [userToId, dateForProposal, authUser?.sub, logout]);

  const fetchPredictions = useCallback((input: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      if (input.length < 3) {
        setPredictions([]);
        return;
      }

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&key=${GOOGLE_PLACES_API_KEY}`
        );
        const json = await response.json();
        if (json.predictions && json.predictions.length > 0) {
          setPredictions(json.predictions);
          setShowPredictions(true);
        } else {
          setPredictions([]);
          setShowPredictions(false);
        }
      } catch (e) {
        console.error('Error fetching place predictions:', e);
        setPredictions([]);
        setShowPredictions(false);
      }
    }, 300);
  }, []);

  const handleVenueChangeText = (text: string) => {
    setVenueName(text);
    fetchPredictions(text);
  };

  const handlePredictionPress = (prediction: any) => {
    setVenueName(prediction.description);
    setPredictions([]);
    setShowPredictions(false);
    Keyboard.dismiss();
  };

  const handleTimeConfirm = (time: Date) => {
    setSelectedTime(time);
    setShowTimePicker(false);
  };

  const handleProposeDate = useCallback(async () => {
    Keyboard.dismiss();
    setShowPredictions(false);

    if (!authUser?.sub || !userToId || !selectedEventDate || !myAttraction) {
      showPopup('Error', 'Essential information is missing or match not found.', 'error');
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
      romanticRating: myAttraction.romanticRating || 0,
      sexualRating: myAttraction.sexualRating || 0,
      friendshipRating: myAttraction.friendshipRating || 0,
      isUpdate: false,
    };

    try {
      await createDate(payload);
      showPopup('Success!', 'Your date proposal has been sent.', 'success', () =>
        router.replace('/(app)/calendar')
      );
    } catch (err: any) {
      console.error('Error in createDate API call:', err.response?.data || err.message);
      const errorMessage = err?.response?.data?.message || 'An unexpected error occurred.';
      showPopup('Proposal Failed', errorMessage, 'error');
      if (isAuthTokenApiError(err)) logout?.();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    authUser,
    userToId,
    selectedEventDate,
    selectedTime,
    venueName,
    myAttraction,
    router,
    logout,
  ]);

  const renderFooter = () => {
    if (existingDate && existingDate.status !== 'cancelled' && existingDate.status !== 'declined') {
      return (
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxText}>Date Already Active</Text>
          <Text style={styles.infoBoxSubText}>A proposal for this day already exists.</Text>
        </View>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.submitButton, (isSubmitting || !myAttraction) && styles.disabledButton]}
        onPress={handleProposeDate}
        disabled={isSubmitting || !myAttraction}>
        {isSubmitting ? (
          <ActivityIndicator color={screenColors.buttonText} />
        ) : (
          <Text style={styles.submitButtonText}>Submit Proposal</Text>
        )}
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {});
    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={screenColors.textPrimary} />
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonError}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
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
          showsVerticalScrollIndicator={false}
          pointerEvents={showPredictions ? 'none' : 'auto'}>
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
                  <Avatar.Image size={64} source={{ uri: targetUser.profilePictureUrl }} />
                ) : (
                  <Avatar.Icon size={64} icon="account" style={styles.avatarPlaceholder} />
                )}
                <Text style={styles.userName}>{targetUser?.firstName || 'User'}</Text>
              </View>
              {selectedEventDate && (
                <Text style={styles.dateDisplay}>
                  Date: {format(selectedEventDate, 'MMM dd, yyyy')}
                </Text>
              )}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Venue</Text>
                <TextInput
                  ref={venueInputRef}
                  style={styles.textInput}
                  placeholder="e.g., boo Club, East Anaheim Street..."
                  placeholderTextColor={screenColors.inputPlaceholder}
                  value={venueName}
                  onChangeText={handleVenueChangeText}
                  onFocus={() => {
                    if (venueName.length >= 3) {
                      setShowPredictions(true);
                    }
                  }}
                  onLayout={() => {
                    venueInputRef.current?.measureInWindow((fx, fy, fwidth, fheight) => {
                      setVenueInputLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                    });
                  }}
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
      <Modal
        transparent
        visible={showPredictions && predictions.length > 0}
        onRequestClose={() => setShowPredictions(false)}
        animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPredictions(false)}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.predictionsModalContainer,
                {
                  top: venueInputLayout.y + venueInputLayout.height,
                  left: venueInputLayout.x,
                  width: venueInputLayout.width,
                },
              ]}>
              <FlatList
                data={predictions}
                keyExtractor={(item) => item.place_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.predictionItem}
                    onPress={() => handlePredictionPress(item)}>
                    <Text style={styles.predictionText}>{item.description}</Text>
                  </TouchableOpacity>
                )}
                style={styles.predictionsListModal}
                keyboardShouldPersistTaps="always"
              />
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: {
    color: screenColors.PinkPrimary,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonError: {
    backgroundColor: screenColors.GoldPrimary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  backButtonText: { color: screenColors.Black, fontSize: 16, fontWeight: 'bold' },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  predictionsModalContainer: {
    position: 'absolute',
    backgroundColor: screenColors.inputBackground,
    borderRadius: 12,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#48484A',
    overflow: 'hidden',
  },
  predictionsListModal: {
    flexGrow: 1,
  },
  predictionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
  },
  predictionText: {
    color: screenColors.textPrimary,
    fontSize: 16,
  },
});
export default ProposeDateScreen;
