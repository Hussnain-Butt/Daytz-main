// File: app/(app)/profile.tsx
// ✅ COMPLETE AND FINAL UPDATED CODE

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  Switch,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
  Text,
  Image,
  Modal,
  Alert,
  KeyboardAvoidingView,
  StatusBar as RNStatusBar,
  TouchableOpacity,
} from 'react-native';
import {
  Button,
  Avatar,
  Divider,
  Portal,
  Provider as PaperProvider,
  Modal as PaperModal,
  ActivityIndicator as PaperActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MediaTypeOptions } from 'expo-image-picker';
import { useUserStore } from '../../store/useUserStore';
import {
  updateUser,
  uploadHomepageVideo,
  uploadProfilePicture,
  getUserTokenBalance,
  purchaseTokens,
  getPlayableVideoUrl,
} from '../../api/api';
import { User, UpdateUserApiPayload } from '../../types/User';
import { colors } from '../../utils/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Video, ResizeMode, AVPlaybackStatusError, AVPlaybackStatusSuccess } from 'expo-av';

const calcHappyIcon = require('../../assets/calc-happy.png');
const calcErrorIcon = require('../../assets/calc-error.png');

// --- BUBBLE POPUP COMPONENT (UNCHANGED) ---
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

interface ImagePickerResult {
  uri: string;
  type: string;
  name: string;
  assetId?: string;
  duration?: number;
}
const DEFAULT_AVATAR = 'https://via.placeholder.com/150/CCCCCC/FFFFFF?text=User';
const MAX_BIO_VIDEO_DURATION_SECONDS = 30;
const MAX_BIO_VIDEO_DURATION_MS = MAX_BIO_VIDEO_DURATION_SECONDS * 1000;

const Profile = () => {
  const { auth0User: authUser, logout } = useAuth();
  // ✅ BADLAV: Global state aur setter ko yahan get karein
  const {
    userProfile,
    setUserProfile,
    tokenBalance,
    setTokenBalance,
    hasBeenForcedToProfileEdit,
    setHasBeenForcedToProfileEdit,
  } = useUserStore();
  const router = useRouter();

  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [video, setVideo] = useState<ImagePickerResult | null>(null);
  const [image, setImage] = useState<ImagePickerResult | null>(null);
  const [editedProfile, setEditedProfile] = useState<Partial<User>>({});
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [profileJustCompleted, setProfileJustCompleted] = useState(false);
  const [isBuyTokensModalVisible, setIsBuyTokensModalVisible] = useState(false);
  const [isPurchasingTokens, setIsPurchasingTokens] = useState(false);
  const [playableBioVideoUrl, setPlayableBioVideoUrl] = useState<string | null>(null);
  const [isLoadingPlayableUrl, setIsLoadingPlayableUrl] = useState(false);
  const [videoPlaybackError, setVideoPlaybackError] = useState<string | null>(null);
  const videoPlayerRef = useRef<Video>(null);
  const [popupState, setPopupState] = useState({
    visible: false,
    type: 'error' as 'success' | 'error',
    title: '',
    message: '',
  });
  const [referralSource, setReferralSource] = useState('');

  const showPopup = (title: string, message: string, type: 'success' | 'error' = 'error') => {
    setPopupState({ visible: true, title, message, type });
  };

  const fetchTokenBalance = useCallback(async () => {
    if (!userProfile?.userId) return;
    try {
      const response = await getUserTokenBalance();
      setTokenBalance(response.data.tokenBalance ?? null);
    } catch (error) {
      console.error('[ProfilePage] Error fetching token balance:', error);
      setTokenBalance(null);
    }
  }, [userProfile?.userId, setTokenBalance]);

  useFocusEffect(
    useCallback(() => {
      if (tokenBalance === null) {
        fetchTokenBalance();
      }
    }, [tokenBalance, fetchTokenBalance])
  );

  const fetchPlayableVimeoUrl = useCallback(async () => {
    setVideoPlaybackError(null);
    if (!userProfile?.videoUrl) {
      setPlayableBioVideoUrl(null);
      setIsLoadingPlayableUrl(false);
      return;
    }
    if (userProfile.videoUrl.includes('vimeo.com/')) {
      setIsLoadingPlayableUrl(true);
      try {
        const pathSegments = userProfile.videoUrl.split('/');
        const idSegment = pathSegments.find((segment) => /^\d+$/.test(segment.split('?')[0]));
        const videoId = idSegment ? idSegment.split('?')[0] : '';
        if (videoId) {
          const vimeoApiUriForPayload = `videos/${videoId}`;
          const response = await getPlayableVideoUrl({ vimeoUri: vimeoApiUriForPayload });
          if (response.data?.playableUrl) {
            setPlayableBioVideoUrl(response.data.playableUrl);
          } else {
            setVideoPlaybackError((response.data as any)?.message || 'Playable URL not found.');
          }
        } else {
          setVideoPlaybackError('Invalid video link format.');
        }
      } catch (error: any) {
        setVideoPlaybackError('Could not load video details.');
      } finally {
        setIsLoadingPlayableUrl(false);
      }
    } else {
      setPlayableBioVideoUrl(userProfile.videoUrl);
    }
  }, [userProfile?.videoUrl]);

  useEffect(() => {
    fetchPlayableVimeoUrl();
  }, [fetchPlayableVimeoUrl]);

  // ✅✅✅ --- YAHAN FIX KIYA GAYA HAI --- ✅✅✅
  // useRef ko hata kar global state `hasBeenForcedToProfileEdit` ka istemal kiya gaya hai.
  useEffect(() => {
    if (userProfile) {
      // Step 1: Hamesha form data ko user profile se sync karein.
      setEditedProfile({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        zipcode: userProfile.zipcode || '',
        enableNotifications: userProfile.enableNotifications ?? true,
      });

      const profileIsIncomplete = !userProfile.is_profile_complete;
      setIsInitialSetup(profileIsIncomplete);

      // Step 2: Sirf tabhi edit mode mein force karein jab profile incomplete ho
      // AUR user ko pehle force na kiya gaya ho.
      if (profileIsIncomplete && !hasBeenForcedToProfileEdit) {
        console.log(
          '[Profile] Profile is incomplete and user has not been forced to edit yet. Entering edit mode.'
        );
        setIsEditMode(true);
        // Step 3: Global flag ko set karein taaki yeh dobara na ho.
        setHasBeenForcedToProfileEdit(true);
      }
    }
  }, [userProfile, hasBeenForcedToProfileEdit, setHasBeenForcedToProfileEdit]);
  // ✅✅✅ --------------------------------- ✅✅✅

  const handleSelectedMedia = (asset: ImagePicker.ImagePickerAsset, type: 'Images' | 'Videos') => {
    if (type === 'Videos' && asset.duration && asset.duration > MAX_BIO_VIDEO_DURATION_MS) {
      showPopup(
        'Video Too Long',
        `Try a video under ${MAX_BIO_VIDEO_DURATION_SECONDS} seconds.`,
        'error'
      );
      return;
    }
    const mimeType = asset.mimeType || (type === 'Images' ? 'image/jpeg' : 'video/mp4');
    const fileName =
      asset.fileName || `${type.toLowerCase()}_${Date.now()}.${mimeType?.split('/')[1] || 'tmp'}`;
    const resultAsset: ImagePickerResult = {
      uri: asset.uri,
      type: mimeType,
      name: fileName,
      assetId: asset.assetId,
      duration: asset.duration,
    };
    if (type === 'Images') setImage(resultAsset);
    else setVideo(resultAsset);
  };

  const pickMediaFromLibrary = async (type: 'Images' | 'Videos') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showPopup('Permission Required', 'Please grant permission.', 'error');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'Images' ? MediaTypeOptions.Images : MediaTypeOptions.Videos,
        allowsEditing: type === 'Images',
        aspect: type === 'Images' ? [3, 4] : undefined,
        quality: 0.7,
        videoMaxDuration: type === 'Videos' ? MAX_BIO_VIDEO_DURATION_SECONDS : undefined,
      });
      if (!result.canceled && result.assets?.[0]) handleSelectedMedia(result.assets[0], type);
    } catch (e) {
      showPopup('Media Picker Error', (e as Error).message, 'error');
    }
  };

  const recordMediaWithCamera = async (type: 'Images' | 'Videos') => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showPopup('Permission Required', 'Please grant camera permission.', 'error');
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: type === 'Images' ? MediaTypeOptions.Images : MediaTypeOptions.Videos,
        allowsEditing: type === 'Images',
        aspect: type === 'Images' ? [3, 4] : undefined,
        quality: 0.7,
        videoMaxDuration: type === 'Videos' ? MAX_BIO_VIDEO_DURATION_SECONDS : undefined,
      });
      if (!result.canceled && result.assets?.[0]) handleSelectedMedia(result.assets[0], type);
    } catch (e) {
      showPopup('Camera Error', (e as Error).message, 'error');
    }
  };

  const handleSave = async () => {
    if (!userProfile || !authUser) {
      showPopup('Error', 'Authentication error.', 'error');
      return;
    }
    const wasInitialProfileIncomplete = !userProfile.is_profile_complete;
    if (!editedProfile.firstName?.trim() || !editedProfile.lastName?.trim()) {
      showPopup('Name Required', 'Enter first & last name.', 'error');
      return;
    }
    if (!editedProfile.zipcode?.trim() || !/^\d{5}$/.test(editedProfile.zipcode.trim())) {
      showPopup('Zipcode Invalid', 'Enter a 5-digit zipcode.', 'error');
      return;
    }
    if (
      wasInitialProfileIncomplete &&
      ((!video && !userProfile.videoUrl) || (!image && !userProfile.profilePictureUrl))
    ) {
      showPopup('Media Required', 'Upload bio video and profile picture.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      let currentVideoUrl = userProfile.videoUrl;
      let currentPicUrl = userProfile.profilePictureUrl;
      if (video) {
        const fd = new FormData();
        fd.append('video', { uri: video.uri, type: video.type, name: video.name } as any);
        const res = await uploadHomepageVideo(fd);
        if (res.data?.videoUrl) currentVideoUrl = res.data.videoUrl;
        else if (wasInitialProfileIncomplete) throw new Error('Bio video upload failed.');
      }
      if (image) {
        const fd = new FormData();
        fd.append('image', { uri: image.uri, type: image.type, name: image.name } as any);
        const res = await uploadProfilePicture(fd);
        if (res.data?.profilePictureUrl) currentPicUrl = res.data.profilePictureUrl;
        else if (wasInitialProfileIncomplete) throw new Error('Profile picture upload failed.');
      }
      const updatePayload: UpdateUserApiPayload = {
        firstName: editedProfile.firstName?.trim(),
        lastName: editedProfile.lastName?.trim(),
        zipcode: editedProfile.zipcode?.trim(),
        enableNotifications: editedProfile.enableNotifications,
        videoUrl: currentVideoUrl,
        profilePictureUrl: currentPicUrl,
        is_profile_complete: !!(
          editedProfile.firstName?.trim() &&
          editedProfile.lastName?.trim() &&
          editedProfile.zipcode?.trim() &&
          currentVideoUrl &&
          currentPicUrl
        ),
      };
      if (wasInitialProfileIncomplete && referralSource.trim()) {
        updatePayload.referralSource = referralSource.trim();
      }
      const res = await updateUser(updatePayload);
      if (res.data) {
        const oldTokenBalance = tokenBalance ?? userProfile.tokens ?? 0;
        const newTokenBalance = res.data.tokens;
        const gotBonus = newTokenBalance > oldTokenBalance;
        setUserProfile(res.data);
        let successMessage =
          wasInitialProfileIncomplete && res.data.is_profile_complete
            ? 'Profile Setup Complete!'
            : 'Profile updated successfully!';
        if (gotBonus) {
          successMessage += ` You received 10 bonus coins!`;
        }
        showPopup('Success!', successMessage, 'success');
        if (wasInitialProfileIncomplete && res.data.is_profile_complete) {
          setProfileJustCompleted(true);
        }
        setIsEditMode(false);
        setImage(null);
        setVideo(null);
      } else throw new Error('Update API returned no data.');
    } catch (e: any) {
      showPopup('Save Failed', e.message || 'An unknown error occurred.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBuyTokens = async () => {
    if (!authUser) {
      showPopup('Error', 'Authentication issue.', 'error');
      return;
    }
    setIsPurchasingTokens(true);
    try {
      const payload = { tokenAmount: 100, description: 'User purchased 100 tokens (profile)' };
      const res = await purchaseTokens(payload);
      setTokenBalance(res.data.newTokenBalance);
      showPopup(
        'Success',
        `${payload.tokenAmount} tokens purchased! New balance: ${res.data.newTokenBalance}`,
        'success'
      );
      setIsBuyTokensModalVisible(false);
    } catch (e: any) {
      showPopup('Purchase Failed', e.message || 'Could not purchase.', 'error');
    } finally {
      setIsPurchasingTokens(false);
    }
  };

  const renderBuyTokensModal = () => (
    <Portal>
      <PaperModal
        visible={isBuyTokensModalVisible}
        onDismiss={() => setIsBuyTokensModalVisible(false)}
        contentContainerStyle={styles.modalContainerStyle}>
        <Text style={styles.modalTitle}>Buy Tokens</Text>
        <Text style={styles.modalText}>Need more tokens? Purchase 100 tokens now!</Text>
        <View style={styles.modalButtonContainer}>
          <Button
            mode="outlined"
            onPress={() => setIsBuyTokensModalVisible(false)}
            style={styles.modalButton}
            disabled={isPurchasingTokens}
            textColor={colors.White || '#FFFFFF'}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleBuyTokens}
            style={[styles.modalButton, styles.modalConfirmButton]}
            loading={isPurchasingTokens}
            disabled={isPurchasingTokens}>
            Buy 100 Tokens
          </Button>
        </View>
      </PaperModal>
    </Portal>
  );

  const renderEditableUserInfo = () => (
    <KeyboardAvoidingView
      style={styles.flexContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.userInfoContainer}>
          {isInitialSetup && !profileJustCompleted && (
            <Text style={styles.setupTitle}>Complete Your Profile</Text>
          )}
          <Avatar.Image
            size={80}
            source={{ uri: image?.uri || userProfile?.profilePictureUrl || DEFAULT_AVATAR }}
            style={styles.avatar}
          />
          <Button
            icon="camera"
            mode="outlined"
            style={styles.mediaButton}
            onPress={() => pickMediaFromLibrary('Images')}
            disabled={isSaving}>
            {image ? 'Change Pic' : userProfile?.profilePictureUrl ? 'Change Pic' : 'Upload'}
          </Button>
          {(isInitialSetup || !userProfile?.is_profile_complete) &&
            !userProfile?.profilePictureUrl &&
            !image && <Text style={styles.requiredText}>* Pic required</Text>}
          <Divider style={styles.divider} />
          <Text style={styles.fieldLabel}>Bio Video (Max {MAX_BIO_VIDEO_DURATION_SECONDS}s)</Text>
          {video ? (
            <Text
              style={styles.videoSelectedText}
              numberOfLines={1}
              ellipsizeMode="middle">{`Selected: ${video.name}`}</Text>
          ) : userProfile?.videoUrl ? (
            <Text style={styles.videoSelectedText}>Current video uploaded</Text>
          ) : (
            <Text style={styles.videoSelectedText}>(No bio video)</Text>
          )}
          <View style={styles.mediaActionsRow}>
            <Button
              icon="record-circle-outline"
              mode="outlined"
              style={[styles.mediaButton, styles.flexButton]}
              onPress={() => recordMediaWithCamera('Videos')}
              disabled={isSaving}>
              Record
            </Button>
            <Button
              icon="video-image"
              mode="outlined"
              style={[styles.mediaButton, styles.flexButton]}
              onPress={() => pickMediaFromLibrary('Videos')}
              disabled={isSaving}>
              {video ? 'Change Lib' : userProfile?.videoUrl ? 'Change Lib' : 'Upload'}
            </Button>
          </View>
          {(isInitialSetup || !userProfile?.is_profile_complete) &&
            !userProfile?.videoUrl &&
            !video && <Text style={styles.requiredText}>* Bio video required</Text>}
          <Divider style={styles.divider} />
          <Text style={styles.fieldLabel}>First Name</Text>
          <TextInput
            style={styles.textInput}
            value={editedProfile.firstName || ''}
            onChangeText={(t) => setEditedProfile((p) => ({ ...p, firstName: t }))}
            placeholder="First Name"
            editable={!isSaving}
            autoCapitalize="words"
            textContentType="givenName"
            placeholderTextColor={colors.LightGrey}
          />
          {!editedProfile.firstName?.trim() && <Text style={styles.requiredText}>* Required</Text>}
          <Text style={styles.fieldLabel}>Last Name</Text>
          <TextInput
            style={styles.textInput}
            value={editedProfile.lastName || ''}
            onChangeText={(t) => setEditedProfile((p) => ({ ...p, lastName: t }))}
            placeholder="Last Name"
            editable={!isSaving}
            autoCapitalize="words"
            textContentType="familyName"
            placeholderTextColor={colors.LightGrey}
          />
          {!editedProfile.lastName?.trim() && <Text style={styles.requiredText}>* Required</Text>}
          <Text style={styles.fieldLabel}>Zipcode</Text>
          <TextInput
            style={styles.textInput}
            value={editedProfile.zipcode || ''}
            onChangeText={(t) =>
              setEditedProfile((p) => ({ ...p, zipcode: t.replace(/[^0-9]/g, '') }))
            }
            placeholder="5-Digit Zipcode"
            keyboardType="numeric"
            maxLength={5}
            editable={!isSaving}
            textContentType="postalCode"
            placeholderTextColor={colors.LightGrey}
          />
          {!editedProfile.zipcode?.trim() && <Text style={styles.requiredText}>* Required</Text>}
          {isInitialSetup && (
            <>
              <Divider style={styles.divider} />
              <Text style={styles.fieldLabel}>How did you hear about us? (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={referralSource}
                onChangeText={setReferralSource}
                placeholder="e.g., Instagram, Friend, App Store..."
                editable={!isSaving}
                placeholderTextColor={colors.LightGrey}
              />
              <Text style={styles.helperText}>Answer for 10 bonus coins!</Text>
            </>
          )}
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Notifications:</Text>
            <Switch
              value={editedProfile.enableNotifications ?? true}
              onValueChange={(v) => setEditedProfile((p) => ({ ...p, enableNotifications: v }))}
              disabled={isSaving}
              trackColor={{
                false: colors.Grey || '#424242',
                true: colors.GoldPrimary || '#FFD700',
              }}
              thumbColor={colors.White || '#FFFFFF'}
              style={Platform.OS === 'ios' ? { backgroundColor: 'transparent' } : {}}
            />
          </View>
          <Button
            mode="contained"
            style={styles.saveButton}
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}>
            {isSaving
              ? 'Saving...'
              : isInitialSetup && !profileJustCompleted
                ? 'Save & View Profile'
                : 'Save Changes'}
          </Button>
          <Button
            mode="text"
            style={styles.cancelButton}
            onPress={() => {
              setIsEditMode(false);
              setProfileJustCompleted(false);
              setImage(null);
              setVideo(null);
              if (userProfile)
                setEditedProfile({
                  firstName: userProfile.firstName || '',
                  lastName: userProfile.lastName || '',
                  zipcode: userProfile.zipcode || '',
                  enableNotifications: userProfile.enableNotifications ?? true,
                });
            }}
            disabled={isSaving}
            textColor={colors.LightGrey || '#A0A0A0'}>
            Cancel
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderUserInfo = () => {
    if (!userProfile)
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading Profile...</Text>
        </View>
      );
    const showMagicBuyButton = tokenBalance !== null && tokenBalance < 10;
    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.userInfoContainer}>
          {profileJustCompleted && <Text style={styles.reviewText}>Review Your Profile</Text>}
          <Avatar.Image
            size={80}
            source={{ uri: userProfile.profilePictureUrl || DEFAULT_AVATAR }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>
            {`${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() ||
              'Name Not Set'}
          </Text>
          <Divider style={styles.divider} />
          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Token Balance:</Text>
            {tokenBalance === null ? (
              <PaperActivityIndicator
                animating={true}
                color={colors.GoldPrimary || '#FFD700'}
                size="small"
              />
            ) : (
              <Text style={styles.userInfoValue}>{tokenBalance}</Text>
            )}
          </View>
          <Button
            mode={showMagicBuyButton ? 'contained' : 'outlined'}
            onPress={() => setIsBuyTokensModalVisible(true)}
            style={[styles.buyTokensButton, showMagicBuyButton && styles.magicButton]}
            icon={showMagicBuyButton ? 'star-circle-outline' : 'cart-plus'}
            disabled={isPurchasingTokens}
            labelStyle={
              showMagicBuyButton
                ? { color: colors.Black || '#000000' }
                : { color: colors.GoldPrimary || '#FFD700' }
            }
            buttonColor={showMagicBuyButton ? colors.GoldPrimary || '#FFD700' : undefined}
            textColor={
              showMagicBuyButton ? colors.Black || '#000000' : colors.GoldPrimary || '#FFD700'
            }>
            {showMagicBuyButton ? 'Low Tokens! Get More' : 'Buy Tokens'}
          </Button>
          <Divider style={styles.divider} />
          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Zipcode:</Text>
            <Text style={styles.userInfoValue}>{userProfile.zipcode || 'Not set'}</Text>
          </View>
          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Notifications:</Text>
            <Text style={styles.userInfoValue}>
              {userProfile.enableNotifications ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.videoSectionContainer}>
            <Text style={styles.videoSectionTitle}>Bio Video</Text>
            <View style={styles.videoPlayerWrapper}>
              {isLoadingPlayableUrl ? (
                <View style={styles.videoPlaceholder}>
                  <PaperActivityIndicator size="large" color={colors.GoldPrimary || '#FFD700'} />
                  <Text style={styles.videoStatusText}>Loading Video...</Text>
                </View>
              ) : playableBioVideoUrl && !videoPlaybackError ? (
                <Video
                  ref={videoPlayerRef}
                  source={{ uri: playableBioVideoUrl }}
                  style={styles.bioVideoPlayer}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping={false}
                  onError={(errorMsg: string) => setVideoPlaybackError(`Could not play video.`)}
                  onLoad={(status) => {
                    if ((status as AVPlaybackStatusSuccess).isLoaded) setVideoPlaybackError(null);
                  }}
                  onPlaybackStatusUpdate={(status) => {
                    if ((status as AVPlaybackStatusError).error)
                      setVideoPlaybackError(`Playback issue.`);
                  }}
                />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <IconButton
                    icon={videoPlaybackError ? 'alert-circle-outline' : 'video-off-outline'}
                    size={48}
                    iconColor={colors.LightGrey || '#A0A0A0'}
                  />
                  <Text style={styles.videoStatusText}>
                    {videoPlaybackError ||
                      (userProfile.videoUrl
                        ? 'Video preview unavailable.'
                        : 'No bio video uploaded.')}
                  </Text>
                  {videoPlaybackError && (
                    <Button
                      mode="text"
                      onPress={fetchPlayableVimeoUrl}
                      textColor={colors.GoldPrimary || '#FFD700'}>
                      Try Again
                    </Button>
                  )}
                </View>
              )}
            </View>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Profile Complete:</Text>
            <Text style={styles.userInfoValue}>
              {userProfile.is_profile_complete ? 'Yes' : 'No'}
            </Text>
          </View>
          {profileJustCompleted && userProfile.is_profile_complete && (
            <Button
              mode="contained"
              style={styles.finishProfileButton}
              onPress={() => {
                setProfileJustCompleted(false);
                router.replace('/(app)/calendar');
              }}>
              Finish
            </Button>
          )}
          <Button mode="contained" onPress={() => setIsEditMode(true)} style={styles.editButton}>
            Edit Profile
          </Button>
          {userProfile.is_profile_complete && (
            <Button
              style={styles.calendarButton}
              mode="contained"
              onPress={() => router.push('/(app)/calendar')}>
              Go to Calendar
            </Button>
          )}
          <Button
            mode="outlined"
            onPress={() =>
              Alert.alert('Confirm Logout', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', onPress: logout, style: 'destructive' },
              ])
            }
            style={styles.logoutButton}
            textColor={colors.GoldPrimary || '#FFD700'}>
            Logout
          </Button>
        </View>
      </ScrollView>
    );
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        {isEditMode ? renderEditableUserInfo() : renderUserInfo()}
        {renderBuyTokensModal()}
        <BubblePopup
          visible={popupState.visible}
          type={popupState.type}
          title={popupState.title}
          message={popupState.message}
          buttonText="OK"
          onClose={() => setPopupState((prev) => ({ ...prev, visible: false }))}
        />
      </SafeAreaView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  flexContainer: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.Background || '#121212',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.Background || '#121212',
  },
  loadingText: { marginTop: 10, color: colors.White || '#FFFFFF', fontSize: 16 },
  scrollView: { flex: 1, width: '100%' },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingVertical: 20, paddingHorizontal: 10 },
  userInfoContainer: {
    width: '100%',
    maxWidth: 500,
    padding: 20,
    borderRadius: 12,
    backgroundColor: colors.GreyDark || '#1E1E1E',
    gap: 18,
  },
  avatar: { alignSelf: 'center', marginBottom: 8, backgroundColor: colors.GreyMedium || '#333333' },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.White || '#FFFFFF',
    alignSelf: 'center',
    marginTop: 5,
    marginBottom: 12,
  },
  divider: {
    marginVertical: 15,
    height: 1,
    backgroundColor: colors.Grey || '#424242',
    width: '100%',
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 5,
    minHeight: 40,
  },
  userInfoLabel: {
    fontWeight: '600',
    color: colors.LightGrey || '#B0B0B0',
    fontSize: 16,
    marginRight: 10,
  },
  userInfoValue: { color: colors.White || '#FFFFFF', fontSize: 16, textAlign: 'right', flex: 1 },
  videoSectionContainer: { width: '100%', alignItems: 'flex-start', marginBottom: 10 },
  videoSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.White || '#FFFFFF',
    marginBottom: 12,
    paddingHorizontal: 5,
  },
  videoPlayerWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.Black || '#000000',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bioVideoPlayer: { width: '100%', height: '100%' },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  videoStatusText: {
    color: colors.LightGrey || '#A0A0A0',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  editButton: {
    marginTop: 25,
    backgroundColor: colors.GoldPrimary || '#FFD700',
    paddingVertical: 8,
    width: '90%',
    maxWidth: 350,
    alignSelf: 'center',
    borderRadius: 25,
  },
  textInput: {
    backgroundColor: colors.GreyMedium || '#333333',
    width: '100%',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    color: colors.White || '#FFFFFF',
    marginBottom: 5,
    borderWidth: 1,
    borderColor: colors.Grey || '#424242',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    paddingHorizontal: 5,
  },
  switchLabel: { fontSize: 16, color: colors.White || '#FFFFFF', marginRight: 10 },
  fieldLabel: {
    fontSize: 16,
    color: colors.LightGrey || '#B0B0B0',
    marginBottom: 6,
    alignSelf: 'flex-start',
    marginLeft: 5,
    fontWeight: '500',
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.White || '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  reviewText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.GoldPrimary || '#FFD700',
    textAlign: 'center',
    marginBottom: 15,
  },
  logoutButton: {
    marginTop: 20,
    borderColor: colors.GoldPrimary || '#FFD700',
    borderWidth: 1.5,
    paddingVertical: 8,
    width: '90%',
    maxWidth: 350,
    alignSelf: 'center',
    borderRadius: 25,
  },
  calendarButton: {
    marginTop: 15,
    backgroundColor: colors.GoldSecondary || '#FFA000',
    paddingVertical: 8,
    width: '90%',
    maxWidth: 350,
    alignSelf: 'center',
    borderRadius: 25,
  },
  mediaButton: {
    marginTop: 8,
    marginBottom: 8,
    borderColor: colors.GoldPrimary || '#FFD700',
    borderWidth: 1,
    width: '90%',
    maxWidth: 350,
    alignSelf: 'center',
    borderRadius: 20,
    paddingVertical: 6,
  },
  mediaActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
    gap: 10,
  },
  flexButton: { flex: 1, width: undefined, marginHorizontal: 0, maxWidth: undefined },
  saveButton: {
    marginTop: 30,
    backgroundColor: colors.GoldPrimary || '#FFD700',
    paddingVertical: 10,
    width: '90%',
    maxWidth: 350,
    alignSelf: 'center',
    borderRadius: 25,
  },
  cancelButton: { marginTop: 12, width: '80%', maxWidth: 300, alignSelf: 'center' },
  requiredText: {
    color: colors.PinkPrimary || '#FF6B6B',
    fontSize: 13,
    alignSelf: 'flex-start',
    marginLeft: 5,
    marginTop: 3,
    marginBottom: 8,
  },
  videoSelectedText: {
    color: colors.LightGrey || '#A0A0A0',
    fontSize: 14,
    fontStyle: 'italic',
    alignSelf: 'center',
    marginBottom: 8,
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  finishProfileButton: {
    marginTop: 25,
    backgroundColor: colors.Green || '#4CAF50',
    paddingVertical: 10,
    width: '90%',
    maxWidth: 350,
    alignSelf: 'center',
    borderRadius: 25,
  },
  buyTokensButton: {
    marginTop: 15,
    marginBottom: 10,
    paddingVertical: 6,
    width: '90%',
    maxWidth: 350,
    borderColor: colors.GoldPrimary || '#FFD700',
    borderRadius: 25,
    borderWidth: 1.5,
  },
  magicButton: {
    backgroundColor: colors.GoldPrimary || '#FFD700',
    borderColor: colors.GoldPrimary || '#FFD700',
  },
  modalContainerStyle: {
    backgroundColor: colors.GreyDark || '#1E1E1E',
    padding: 30,
    marginHorizontal: Dimensions.get('window').width * 0.05,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.White || '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 17,
    color: colors.LightGrey || '#B0B0B0',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
  },
  modalButton: { flex: 1, marginHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  modalConfirmButton: { backgroundColor: colors.GoldPrimary || '#FFD700' },
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
  helperText: {
    color: colors.GoldPrimary || '#FFD700',
    fontSize: 13,
    alignSelf: 'flex-start',
    marginLeft: 5,
    marginTop: -2,
    marginBottom: 8,
    fontStyle: 'italic',
  },
});

export default Profile;
