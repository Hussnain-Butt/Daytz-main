import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import UserProfileCard from '../UserProfileCard';
import { User } from '../../types/User';

// Mocks bilkul pehle jaisay rahenge

const mockGetUserById = jest.fn();
const mockGetPlayableVideoUrl = jest.fn();
jest.mock('../../api/api', () => ({
  getUserById: (userId: string) => mockGetUserById(userId),
  getPlayableVideoUrl: (payload: any) => mockGetPlayableVideoUrl(payload),
}));

const mockUseAuth = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('expo-av', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockVideo = (props: any) => <View testID="mock-video-player" {...props} />;
  return {
    Video: MockVideo,
    ResizeMode: {
      CONTAIN: 'contain',
    },
  };
});

describe('<UserProfileCard />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { sub: 'auth0|test-user' },
      isLoading: false,
    });
  });

  // Pehle 2 tests bilkul same rahenge...

  it('should show a loading indicator while fetching the profile', () => {
    /* ... pehle jaisa ... */
  });

  it('should display user profile information on successful fetch', async () => {
    /* ... pehle jaisa ... */
  });

  // --- FIX #1 YAHAN HAI ---
  it('should show an error message and a retry button on API failure', async () => {
    mockGetUserById.mockRejectedValue(new Error('Network Error'));
    render(<UserProfileCard userId="123" />);
    // Hum ab 'Network Error' text dhoondenge
    const errorText = await screen.findByText('Network Error');
    expect(errorText).toBeVisible();
    expect(screen.getByText('Try Again')).toBeVisible();
  });

  // Retry test bilkul same rahega...
  it('should re-fetch the profile when "Try Again" is pressed', async () => {
    /* ... pehle jaisa ... */
  });

  // --- FIX #2 YAHAN HAI ---
  it('should fetch and display the video player on success', async () => {
    const mockProfileWithVideo: User = {
      userId: '123',
      firstName: 'Video',
      lastName: 'User',
      email: 'video@example.com',
      videoUrl: 'vimeo.com/12345678',
    };
    const playableUrl = 'https://player.vimeo.com/video/12345678/play';

    mockGetUserById.mockResolvedValue({ data: mockProfileWithVideo, status: 200 });
    mockGetPlayableVideoUrl.mockResolvedValue({ data: { playableUrl }, status: 200 });

    render(<UserProfileCard userId="123" />);

    //waitFor ke andar hi saare async elements check karein
    await waitFor(() => {
      // Pehle check karein ke profile load ho gaya hai
      expect(screen.getByText('Video User')).toBeVisible();

      // Phir check karein ke video player bhi load ho gaya hai
      const videoPlayer = screen.getByTestId('mock-video-player');
      expect(videoPlayer).toBeVisible();
      expect(videoPlayer.props.source).toEqual({ uri: playableUrl });
    });

    // API call check karna waitFor ke bahar theek hai
    expect(mockGetPlayableVideoUrl).toHaveBeenCalledWith({ vimeoUri: 'videos/12345678' });
  });
});
