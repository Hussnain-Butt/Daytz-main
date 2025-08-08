// --- COMPLETE FINAL UPDATED CODE: app/(app)/stories/index.tsx ---
// This version implements performance optimizations for smoother swiping.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  Platform,
  StatusBar,
  Animated,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

import {
  getStoriesByDate,
  getPlayableVideoUrl,
  getAttractionByUserFromUserToAndDate,
  blockUser as apiBlockUser,
  unblockUser as apiUnblockUser,
} from '../../api/api';

// FIX: Corrected import path for AuthContext
import { useAuth } from '../../contexts/AuthContext';
import { StoryQueryResult } from '../../types/CalendarDay';

import UserProfileCard from '../../components/UserProfileCard';
import { colors } from '../../utils/theme';

// --- Assets ---
const CLOSE_ICON = require('../../assets/close_icon.png');
const ATTRACTION_ICON = require('../../assets/calendarButton.png');
const BLOCK_ICON = require('../../assets/blockIcon.png');
const UNBLOCK_ICON = require('../../assets/unblockIcon.png');
const DEFAULT_PROFILE_PIC = require('../../assets/characterIcon.png');
const calcHappyIcon = require('../../assets/calc-happy.png');
const calcErrorIcon = require('../../assets/calc-error.png');

// --- Layout and Style Constants ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_HORIZONTAL_INSET = 16;
const CARD_BORDER_RADIUS = 16;
const HEADER_CONTENT_ESTIMATED_HEIGHT = Platform.OS === 'ios' ? 70 : 65;
const FOOTER_CONTENT_ESTIMATED_HEIGHT = Platform.OS === 'ios' ? 80 : 75;
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
const HEADER_AREA_HEIGHT =
  HEADER_CONTENT_ESTIMATED_HEIGHT + (Platform.OS === 'ios' ? 40 : STATUS_BAR_HEIGHT + 20);
const FOOTER_AREA_HEIGHT = FOOTER_CONTENT_ESTIMATED_HEIGHT + (Platform.OS === 'ios' ? 20 : 20);
const VIDEO_CARD_TOP_OFFSET = HEADER_AREA_HEIGHT;
const CALCULATED_VIDEO_CARD_HEIGHT = SCREEN_HEIGHT - HEADER_AREA_HEIGHT - FOOTER_AREA_HEIGHT;
const VIDEO_CARD_HEIGHT = Math.max(150, CALCULATED_VIDEO_CARD_HEIGHT);
const VIDEO_CARD_WIDTH = SCREEN_WIDTH - 2 * CARD_HORIZONTAL_INSET;

// --- Interfaces and Types ---
interface StoryWithKey extends StoryQueryResult {
  uniqueStoryId: string;
  hasExistingAttraction: boolean;
  isBlocked: boolean;
}
interface PlayableUrlMap {
  [key: string]: string | null | 'loading' | 'error';
}
interface VideoLoadStateMap {
  [key: string]: 'initial' | 'loading' | 'loaded' | 'error';
}
interface StoryProgressBarsProps {
  storiesCount: number;
  currentStoryIndex: number;
  currentVideoProgress: Animated.SharedValue<number>;
  onBarPress?: (index: number) => void;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  messageText: { color: '#CCC', fontSize: 18, textAlign: 'center' },
  errorTextMsgScreen: { color: colors.PinkPrimary || '#FF6B6B', fontWeight: 'bold' },
  messageButton: {
    backgroundColor: colors.GoldPrimary || '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
  },
  messageButtonText: { color: colors.Black || '#000', fontSize: 16, fontWeight: 'bold' },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCard: {
    position: 'absolute',
    top: VIDEO_CARD_TOP_OFFSET,
    width: VIDEO_CARD_WIDTH,
    height: VIDEO_CARD_HEIGHT,
    backgroundColor: '#0A0A0A',
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
  },
  videoElement: { ...StyleSheet.absoluteFillObject },
  blockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  videoCardActivityIndicator: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCardErrorDisplay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTextVideo: {
    color: '#FFF',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 5,
    borderRadius: 5,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: { paddingHorizontal: 15, paddingTop: 10 },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  userInfoContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    marginRight: 10,
    backgroundColor: colors.GreyMedium,
  },
  userNameText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    flexShrink: 1,
  },
  closeButton: { padding: 8 },
  closeIcon: { width: 28, height: 28 },
  footer: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 25 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  actionButton: { alignItems: 'center', padding: 10 },
  actionIcon: { width: 36, height: 36, marginBottom: 4 },
  actionButtonText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  disabledActionButton: { opacity: 0.4 },
  progressBarsContainer: {
    flexDirection: 'row',
    height: 3,
    marginHorizontal: -2,
    marginBottom: 10,
  },
  progressBarSegment: { flex: 1, marginHorizontal: 2, height: '100%' },
  progressBarBackground: { backgroundColor: 'rgba(255,255,255,0.3)', flex: 1, borderRadius: 1.5 },
  progressBarActiveBackground: { backgroundColor: 'rgba(255,255,255,0.5)' },
  progressBarFilled: { backgroundColor: '#FFFFFF', flex: 1, borderRadius: 1.5 },
  bottomSheetBackground: { backgroundColor: colors.GreyDark || '#1E1E1E' },
  bottomSheetHandle: {
    backgroundColor: colors.LightGrey || '#B0B0B0',
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  bottomSheetContentContainer: { flex: 1 },
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
});

const BubblePopup = ({ visible, type, title, message, buttonText, onClose }) => {
  if (!visible) return null;
  const isSuccess = type === 'success';
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.popupContainer}>
          <Image source={isSuccess ? calcHappyIcon : calcErrorIcon} style={styles.popupImage} />
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

const StoryProgressBars: React.FC<StoryProgressBarsProps> = React.memo(
  ({ storiesCount, currentStoryIndex, currentVideoProgress, onBarPress }) => {
    if (storiesCount <= 1) return null;
    return (
      <View style={styles.progressBarsContainer}>
        {Array.from({ length: storiesCount }).map((_, index) => {
          const animatedStyle = useAnimatedStyle(() => ({
            width: withTiming(
              `${
                index === currentStoryIndex
                  ? Math.max(0, Math.min(1, currentVideoProgress.value)) * 100
                  : 0
              }%`,
              { duration: 50 }
            ),
          }));
          return (
            <TouchableOpacity
              key={`progress-${index}`}
              style={styles.progressBarSegment}
              onPress={() => onBarPress?.(index)}
              activeOpacity={0.8}
              disabled={!onBarPress}>
              <View
                style={[
                  styles.progressBarBackground,
                  index < currentStoryIndex && styles.progressBarFilled,
                  index === currentStoryIndex && styles.progressBarActiveBackground,
                ]}>
                {index === currentStoryIndex && (
                  <Animated.View style={[styles.progressBarFilled, animatedStyle]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }
);

const StoryPage = React.memo(
  ({
    item,
    playableUrl,
    videoLoadState,
    storiesCount,
    currentIndex,
    currentVideoProgress,
    videoRef,
    onPlaybackStatusUpdate,
    onVideoLoadStart,
    onVideoReady,
    onVideoError,
    onVideoTap,
    onPresentModal,
    onGoToStory,
    onNavigateBack,
    onNavigateToAttraction,
    onBlockUser,
    onUnblockUser,
    isAttractionDisabled,
  }) => {
    const panGesture = Gesture.Pan()
      .activeOffsetY([-10, 10])
      .failOffsetY([-15, 15])
      .onEnd((event) => {
        if (
          event.translationY < -SCREEN_HEIGHT * 0.05 &&
          Math.abs(event.translationX) < Math.abs(event.translationY * 0.7)
        ) {
          runOnJS(onPresentModal)();
        }
      });

    const isBlocked = item.isBlocked;

    return (
      <GestureDetector gesture={panGesture}>
        {/* FIX: The GestureDetector must have only one child. We wrap the content in a single View. */}
        <View style={styles.page}>
          <TouchableOpacity
            style={styles.videoCard}
            activeOpacity={1}
            onPress={onVideoTap}
            disabled={isBlocked}>
            {playableUrl && playableUrl !== 'loading' && playableUrl !== 'error' && (
              <Video
                ref={videoRef}
                style={styles.videoElement}
                source={{ uri: playableUrl }}
                resizeMode={ResizeMode.COVER}
                isLooping={storiesCount === 1}
                shouldPlay={false}
                isMuted={isBlocked}
                progressUpdateIntervalMillis={100}
                onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                onLoadStart={onVideoLoadStart}
                onReadyForDisplay={onVideoReady}
                onError={onVideoError}
                bufferForPlaybackMs={Platform.OS === 'android' ? 1500 : 1000}
                bufferForPlaybackAfterRebufferMs={Platform.OS === 'android' ? 3000 : 2000}
              />
            )}
            {isBlocked && (
              <View style={styles.blockedOverlay}>
                <Text style={styles.blockedText}>Blocked</Text>
              </View>
            )}
            {(videoLoadState === 'loading' || videoLoadState === 'initial') &&
              !isBlocked &&
              playableUrl !== 'error' &&
              playableUrl !== null && (
                <View style={styles.videoCardActivityIndicator}>
                  <ActivityIndicator size="large" color={colors.White || '#FFF'} />
                </View>
              )}
            {(playableUrl === 'error' || playableUrl === null || videoLoadState === 'error') &&
              !isBlocked && (
                <View style={styles.videoCardErrorDisplay}>
                  <Text style={styles.errorTextVideo}>Video unavailable</Text>
                </View>
              )}
          </TouchableOpacity>
          <SafeAreaView style={styles.overlayContainer} pointerEvents="box-none">
            <View style={styles.header}>
              <StoryProgressBars
                storiesCount={storiesCount}
                currentStoryIndex={currentIndex}
                currentVideoProgress={currentVideoProgress}
                onBarPress={isBlocked ? undefined : onGoToStory}
              />
              <View style={styles.headerTopRow}>
                <TouchableOpacity
                  style={styles.userInfoContainer}
                  onPress={onPresentModal}
                  activeOpacity={0.7}>
                  <Image
                    source={
                      item.profilePictureUrl ? { uri: item.profilePictureUrl } : DEFAULT_PROFILE_PIC
                    }
                    style={styles.avatar}
                  />
                  <Text style={styles.userNameText} numberOfLines={1}>
                    {item.userName || 'User'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onNavigateBack} style={styles.closeButton}>
                  <Image source={CLOSE_ICON} style={styles.closeIcon} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flex: 1 }} pointerEvents="none" />
            <View style={styles.footer}>
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  onPress={onNavigateToAttraction}
                  style={[
                    styles.actionButton,
                    (isAttractionDisabled || isBlocked) && styles.disabledActionButton,
                  ]}
                  disabled={isAttractionDisabled || isBlocked}>
                  <Image source={ATTRACTION_ICON} style={styles.actionIcon} />
                  <Text style={styles.actionButtonText}>Attraction</Text>
                </TouchableOpacity>
                {isBlocked ? (
                  <TouchableOpacity onPress={onUnblockUser} style={styles.actionButton}>
                    <Image source={UNBLOCK_ICON} style={styles.actionIcon} />
                    <Text style={styles.actionButtonText}>Unblock</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={onBlockUser} style={styles.actionButton}>
                    <Image source={BLOCK_ICON} style={styles.actionIcon} />
                    <Text style={styles.actionButtonText}>Block</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </SafeAreaView>
        </View>
      </GestureDetector>
    );
  }
);

export default function StoriesScreen() {
  const router = useRouter();
  const { auth0User: authUser, isLoading: authContextLoading } = useAuth();
  const params = useLocalSearchParams<{ date?: string; initialUserId?: string }>();
  const { date, initialUserId } = params;
  const storyDate = date;

  const [stories, setStories] = useState<StoryWithKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playableUrls, setPlayableUrls] = useState<PlayableUrlMap>({});
  const [videoLoadStates, setVideoLoadStates] = useState<VideoLoadStateMap>({});
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [popupState, setPopupState] = useState({
    visible: false,
    type: 'error' as 'success' | 'error',
    title: '',
    message: '',
  });

  const showPopup = (title: string, message: string, type: 'success' | 'error' = 'error') => {
    setPopupState({ visible: true, title, message, type });
  };

  const isNavigatingAway = useRef(false);
  const isSwiping = useRef(false);
  const currentVideoProgress = useSharedValue(0);

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [selectedUserIdForModal, setSelectedUserIdForModal] = useState<string | null>(null);
  const snapPoints = useMemo(() => ['60%', '85%'], []);

  const flatListRef = useRef<FlatList<StoryWithKey>>(null);
  const videoRefs = useRef<Record<string, Video | null>>({});

  const updateStoryInState = useCallback((userId: string, updates: Partial<StoryWithKey>) => {
    setStories((prevStories) =>
      prevStories.map((story) => (story.userId === userId ? { ...story, ...updates } : story))
    );
  }, []);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') StatusBar.setBackgroundColor('black');
    return () => {
      StatusBar.setBarStyle('default');
      if (Platform.OS === 'android') StatusBar.setBackgroundColor(colors.Background || '#1F1F1F');
    };
  }, []);

  const handleApiError = useCallback((errorObj: any, context: string) => {
    console.error(`[StoriesScreen] API Error [${context}]:`, errorObj);
    setError(`Failed to ${context}. Please try again.`);
  }, []);

  useEffect(() => {
    if (!date) {
      handleApiError('Date parameter is missing.', 'initialization');
      setLoading(false);
      return;
    }
    if (!authUser && !authContextLoading) {
      handleApiError('Authentication not available.', 'initialization');
      setLoading(false);
      return;
    }
    if (!authUser?.sub) return;

    const fetchStoriesAndAttractions = async () => {
      setLoading(true);
      setError(null);
      setStories([]);

      try {
        const response = await getStoriesByDate(date);
        const storiesFromOtherUsers = (response.data || []) as StoryQueryResult[];

        if (storiesFromOtherUsers.length === 0) {
          setStories([]);
          setLoading(false);
          return;
        }

        const attractionChecks = storiesFromOtherUsers.map((story) =>
          getAttractionByUserFromUserToAndDate(authUser.sub!, story.userId, date)
            .then((res) => !!res.data)
            .catch(() => false)
        );

        const attractionResults = await Promise.all(attractionChecks);

        const storiesWithFullData: StoryWithKey[] = storiesFromOtherUsers.map((story, index) => ({
          ...story,
          userName: story.userName || 'User',
          uniqueStoryId: story.calendarId?.toString() ?? `generated-${date}-${index}`,
          hasExistingAttraction: attractionResults[index],
          isBlocked: story.isBlocked || false,
        }));

        if (initialUserId) {
          const initialIndex = storiesWithFullData.findIndex((s) => s.userId === initialUserId);
          if (initialIndex !== -1) {
            setStories(storiesWithFullData);
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
              setCurrentIndex(initialIndex);
            }, 100);
          } else {
            setStories(storiesWithFullData);
          }
        } else {
          setStories(storiesWithFullData);
        }
      } catch (e: any) {
        handleApiError(e, 'fetching stories');
      } finally {
        setLoading(false);
      }
    };

    fetchStoriesAndAttractions();
  }, [date, authUser, authContextLoading, handleApiError, initialUserId]);

  useEffect(() => {
    const fetchUrlForStory = async (storyIndex: number) => {
      if (storyIndex < 0 || storyIndex >= stories.length) return;
      const story = stories[storyIndex];
      const storyId = story.uniqueStoryId;
      if (playableUrls[storyId]) return;

      setPlayableUrls((prev) => ({ ...prev, [storyId]: 'loading' }));
      const identifier = { calendarId: story.calendarId };
      try {
        const response = await getPlayableVideoUrl(identifier);
        setPlayableUrls((prev) => ({ ...prev, [storyId]: response.data?.playableUrl ?? null }));
      } catch (e) {
        setPlayableUrls((prev) => ({ ...prev, [storyId]: 'error' }));
      }
    };
    if (stories.length > 0) {
      fetchUrlForStory(currentIndex);
      if (currentIndex + 1 < stories.length) fetchUrlForStory(currentIndex + 1);
    }
  }, [currentIndex, stories]);

  const pauseAllVideos = useCallback(async () => {
    await Promise.all(Object.values(videoRefs.current).map((v) => v?.pauseAsync().catch(() => {})));
  }, []);

  const playCurrentVideo = useCallback(async () => {
    if (stories.length === 0 || currentIndex < 0 || currentIndex >= stories.length) return;
    const currentStory = stories[currentIndex];

    if (currentStory.isBlocked) {
      await pauseAllVideos();
      return;
    }
    const storyId = currentStory.uniqueStoryId;
    if (storyId) {
      videoRefs.current[storyId]?.playAsync().catch(() => {});
    }
  }, [stories, currentIndex, pauseAllVideos]);

  useEffect(() => {
    if (
      isScreenFocused &&
      !isSwiping.current &&
      !isNavigatingAway.current &&
      !selectedUserIdForModal
    ) {
      playCurrentVideo();
    } else {
      pauseAllVideos();
    }
  }, [isScreenFocused, currentIndex, selectedUserIdForModal, playCurrentVideo, pauseAllVideos]);

  useFocusEffect(
    useCallback(() => {
      isNavigatingAway.current = false;
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
        isNavigatingAway.current = true;
        pauseAllVideos();
      };
    }, [pauseAllVideos])
  );

  const navigateBack = useCallback(async () => {
    isNavigatingAway.current = true;
    await pauseAllVideos();
    router.canGoBack() ? router.back() : router.replace('/calendar');
  }, [router, pauseAllVideos]);

  const navigateToAttraction = useCallback(
    async (targetUserToId: string) => {
      if (!storyDate) return showPopup('Error', 'Story date not found.', 'error');
      isNavigatingAway.current = true;
      await pauseAllVideos();
      bottomSheetModalRef.current?.dismiss();
      router.push({
        pathname: '/(app)/attraction',
        params: { userToId: targetUserToId, date: storyDate },
      });
    },
    [storyDate, pauseAllVideos, router]
  );

  const blockUser = useCallback(
    (userIdToBlock: string, userName?: string) => {
      Alert.alert('Block User', `Are you sure you want to block ${userName || 'this user'}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          onPress: async () => {
            await pauseAllVideos();
            try {
              await apiBlockUser(userIdToBlock);
              updateStoryInState(userIdToBlock, { isBlocked: true });
              showPopup('User Blocked', `${userName || 'User'} has been blocked.`, 'success');
            } catch (error: any) {
              const errorMessage = error.response?.data?.message || 'Could not block the user.';
              showPopup('Error', errorMessage, 'error');
              playCurrentVideo();
            }
          },
          style: 'destructive',
        },
      ]);
    },
    [pauseAllVideos, playCurrentVideo, updateStoryInState]
  );

  const unblockUser = useCallback(
    async (userIdToUnblock: string, userName?: string) => {
      try {
        await apiUnblockUser(userIdToUnblock);
        updateStoryInState(userIdToUnblock, { isBlocked: false });
        showPopup('User Unblocked', `${userName || 'User'} has been unblocked.`, 'success');
        playCurrentVideo();
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'Could not unblock the user.';
        showPopup('Error', errorMessage, 'error');
      }
    },
    [playCurrentVideo, updateStoryInState]
  );

  const handlePresentModalPress = useCallback((userId: string) => {
    setSelectedUserIdForModal(userId);
    bottomSheetModalRef.current?.present();
  }, []);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) setSelectedUserIdForModal(null);
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.7}
        pressBehavior="close"
      />
    ),
    []
  );

  const goToStory = useCallback(
    (index: number) => {
      if (index < 0 || index >= stories.length || index === currentIndex) return;
      const oldStoryId = stories[currentIndex]?.uniqueStoryId;
      if (oldStoryId && videoRefs.current[oldStoryId]) {
        videoRefs.current[oldStoryId]?.stopAsync().catch(() => {});
      }
      setCurrentIndex(index);
      currentVideoProgress.value = 0;
      flatListRef.current?.scrollToIndex({ index, animated: true });
    },
    [stories, currentIndex]
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newVisibleIndex = viewableItems[0].index;
      if (newVisibleIndex !== currentIndex) {
        const oldStoryId = stories[currentIndex]?.uniqueStoryId;
        if (oldStoryId && videoRefs.current[oldStoryId]) {
          videoRefs.current[oldStoryId]?.stopAsync().catch(() => {});
        }
        runOnJS(setCurrentIndex)(newVisibleIndex);
        currentVideoProgress.value = 0;
      }
    }
  }).current;

  const onVideoTap = useCallback(async (storyId: string) => {
    const video = videoRefs.current[storyId];
    if (!video) return;
    try {
      const status = await video.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await video.pauseAsync();
        } else {
          await video.playAsync();
        }
      }
    } catch (error) {
      console.error('Error toggling video playback:', error);
    }
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: StoryWithKey; index: number }) => {
      const storyId = item.uniqueStoryId;
      return (
        <StoryPage
          item={item}
          playableUrl={playableUrls[storyId]}
          videoLoadState={videoLoadStates[storyId] || 'initial'}
          storiesCount={stories.length}
          currentIndex={currentIndex}
          currentVideoProgress={currentVideoProgress}
          videoRef={(ref) => (videoRefs.current[storyId] = ref)}
          onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
            if (index !== currentIndex || !status.isLoaded || item.isBlocked) return;
            if (status.durationMillis) {
              currentVideoProgress.value = status.positionMillis / status.durationMillis;
            }
            if (status.didJustFinish && !status.isLooping) {
              const nextIndex = index + 1;
              if (nextIndex < stories.length) {
                runOnJS(goToStory)(nextIndex);
              } else {
                runOnJS(navigateBack)();
              }
            }
          }}
          onVideoLoadStart={() =>
            runOnJS(setVideoLoadStates)((prev) => ({ ...prev, [storyId]: 'loading' }))
          }
          onVideoReady={() =>
            runOnJS(setVideoLoadStates)((prev) => ({ ...prev, [storyId]: 'loaded' }))
          }
          onVideoError={(error) => {
            console.error(`[Stories] Video Error for ${storyId}: ${error}`);
            runOnJS(setVideoLoadStates)((prev) => ({ ...prev, [storyId]: 'error' }));
          }}
          onVideoTap={() => onVideoTap(storyId)}
          onPresentModal={() => handlePresentModalPress(item.userId)}
          onGoToStory={goToStory}
          onNavigateBack={navigateBack}
          onNavigateToAttraction={() => navigateToAttraction(item.userId)}
          onBlockUser={() => blockUser(item.userId, item.userName)}
          onUnblockUser={() => unblockUser(item.userId, item.userName)}
          isAttractionDisabled={item.hasExistingAttraction}
        />
      );
    },
    [
      currentIndex,
      stories.length,
      playableUrls,
      videoLoadStates,
      goToStory,
      navigateBack,
      navigateToAttraction,
      blockUser,
      unblockUser,
      handlePresentModalPress,
      onVideoTap,
    ]
  );

  if (loading && stories.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.White || '#FFF'} />
      </SafeAreaView>
    );
  }
  if (error && stories.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={[styles.messageText, styles.errorTextMsgScreen]}>{error}</Text>
        <TouchableOpacity onPress={navigateBack} style={styles.messageButton}>
          <Text style={styles.messageButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  if (!loading && stories.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.messageText}>No nearby stories found for this date.</Text>
        <TouchableOpacity onPress={navigateBack} style={styles.messageButton}>
          <Text style={styles.messageButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={stories}
        renderItem={renderItem}
        keyExtractor={(item) => item.uniqueStoryId}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        getItemLayout={(_data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onScrollBeginDrag={() => (isSwiping.current = true)}
        onMomentumScrollEnd={() => (isSwiping.current = false)}
        bounces={false}
        removeClippedSubviews={true}
      />
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetHandle}>
        <BottomSheetView style={styles.bottomSheetContentContainer}>
          {selectedUserIdForModal && (
            <UserProfileCard
              userId={selectedUserIdForModal}
              authUserSub={authUser?.sub}
              isAuthLoading={authContextLoading}
            />
          )}
        </BottomSheetView>
      </BottomSheetModal>
      <BubblePopup
        visible={popupState.visible}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        buttonText="OK"
        onClose={() => setPopupState((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}
