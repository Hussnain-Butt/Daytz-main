// --- COMPLETE FINAL UPDATED CODE: app/(app)/attraction.tsx ---

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert, // Confirmation dialog ke liye rakha gaya hai
  Image,
  StatusBar as RNStatusBar,
  Platform,
  Modal, // BubblePopup ke liye import
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import {
  getUserTokenBalance,
  getUserById,
  isAuthTokenApiError,
  getAttractionByUserFromUserToAndDate,
} from '../../api/api';
import { Attraction as AttractionResponse } from '../../types/Attraction';
import { colors as themeColors } from '../../utils/theme';
import { useUserStore } from '../../store/useUserStore';
import { Provider as PaperProvider } from 'react-native-paper';

// --- ICONS ---
const BACK_ARROW_ICON = require('../../assets/back_arrow_icon.png');
const HOME_ICON_SOLID = require('../../assets/home_icon.png');
const ROMANTIC_ICON = require('../../assets/romantic.png');
const SEXUAL_ICON = require('../../assets/sexual.png');
const FRIENDSHIP_ICON = require('../../assets/friendship.png');
const TOKEN_ICON = require('../../assets/match.png');

// =====> ALERT KI TASVEEREIN IMPORT KAREIN (PATH THEEK KAREIN) <=====
const calcHappyIcon = require('../../assets/calc-happy.png');
const calcErrorIcon = require('../../assets/calc-error.png');
// =====================================================================

// --- LABEL CONSTANTS ---
const ROMANTIC_LABELS: Record<number, string> = {
  0: 'None',
  1: 'Dinner',
  2: 'Dating',
  3: 'Partner',
};
const SEXUAL_LABELS: Record<number, string> = {
  0: 'None',
  1: "You're cute",
  2: 'Turned on',
  3: 'DTF',
};
const FRIENDSHIP_LABELS: Record<number, string> = {
  0: 'None',
  1: 'Hi',
  2: "Let's hang!",
  3: 'New BFF',
};

// --- SCREEN COLORS ---
const screenColors = {
  background: themeColors.Background || '#121212',
  cardBackground: 'transparent',
  headerBackground: themeColors.Background || '#121212',
  primaryAccentYellow: themeColors.GoldPrimary || '#FFD700',
  backButtonCircle: themeColors.TealPrimary || '#00BCD4',
  textPrimary: themeColors.White || '#FFFFFF',
  textSecondary: themeColors.LightGrey || '#B0B0B0',
  textValueLabel: themeColors.White || '#FFFFFF',
  textPlaceholder: themeColors.Grey || '#606060',
  buttonDisabled: themeColors.DarkGrey || '#424242',
  danger: themeColors.PinkPrimary || '#E91E63',
  sliderMinTrack: themeColors.White || '#FFFFFF',
  sliderMaxTrack: themeColors.Grey || '#606060',
  sliderThumb: themeColors.White || '#FFFFFF',
  borderColor: themeColors.DarkGrey || '#303030',
  tokenPillBackground: '#000000',
};

// --- CONSTANTS ---
const MIN_RATING = 0;
const MAX_RATING = 3;
const RATING_STEP = 1;

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

const getTypeOfAttraction = (r: number, s: number, f: number): string => {
  const interest = r + s + f;
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

export default function AttractionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    userToId: string;
    date: string;
    userToName?: string;
    userToProfilePic?: string;
  }>();

  const {
    userToId,
    date: storyDate,
    userToName: paramUserToName,
    userToProfilePic: paramUserToProfilePic,
  } = params;
  const { auth0User: authUser, logout } = useAuth();
  const { tokenBalance: storeTokenBalance, setTokenBalance: setStoreTokenBalance } = useUserStore();

  const [romanticRating, setRomanticRating] = useState(0);
  const [sexualRating, setSexualRating] = useState(0);
  const [friendshipRating, setFriendshipRating] = useState(0);
  const [existingAttraction, setExistingAttraction] = useState<AttractionResponse | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [targetUserDisplay, setTargetUserDisplay] = useState<{
    name: string;
    profilePictureUrl?: string | null;
  } | null>(null);
  const [isLoadingTargetUser, setIsLoadingTargetUser] = useState(false);

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

  useEffect(() => {
    RNStatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(screenColors.headerBackground);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!authUser) return;
    setIsLoadingBalance(true);
    try {
      const response = await getUserTokenBalance();
      setStoreTokenBalance(response.data.tokenBalance);
    } catch (err: any) {
      if (isAuthTokenApiError(err))
        showPopup('Session Expired', 'Please log in again.', 'error', () => logout && logout());
    } finally {
      setIsLoadingBalance(false);
    }
  }, [authUser, logout, setStoreTokenBalance]);

  useEffect(() => {
    if (!userToId || !storyDate) {
      showPopup('Error', 'Missing required info.', 'error', () => router.back());
      return;
    }
    const fetchInitialData = async () => {
      if (!authUser?.sub) return;
      setIsCheckingExisting(true);
      setIsLoadingTargetUser(true);

      try {
        const response = await getUserById(userToId);
        if (response.data) {
          setTargetUserDisplay({
            name:
              `${response.data.firstName || ''} ${response.data.lastName || ''}`.trim() || 'User',
            profilePictureUrl: response.data.profilePictureUrl,
          });
        } else {
          setTargetUserDisplay({ name: 'User (Not Found)', profilePictureUrl: null });
        }
      } catch (e) {
        setTargetUserDisplay({ name: 'User (Error)', profilePictureUrl: null });
      } finally {
        setIsLoadingTargetUser(false);
      }

      try {
        const attractionResponse = await getAttractionByUserFromUserToAndDate(
          authUser.sub,
          userToId,
          storyDate
        );
        if (attractionResponse.data) {
          setExistingAttraction(attractionResponse.data);
          setRomanticRating(attractionResponse.data.romanticRating || 0);
          setSexualRating(attractionResponse.data.sexualRating || 0);
          setFriendshipRating(attractionResponse.data.friendshipRating || 0);
        }
      } catch (err) {
        /* ... */
      } finally {
        setIsCheckingExisting(false);
      }
    };
    fetchInitialData();
  }, [userToId, storyDate, authUser?.sub]);

  useEffect(() => {
    if (storeTokenBalance === null && authUser) refreshBalance();
  }, [authUser, storeTokenBalance, refreshBalance]);

  const totalTokenCost = useMemo(() => {
    if (existingAttraction) return 0;
    return (romanticRating || 0) + (sexualRating || 0) + (friendshipRating || 0);
  }, [romanticRating, sexualRating, friendshipRating, existingAttraction]);

  const attractionTypeDescription = useMemo(() => {
    return getTypeOfAttraction(romanticRating, sexualRating, friendshipRating);
  }, [romanticRating, sexualRating, friendshipRating]);

  const canProceed = useMemo(() => {
    if (existingAttraction) return true;
    if (totalTokenCost === 0) return false;
    if (storeTokenBalance === null) return false;
    return storeTokenBalance >= totalTokenCost;
  }, [storeTokenBalance, totalTokenCost, existingAttraction]);

  const handleProceedToPropose = () => {
    if (!userToId || !storyDate) {
      showPopup('Error', 'Cannot proceed, essential information is missing.', 'error');
      return;
    }
    if (authUser?.sub === userToId) {
      showPopup('Action Not Allowed', 'You cannot express attraction to yourself.', 'error');
      return;
    }
    if (romanticRating === 0 && sexualRating === 0 && friendshipRating === 0) {
      showPopup(
        'No Rating Set',
        'Please adjust at least one slider to express attraction.',
        'error'
      );
      return;
    }
    if (!canProceed && !existingAttraction) {
      Alert.alert(
        'Insufficient Tokens',
        `You need ${totalTokenCost} token(s). You can still set up the date, but you'll need more tokens to send the proposal.`,
        [{ text: 'Continue Anyway' }, { text: 'Cancel', style: 'cancel' }]
      );
    }

    router.push({
      pathname: '/(app)/propose-date',
      params: {
        userToId,
        dateForProposal: storyDate,
        targetUserName: targetUserDisplay?.name || 'Selected User',
        targetUserProfilePic: targetUserDisplay?.profilePictureUrl || '',
        romanticRating: String(romanticRating),
        sexualRating: String(sexualRating),
        friendshipRating: String(friendshipRating),
        isUpdate: existingAttraction ? 'true' : 'false',
      },
    });
  };

  const sliderData = [
    {
      label: 'Romantic',
      value: romanticRating,
      setter: setRomanticRating,
      icon: ROMANTIC_ICON,
      labels: ROMANTIC_LABELS,
    },
    {
      label: 'Sexual',
      value: sexualRating,
      setter: setSexualRating,
      icon: SEXUAL_ICON,
      labels: SEXUAL_LABELS,
    },
    {
      label: 'Friendship',
      value: friendshipRating,
      setter: setFriendshipRating,
      icon: FRIENDSHIP_ICON,
      labels: FRIENDSHIP_LABELS,
    },
  ];

  if (isCheckingExisting || isLoadingTargetUser) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={screenColors.primaryAccentYellow} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  return (
    <PaperProvider>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <View style={styles.backButtonCircle}>
              <Image source={BACK_ARROW_ICON} style={styles.headerBackIcon} />
            </View>
            <Text style={styles.headerBackButtonText}>BACK</Text>
          </TouchableOpacity>
          <View style={styles.tokenDisplayContainer}>
            <Image source={TOKEN_ICON} style={styles.tokenIcon} />
            <Text style={styles.tokenTextValue}>
              {storeTokenBalance !== null ? `${storeTokenBalance} coins` : '...'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.replace('/(app)/calendar')}
            style={styles.headerHomeButton}>
            <Image source={HOME_ICON_SOLID} style={styles.headerHomeIcon} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContentContainer}>
          <Text style={styles.pageTitle}>
            {existingAttraction ? 'Update Attraction To' : 'Express Attraction To'}
          </Text>

          {targetUserDisplay && (
            <View style={styles.targetUserDisplay}>
              <Image
                source={{ uri: targetUserDisplay.profilePictureUrl }}
                style={styles.targetUserImage}
              />
              <Text style={styles.targetUserName}>{targetUserDisplay.name}</Text>
            </View>
          )}
          <Text style={styles.targetUserDate}>
            For story on: {storyDate ? format(new Date(storyDate), 'MMMM do, yyyy') : ''}
          </Text>

          <View style={styles.slidersSection}>
            {sliderData.map((item) => (
              <View key={item.label} style={styles.sliderItemContainer}>
                <Text style={styles.sliderItemMainLabel}>{item.label}</Text>
                <View style={styles.sliderIconValueRow}>
                  <Image source={item.icon} style={styles.sliderTypeIcon} />
                  <Text
                    style={
                      item.value === 0
                        ? styles.sliderItemValueLabelPlaceholder
                        : styles.sliderItemValueLabel
                    }>
                    {item.labels[Math.round(item.value)] || ''}
                  </Text>
                </View>
                <Slider
                  style={styles.sliderControl}
                  minimumValue={MIN_RATING}
                  maximumValue={MAX_RATING}
                  step={RATING_STEP}
                  value={item.value}
                  onValueChange={item.setter}
                  minimumTrackTintColor={screenColors.sliderMinTrack}
                  maximumTrackTintColor={screenColors.sliderMaxTrack}
                  thumbTintColor={screenColors.sliderThumb}
                />
              </View>
            ))}
          </View>

          {(romanticRating > 0 || sexualRating > 0 || friendshipRating > 0) && (
            <Text style={styles.attractionTypeResultText}>
              Attraction Type: {attractionTypeDescription}
            </Text>
          )}

          {!existingAttraction && (
            <View style={styles.tokenCostDisplay}>
              <Text style={styles.tokenCostLabelText}>Total Token Cost:</Text>
              <Text style={styles.tokenCostValueText}>{totalTokenCost}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.mainActionButton,
              styles.submitActionButton,
              totalTokenCost === 0 && !existingAttraction && styles.disabledActionButton,
            ]}
            onPress={handleProceedToPropose}
            disabled={totalTokenCost === 0 && !existingAttraction}>
            <Text style={[styles.mainActionButtonText, styles.submitActionButtonText]}>
              {existingAttraction ? 'UPDATE & PROPOSE DATE' : 'PROCEED TO PROPOSE DATE'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.explanatoryText}>
            Set your attraction level. Tokens will be deducted when you send the date proposal on
            the next screen.
          </Text>
        </ScrollView>
      </View>
      {/* Naya popup render ho raha hai */}
      <BubblePopup
        visible={popupState.visible}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        buttonText="OK"
        onClose={() => {
          const callback = popupState.onCloseCallback;
          setPopupState({ ...popupState, visible: false, onCloseCallback: undefined });
          if (callback) {
            callback();
          }
        }}
      />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: screenColors.background,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: screenColors.textSecondary, marginTop: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  headerBackButton: { flexDirection: 'row', alignItems: 'center', padding: 5 },
  backButtonCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: screenColors.backButtonCircle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerBackIcon: { width: 24, height: 24 },
  headerBackButtonText: { fontSize: 16, fontWeight: 'bold', color: screenColors.textPrimary },
  tokenDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: screenColors.tokenPillBackground,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: screenColors.primaryAccentYellow,
  },
  tokenIcon: { width: 20, height: 20, marginRight: 8 },
  tokenTextValue: { color: screenColors.textPrimary, fontSize: 14, fontWeight: 'bold' },
  headerHomeButton: { padding: 8 },
  headerHomeIcon: { width: 26, height: 26, tintColor: screenColors.textPrimary },
  scrollContentContainer: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 15 },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: screenColors.textPrimary,
    textAlign: 'center',
    marginBottom: 5,
  },
  targetUserDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    paddingVertical: 5,
    alignSelf: 'center',
  },
  targetUserImage: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  targetUserName: { fontSize: 18, fontWeight: '600', color: screenColors.textPrimary },
  targetUserDate: {
    fontSize: 13,
    color: screenColors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  slidersSection: { marginBottom: 15 },
  sliderItemContainer: {
    backgroundColor: screenColors.cardBackground,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  sliderItemMainLabel: {
    fontSize: 15,
    color: screenColors.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  sliderIconValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 36,
  },
  sliderTypeIcon: { width: 44, height: 44, marginRight: 12 },
  sliderItemValueLabel: { fontSize: 16, color: screenColors.textValueLabel, fontWeight: '600' },
  sliderItemValueLabelPlaceholder: {
    fontSize: 16,
    color: screenColors.textPlaceholder,
    fontStyle: 'italic',
  },
  sliderControl: { width: '100%', height: 28 },
  attractionTypeResultText: {
    fontSize: 17,
    fontWeight: '600',
    color: screenColors.textPrimary,
    textAlign: 'left',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 20,
  },
  tokenCostDisplay: {
    backgroundColor: screenColors.cardBackground,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: screenColors.borderColor,
  },
  tokenCostLabelText: { fontSize: 16, fontWeight: '500', color: screenColors.textPrimary },
  tokenCostValueText: { fontSize: 20, fontWeight: 'bold', color: screenColors.primaryAccentYellow },
  mainActionButton: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  submitActionButton: { backgroundColor: screenColors.primaryAccentYellow },
  submitActionButtonText: { fontSize: 16, fontWeight: 'bold', color: themeColors.Black || '#000' },
  disabledActionButton: { backgroundColor: screenColors.buttonDisabled, opacity: 0.7 },
  explanatoryText: {
    fontSize: 12,
    color: screenColors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },

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
    backgroundColor: themeColors.PinkPrimary || '#FF6B6B',
  },
  successButton: {
    backgroundColor: themeColors.GoldPrimary || '#FFD700',
  },
  errorButtonText: {
    color: themeColors.White || '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  successButtonText: {
    color: themeColors.Black || '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
