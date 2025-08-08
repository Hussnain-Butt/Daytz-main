import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import VideoCalendar from '../calendar';
import { CalendarDay } from '../../types/CalendarDay';
import { User as Auth0User } from 'react-native-auth0';
import { format } from 'date-fns';

//---- MOCKING SETUP START ----//

const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

jest.mock('react-native-calendars', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Calendar: (props: any) => <View testID="mock-calendar" {...props} />,
  };
});

jest.spyOn(Alert, 'alert');

//---- MOCKING SETUP END ----//

// YAHAN SE TEST SUITE SHURU HO RAHA HAI
describe('<VideoCalendar />', () => {
  // === YEH VARIABLES DESCRIBE KE ANDAR HONE CHAHIYE ===
  // Taake neeche ke saare 'it' blocks inko istemal kar sakein
  const mockUser: Auth0User & { sub?: string } = {
    sub: 'auth0|12345',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockCalendarData: CalendarDay[] = [
    {
      date: '2023-10-26T10:00:00Z',
      userVideoUrl: 'http://example.com/video.mp4',
    },
  ];
  // ======================================================

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly and show the legend', () => {
    render(<VideoCalendar user={mockUser} calendarData={[]} />);
    expect(screen.getByText('Video Uploaded')).toBeVisible();
    expect(screen.getByTestId('mock-calendar')).toBeVisible();
  });

  it('should navigate to /stories when a marked day is pressed', () => {
    render(<VideoCalendar user={mockUser} calendarData={mockCalendarData} />);
    const calendar = screen.getByTestId('mock-calendar');
    act(() => {
      calendar.props.onDayPress({ dateString: '2023-10-26' });
    });
    expect(mockRouterPush).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/(app)/stories',
      params: { date: '2023-10-26' },
    });
  });

  it('should navigate to /upload-day-video when a non-marked, future day is pressed', () => {
    render(<VideoCalendar user={mockUser} calendarData={[]} />);
    const calendar = screen.getByTestId('mock-calendar');
    const futureDate = '2099-12-31';
    act(() => {
      calendar.props.onDayPress({ dateString: futureDate });
    });
    expect(mockRouterPush).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/(app)/upload-day-video',
      params: { date: futureDate },
    });
  });

  it('should show an alert and not navigate if user is null', () => {
    render(<VideoCalendar user={null} calendarData={[]} />);
    const calendar = screen.getByTestId('mock-calendar');
    act(() => {
      calendar.props.onDayPress({ dateString: '2023-10-27' });
    });
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Authentication Error',
      'User information not available. Please try again.'
    );
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  // AAKHRI TEST JO AB THEEK HO GAYA HAI
  it('should do nothing when a disabled (past) day is pressed', () => {
    const today = new Date();
    if (today.getDate() === 1) {
      console.warn("Skipping 'disabled day' test because it's the 1st of the month.");
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const pastDateInCurrentMonth = format(yesterday, 'yyyy-MM-dd');

    // Dekhein, hum yahan 'mockUser' ko istemal kar rahe hain
    render(<VideoCalendar user={mockUser} calendarData={[]} />);
    const calendar = screen.getByTestId('mock-calendar');

    act(() => {
      calendar.props.onDayPress({ dateString: pastDateInCurrentMonth });
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });
}); // YAHAN PAR TEST SUITE KHATAM HO RAHA HAI
