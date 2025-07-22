import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, View } from 'react-native';
import AttractionScreen from '../attraction';
import { useUserStore } from '../../../store/useUserStore';

//---- MOCKING SETUP START ----//

// 1. expo-router ko mock karein
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush, back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({
    userToId: 'user-to-id-123',
    date: '2023-10-27T10:00:00.000Z',
  }),
}));

// 2. API functions ko mock karein
const mockGetUserById = jest.fn();
const mockGetAttraction = jest.fn();
jest.mock('../../../api/api', () => ({
  getUserById: (userId: string) => mockGetUserById(userId),
  getAttractionByUserFromUserToAndDate: (from: string, to: string, date: string) =>
    mockGetAttraction(from, to, date),
  getUserTokenBalance: jest.fn(),
  isAuthTokenApiError: jest.fn().mockReturnValue(false),
}));

// 3. AuthContext ko mock karein
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ auth0User: { sub: 'auth-user-sub-456' }, logout: jest.fn() }),
}));

// 4. Zustand store (useUserStore) ko mock karein
jest.mock('../../../store/useUserStore');
const mockedUseUserStore = useUserStore as jest.Mock;

// 5. Slider ko mock karein (Yeh sab se reliable mock hai jo testID ko support karta hai)
// The issue was that the mock was returning a simple <View> which doesn't
// behave like a slider in terms of props or events.
// A more robust mock should try to simulate the actual component's behavior,
// especially for props like 'value' and 'onValueChange'.
jest.mock('@react-native-community/slider', () => {
  const React = require('react');
  const { View } = require('react-native');
  // This mock will render a View and attach the testID.
  // We'll also add a mock for onValueChange to ensure it can be fired.
  return class MockSlider extends React.Component {
    render() {
      // It's important to spread all props to the rendered component
      // so testID and other props are available.
      return <View {...this.props} />;
    }
  };
});

// 6. Alert ko spy karein
jest.spyOn(Alert, 'alert');

//---- MOCKING SETUP END ----//

describe('<AttractionScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserById.mockResolvedValue({
      data: { userId: 'user-to-id-123', firstName: 'Target', lastName: 'User' },
    });
    mockGetAttraction.mockResolvedValue({ data: null });
    mockedUseUserStore.mockReturnValue({
      tokenBalance: 10,
      setTokenBalance: jest.fn(),
    });
  });

  it('should render loading state initially', () => {
    mockGetUserById.mockReturnValue(new Promise(() => {}));
    render(<AttractionScreen />);
    expect(screen.getByText('Loading details...')).toBeVisible();
  });

  it('should display user details and sliders after loading', async () => {
    render(<AttractionScreen />);
    // findBy* queries khud-ba-khud intezar karti hain
    await screen.findByText('Target User');
    expect(screen.getByText('Express Attraction To')).toBeVisible();
  });

  it('should update token cost and attraction type when a slider is moved', async () => {
    render(<AttractionScreen />);

    // Sab se reliable tareeka: testID se slider ko dhoondein aur intezar karein
    const romanticSlider = await screen.findByTestId('slider-Romantic');

    // Ab slider par action perform karein
    fireEvent(romanticSlider, 'onValueChange', 2);

    // It's possible the token cost update is asynchronous, so use findByText
    const tokenCostElement = await screen.findByText('2'); // Assuming '2' is the exact text rendered
    expect(tokenCostElement).toBeVisible();
    expect(screen.getByText(/Attraction Type: Company/)).toBeVisible();
  });

  it('should navigate to propose date screen with correct params on proceed', async () => {
    render(<AttractionScreen />);

    // Sliders ke aane ka intezar karein
    const romanticSlider = await screen.findByTestId('slider-Romantic');
    const sexualSlider = await screen.findByTestId('slider-Sexual');

    fireEvent(romanticSlider, 'onValueChange', 2);
    fireEvent(sexualSlider, 'onValueChange', 1);

    // Use waitFor to ensure the state updates from slider movements are complete
    // before pressing the button, if those updates trigger re-renders or other effects.
    await waitFor(() => {
      expect(screen.getByText('PROCEED TO PROPOSE DATE')).toBeEnabled();
    });

    fireEvent.press(screen.getByText('PROCEED TO PROPOSE DATE'));

    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          romanticRating: '2',
          sexualRating: '1',
        }),
      })
    );
  });

  it('should show an alert for insufficient tokens', async () => {
    mockedUseUserStore.mockReturnValue({ tokenBalance: 1 }); // Set token balance to 1 for this test
    render(<AttractionScreen />);

    // Slider ke aane ka intezar karein
    const romanticSlider = await screen.findByTestId('slider-Romantic');

    fireEvent(romanticSlider, 'onValueChange', 3); // Attempt to set a value that requires more tokens

    // Use waitFor to ensure any asynchronous logic related to token calculation
    // or button enabling/disabling is completed before asserting.
    await waitFor(() => {
      expect(screen.getByText('PROCEED TO PROPOSE DATE')).toBeDisabled(); // Button should be disabled
    });

    fireEvent.press(screen.getByText('PROCEED TO PROPOSE DATE'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Insufficient Tokens',
      expect.stringContaining('You need 3 token(s)'),
      expect.any(Array)
    );
  });
});
