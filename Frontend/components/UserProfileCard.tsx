// --- COMPLETE FINAL UPDATED CODE: components/UserProfileCard.tsx ---

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  Divider,
  ActivityIndicator as PaperActivityIndicator,
  IconButton,
  Button,
} from 'react-native-paper';
// REMOVE useAuth import
import { getUserById, getPlayableVideoUrl } from '../api/api';
import { User } from '../types/User';
import { colors } from '../utils/theme';
import { Video, ResizeMode, AVPlaybackStatusError, AVPlaybackStatusSuccess } from 'expo-av';
import axios from 'axios';

const DEFAULT_AVATAR_ASSET = require('../assets/characterIcon.png');
const screenHeight = Dimensions.get('window').height;

// Only accept props from parent, not useAuth() internally
interface UserProfileCardProps {
  userId: string | null;
  authUserSub: string | undefined | null;
  isAuthLoading: boolean;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  userId,
  authUserSub,
  isAuthLoading,
}) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchAttempt, setFetchAttempt] = useState(0);

  // State for bio video
  const [playableBioVideoUrl, setPlayableBioVideoUrl] = useState<string | null>(null);
  const [isLoadingPlayableUrl, setIsLoadingPlayableUrl] = useState(false);
  const [videoPlaybackError, setVideoPlaybackError] = useState<string | null>(null);
  const videoPlayerRef = useRef<Video>(null);

  const fetchProfileDataAsync = useCallback(async () => {
    if (!userId || !authUserSub) {
      setProfile(null);
      setError(null);
      setIsFetchingProfile(false);
      return;
    }

    setIsFetchingProfile(true);
    setError(null);

    try {
      const response = await getUserById(userId);
      if (response.data && response.data.userId) {
        setProfile(response.data);
      } else {
        const message =
          response.status === 404 ? `User profile not found.` : `Profile data is incomplete.`;
        setError(message);
        setProfile(null);
      }
    } catch (err: any) {
      let errorMessage = 'Could not load profile. An unexpected error occurred.';
      if (err.isAuthTokenError || err.message?.toLowerCase().includes('authentication')) {
        errorMessage = 'Authentication failed. Please try logging in again.';
      } else if (err.response?.data?.message) {
        errorMessage = `API Error: ${err.response.data.message}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setProfile(null);
    } finally {
      setIsFetchingProfile(false);
    }
  }, [userId, authUserSub]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (userId) {
      fetchProfileDataAsync();
    } else {
      setProfile(null);
      setError(null);
      setIsFetchingProfile(false);
    }
  }, [userId, isAuthLoading, fetchAttempt, fetchProfileDataAsync]);

  const fetchPlayableVideoUrlLogic = useCallback(async () => {
    setVideoPlaybackError(null);
    if (profile?.videoUrl) {
      if (profile.videoUrl.includes('vimeo.com/')) {
        setIsLoadingPlayableUrl(true);
        setPlayableBioVideoUrl(null);
        try {
          const pathSegments = profile.videoUrl.split('/');
          const idSegment = pathSegments.find((segment) => /^\d+$/.test(segment.split('?')[0]));
          const videoId = idSegment ? idSegment.split('?')[0] : '';

          if (videoId) {
            const vimeoApiUriForPayload = `videos/${videoId}`;
            const response = await getPlayableVideoUrl({ vimeoUri: vimeoApiUriForPayload });
            if (response.data?.playableUrl) {
              setPlayableBioVideoUrl(response.data.playableUrl);
            } else {
              const message = (response.data as any)?.message || 'Playable URL not found.';
              if (message.toLowerCase().includes('processing')) {
                setVideoPlaybackError('Video is processing. Please check back shortly.');
              } else {
                setVideoPlaybackError(message);
              }
              setPlayableBioVideoUrl(null);
            }
          } else {
            setVideoPlaybackError('Invalid video link format.');
            setPlayableBioVideoUrl(null);
          }
        } catch (error: any) {
          let displayError = 'Could not load video details.';
          if (axios.isAxiosError(error) && error.response) {
            const errorData = error.response.data as any;
            displayError = errorData?.message || `Server error: ${error.response.status}`;
          }
          setVideoPlaybackError(displayError);
          setPlayableBioVideoUrl(null);
        } finally {
          setIsLoadingPlayableUrl(false);
        }
      } else {
        setPlayableBioVideoUrl(profile.videoUrl);
        setIsLoadingPlayableUrl(false);
      }
    } else {
      setPlayableBioVideoUrl(null);
      setIsLoadingPlayableUrl(false);
    }
  }, [profile?.videoUrl]);

  useEffect(() => {
    if (profile) {
      fetchPlayableVideoUrlLogic();
    } else {
      setPlayableBioVideoUrl(null);
      setIsLoadingPlayableUrl(false);
      setVideoPlaybackError(null);
    }
  }, [profile, fetchPlayableVideoUrlLogic]);

  const handleRetry = useCallback(() => {
    setError(null);
    setFetchAttempt((prev) => prev + 1);
  }, []);

  if (isAuthLoading || isFetchingProfile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.GoldPrimary || '#FFD700'} />
        <Text style={styles.infoText}>Loading Profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        {userId && (
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.infoText}>
          {userId ? 'Profile data could not be loaded.' : 'No user selected.'}
        </Text>
        {userId && (
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry Load</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <View style={styles.userInfoContainer}>
        <Image
          source={
            profile.profilePictureUrl ? { uri: profile.profilePictureUrl } : DEFAULT_AVATAR_ASSET
          }
          style={styles.avatar}
          onError={(e) => console.warn(`Avatar load error: ${e.nativeEvent.error}`)}
        />
        <Text style={styles.userName}>
          {`${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'User Name'}
        </Text>
        <Text style={styles.userEmail}>{profile.email || 'No email available'}</Text>

        {profile.videoUrl && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.videoSectionContainer}>
              <Text style={styles.sectionTitle}>Bio Video</Text>
              <View style={styles.videoPlayerWrapper}>
                {isLoadingPlayableUrl && (
                  <View style={styles.videoPlaceholder}>
                    <PaperActivityIndicator size="large" color={colors.GoldPrimary || '#FFD700'} />
                    <Text style={styles.videoStatusText}>Loading Video...</Text>
                  </View>
                )}
                {!isLoadingPlayableUrl && playableBioVideoUrl && !videoPlaybackError && (
                  <Video
                    ref={videoPlayerRef}
                    source={{ uri: playableBioVideoUrl }}
                    style={styles.bioVideoPlayer}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping={false}
                    onError={(errorMsg: string) => {
                      setVideoPlaybackError(`Could not play video.`);
                      setPlayableBioVideoUrl(null);
                    }}
                    onLoad={(status) => {
                      if ((status as AVPlaybackStatusSuccess).isLoaded) {
                        setVideoPlaybackError(null);
                      }
                    }}
                    onPlaybackStatusUpdate={(status) => {
                      if ((status as AVPlaybackStatusError).error && !videoPlaybackError) {
                        setVideoPlaybackError(`Playback issue.`);
                      }
                    }}
                  />
                )}
                {!isLoadingPlayableUrl && (!playableBioVideoUrl || videoPlaybackError) && (
                  <View style={styles.videoPlaceholder}>
                    <IconButton
                      icon={videoPlaybackError ? 'alert-circle-outline' : 'video-off-outline'}
                      size={48}
                      iconColor={colors.LightGrey || '#A0A0A0'}
                    />
                    <Text style={styles.videoStatusText}>
                      {videoPlaybackError ? videoPlaybackError : 'No bio video uploaded.'}
                    </Text>
                    {videoPlaybackError && (
                      <Button
                        mode="text"
                        onPress={fetchPlayableVideoUrlLogic}
                        textColor={colors.GoldPrimary || '#FFD700'}
                        style={{ marginTop: 10 }}
                        labelStyle={{ fontSize: 14 }}
                        compact>
                        Try Again
                      </Button>
                    )}
                  </View>
                )}
              </View>
            </View>
          </>
        )}
        <Text style={styles.closeHint}>(Swipe down or tap backdrop to close)</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1, width: '100%' },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  container: {
    flex: 1,
    backgroundColor: colors.GreyDarker || '#181818',
    minHeight: screenHeight * 0.4,
  },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  userInfoContainer: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.GoldPrimary || '#FFD700',
    backgroundColor: colors.GreyMedium || '#333',
  },
  userName: { fontSize: 22, fontWeight: '600', color: colors.White || '#FFF', textAlign: 'center' },
  userEmail: {
    fontSize: 14,
    color: colors.LightGrey || '#AAA',
    marginBottom: 15,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 15,
    height: 1,
    backgroundColor: colors.Grey || '#424242',
    width: '95%',
    alignSelf: 'center',
  },
  infoSection: { width: '100%', marginBottom: 10, paddingHorizontal: 5 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.GoldPrimary || '#FFD700',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 30,
  },
  userInfoLabel: { fontWeight: '500', color: colors.LightGrey || '#AAA', fontSize: 15 },
  userInfoValue: { color: colors.White || '#FFF', fontSize: 15, textAlign: 'right', flexShrink: 1 },
  complete: { color: colors.Green || 'green' },
  incomplete: { color: colors.PinkPrimary || 'red' },
  closeHint: { marginTop: 25, color: colors.Grey || '#888', fontSize: 13, textAlign: 'center' },
  infoText: { marginTop: 15, color: colors.LightGrey || '#AAA', fontSize: 15, textAlign: 'center' },
  errorText: {
    fontSize: 16,
    color: colors.PinkPrimary || '#FF6B6B',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 15,
  },
  retryButton: {
    marginTop: 10,
    backgroundColor: colors.GoldPrimary || '#FFD700',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryButtonText: { color: colors.Black || '#000', fontWeight: 'bold', fontSize: 14 },
  videoSectionContainer: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 10,
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
    marginTop: 5,
  },
  bioVideoPlayer: { width: '100%', height: '100%' },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  videoStatusText: {
    color: colors.LightGrey || '#A0A0A0',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default UserProfileCard;
