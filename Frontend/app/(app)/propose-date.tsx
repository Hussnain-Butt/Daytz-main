// --- COMPLETE FINAL UPDATED CODE: app/(app)/propose-date.tsx ---

import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Keyboard,
  TextInput,
  StatusBar as RNStatusBar,
  ScrollView, // Using ScrollView for Keyboard handling
  KeyboardAvoidingView, // For better keyboard management
} from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { format, parseISO, isValid } from 'date-fns';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { createDate, getUserById, isAuthTokenApiError, getUserTokenBalance } from '../../api/api';
import { CreateDatePayload } from '../../types/Date';
import { User } from '../../types/User';
import { useUserStore } from '../../store/useUserStore';

// --- Assets ---
const BACK_ARROW_ICON = require('../../assets/back_arrow_icon.png');
const BRAND_LOGO = require('../../assets/brand.png');

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
};

const ProposeDateScreen = () => {
  const router = useRouter();
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

  const initialEventDate = dateForProposal ? parseISO(dateForProposal) : new Date();
  const [selectedEventDate, setSelectedEventDate] = useState<Date>(
    isValid(initialEventDate) ? initialEventDate : new Date()
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [venueName, setVenueName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    RNStatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') RNStatusBar.setBackgroundColor(screenColors.background);

    if (!userToId || !dateForProposal) {
      Alert.alert('Error', 'Missing user or date information.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }

    const fetchTargetUser = async () => {
      setIsLoading(true);
      try {
        if (targetUserName || targetUserProfilePic) {
          setTargetUser({
            firstName: targetUserName || 'User',
            profilePictureUrl: targetUserProfilePic,
          });
        } else {
          const response = await getUserById(userToId);
          setTargetUser(response.data || { firstName: 'User Not Found' });
        }
      } catch (fetchError: any) {
        if (isAuthTokenApiError(fetchError)) logout && logout();
        else Alert.alert('Error', 'Could not load user details.');
        setTargetUser({ firstName: 'Error Loading User' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchTargetUser();
  }, [userToId, dateForProposal, targetUserName, targetUserProfilePic]);

  const handleTimeConfirm = (time: Date) => {
    setSelectedTime(time);
    setShowTimePicker(false);
  };

  const handleProposeDate = useCallback(async () => {
    Keyboard.dismiss();
    if (!authUser?.sub || !userToId) {
      Alert.alert('Error', 'Authentication issue.');
      return;
    }
    if (!selectedTime || !venueName.trim()) {
      Alert.alert('Validation Error', 'Please fill out venue and time.');
      return;
    }
    setIsSubmitting(true);
    const romantic = parseInt(romanticRatingStr || '0', 10);
    const sexual = parseInt(sexualRatingStr || '0', 10);
    const friendship = parseInt(friendshipRatingStr || '0', 10);
    const payload: CreateDatePayload & {
      romanticRating: number;
      sexualRating: number;
      friendshipRating: number;
      isUpdate: boolean;
    } = {
      userTo: userToId,
      date: format(selectedEventDate, 'yyyy-MM-dd'),
      time: format(selectedTime, 'HH:mm:ss'),
      locationMetadata: { name: venueName.trim(), address: '' },
      romanticRating: romantic,
      sexualRating: sexual,
      friendshipRating: friendship,
      isUpdate: isUpdate === 'true',
    };
    try {
      await createDate(payload);
      const tokenResponse = await getUserTokenBalance();
      setStoreTokenBalance(tokenResponse.data.tokenBalance);
      Alert.alert('Success!', 'Your date proposal has been sent.', [
        { text: 'OK', onPress: () => router.replace('/(app)/calendar') },
      ]);
    } catch (err: any) {
      const backendMessage =
        err?.context?.backendData?.message ||
        err?.response?.data?.message ||
        err.message ||
        'Failed to send proposal.';
      Alert.alert('Proposal Failed', backendMessage);
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
  ]);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={screenColors.textPrimary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.innerContainer}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Image source={BACK_ARROW_ICON} style={styles.backIcon} />
              </TouchableOpacity>
              <Image source={BRAND_LOGO} style={styles.headerLogo} />
              <View style={{ width: 40 }} />
            </View>

            {/* Main Content */}
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
                  style={styles.textInput}
                  placeholder="e.g., boo Club, East Anaheim Street..."
                  placeholderTextColor={screenColors.inputPlaceholder}
                  value={venueName}
                  onChangeText={setVenueName}
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

            <DateTimePickerModal
              isVisible={showTimePicker}
              mode="time"
              onConfirm={handleTimeConfirm}
              onCancel={() => setShowTimePicker(false)}
            />

            {/* Footer is now part of the main view */}
            <View style={styles.footer}>
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
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: screenColors.background,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  // ✅ --- CHANGE 1: New container to manage layout without scrolling ---
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between', // Pushes footer to the bottom
    paddingHorizontal: 20,
  },
  mainContent: {
    flex: 1, // Takes up available space
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    height: 60,
  },
  backButton: {
    padding: 8,
    marginLeft: -8, // Compensate for padding
  },
  backIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  headerLogo: {
    width: 100,
    height: 40,
    resizeMode: 'contain',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  avatar: {
    borderWidth: 3,
    borderColor: screenColors.avatarBorder,
  },
  avatarPlaceholder: {
    backgroundColor: '#48484A',
    borderWidth: 3,
    borderColor: screenColors.avatarBorder,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: screenColors.textPrimary,
    marginLeft: 16,
  },
  dateDisplay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: screenColors.textPrimary,
    marginVertical: 15,
  },
  inputContainer: {
    marginBottom: 24,
  },
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
  inputText: {
    fontSize: 16,
    color: screenColors.textPrimary,
  },
  // ✅ --- CHANGE 2: videoPlaceholder has been removed from styles ---
  footer: {
    // position: 'absolute' is removed. It's now part of the flex layout.
    width: '100%',
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: screenColors.background,
  },
  submitButton: {
    backgroundColor: screenColors.buttonBackground,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#555',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: screenColors.buttonText,
  },
});

export default ProposeDateScreen;
