// --- COMPLETE FINAL UPDATED CODE: components/calendar.tsx ---

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useRouter, useFocusEffect } from 'expo-router';
// Import the simplified API function
import { getCalendarDaysByUserId } from '../api/api';
import { format } from 'date-fns';
import { CalendarDay } from '../types/CalendarDay';
import { User as Auth0User } from 'react-native-auth0'; // Import Auth0 user type
import { colors } from '../utils/theme';

interface MarkedDateInfo {
  marked?: boolean;
  dotColor?: string;
}
interface MarkedDates {
  [date: string]: MarkedDateInfo;
}

interface VideoCalendarProps {
  // The component now only needs the user object
  user: (Auth0User & { sub?: string }) | null;
}

const VideoCalendar: React.FC<VideoCalendarProps> = ({ user }) => {
  const router = useRouter();
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    // Check if the user object (and their sub ID) is available
    if (!user?.sub) {
      console.log('VideoCalendar: User.sub is not available. Aborting fetch.');
      setMarkedDates({});
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log(`VideoCalendar: Fetching calendar data for Auth0 user: ${user.sub}`);

    try {
      // API Call Simplified: No getAccessToken needed.
      // The backend extracts the user ID from the token that the interceptor adds.
      const response = await getCalendarDaysByUserId();

      const newMarkedDates: MarkedDates = {};
      if (response.data && Array.isArray(response.data)) {
        console.log(`VideoCalendar: Received ${response.data.length} calendar entries.`);
        response.data.forEach((entry: CalendarDay) => {
          if (entry.date && entry.userVideoUrl) {
            const dateStr = format(new Date(entry.date), 'yyyy-MM-dd');
            newMarkedDates[dateStr] = {
              marked: true,
              dotColor: colors.GoldPrimary || 'blue',
            };
          }
        });
      } else {
        console.warn('VideoCalendar: No valid calendar data received. Response data:', response.data);
      }
      setMarkedDates(newMarkedDates);
    } catch (err: any) {
      console.error('VideoCalendar: Error fetching user calendar data:', err.message, err);
      setError(err.message || 'Could not load your calendar data.');
      setMarkedDates({});
    } finally {
      setIsLoading(false);
    }
  }, [user?.sub]); // Dependency is now just the user's ID

  useFocusEffect(
    useCallback(() => {
      console.log('VideoCalendar: Screen focused, initiating data fetch...');
      fetchUserData();
      return () => {
        console.log('VideoCalendar: Screen unfocused.');
      };
    }, [fetchUserData])
  );

  const handleDayPress = (day: DateData) => {
    const dateString = day.dateString;
    console.log(`VideoCalendar: Day pressed: ${dateString}`);

    if (!user?.sub) {
      Alert.alert('Authentication Error', 'User information not available. Please try again.');
      return;
    }

    const dateInfo = markedDates[dateString];
    if (dateInfo?.marked) {
      console.log(`VideoCalendar: Navigating to Stories for marked date ${dateString}`);
      router.push({ pathname: '/(app)/stories', params: { date: dateString } });
    } else {
      console.log(`VideoCalendar: Navigating to UploadDayVideo for non-marked date ${dateString}`);
      router.push({ pathname: '/(app)/upload-day-video', params: { date: dateString } });
    }
  };

  return (
    <View style={styles.calendarWrapper}>
      {isLoading && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color={colors.GoldPrimary || '#FFD700'} />
          <Text style={styles.statusText}>Loading Calendar...</Text>
        </View>
      )}
      {!isLoading && error && (
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, styles.errorText]}>Error: {error}</Text>
          <TouchableOpacity onPress={fetchUserData} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      <Calendar
        onDayPress={handleDayPress}
        markingType={'dot'}
        markedDates={markedDates}
        style={styles.calendar}
        theme={{
          backgroundColor: colors.Background || '#1E1E1E',
          calendarBackground: colors.Background || '#1E1E1E',
          textSectionTitleColor: colors.LightGrey || '#b6c1cd',
          selectedDayBackgroundColor: colors.GoldPrimary || '#FFDB5C',
          selectedDayTextColor: colors.Black || '#000000',
          todayTextColor: colors.White || '#E0E0E0',
          dayTextColor: colors.White || '#E0E0E0',
          textDisabledColor: colors.GreyDark || '#555555',
          dotColor: colors.GoldPrimary || 'blue',
          selectedDotColor: colors.White || '#ffffff',
          arrowColor: colors.GoldPrimary || '#FFDB5C',
          disabledArrowColor: colors.GreyDark || '#555555',
          monthTextColor: colors.White || '#E0E0E0',
          indicatorColor: colors.GoldPrimary || '#FFDB5C',
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '500',
          textDayFontSize: 15,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 13,
          'stylesheet.calendar.header': {
            week: {
              marginTop: 5,
              flexDirection: 'row',
              justifyContent: 'space-around',
              borderBottomWidth: 1,
              borderColor: colors.Grey || '#424242',
              paddingBottom: 5,
            },
            monthText: {
              fontSize: 20,
              fontWeight: 'bold',
              color: colors.GoldPrimary || '#FFDB5C',
              margin: 10,
            },
          },
        }}
        enableSwipeMonths={true}
        hideExtraDays={true}
        firstDay={1}
      />
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.GoldPrimary || 'blue' }]} />
          <Text style={styles.legendText}>Video Uploaded</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calendarWrapper: {
    width: '100%',
    flex: 1,
    backgroundColor: colors.Background || '#1F1F1F',
  },
  statusContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  statusText: {
    color: colors.LightGrey || '#CCCCCC',
    textAlign: 'center',
    marginBottom: 5,
    fontSize: 14,
  },
  errorText: {
    color: colors.PinkPrimary || 'red',
    fontWeight: 'bold',
  },
  retryButton: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.GoldPrimary || '#FFD700',
    borderRadius: 15,
  },
  retryButtonText: {
    color: colors.Black || '#000000',
    fontWeight: 'bold',
  },
  calendar: {
    borderRadius: 8,
    marginHorizontal: 5,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    color: colors.LightGrey || '#E0E0E0',
    fontSize: 12,
  },
});

export default VideoCalendar;