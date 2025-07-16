import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import { format, startOfMonth, parse, isBefore, startOfToday } from 'date-fns';
import { CalendarDay } from '../types/CalendarDay';
import { User as Auth0User } from 'react-native-auth0';
import { colors } from '../utils/theme';

// Interface for custom marking
interface CustomMarking {
  customStyles?: {
    container?: object;
    text?: object;
  };
  dotColor?: string;
  marked?: boolean;
  disabled?: boolean;
  disableTouchEvent?: boolean;
}

interface MarkedDates {
  [date: string]: CustomMarking;
}

interface VideoCalendarProps {
  user: (Auth0User & { sub?: string }) | null;
  calendarData: CalendarDay[];
}

const VideoCalendar: React.FC<VideoCalendarProps> = ({ user, calendarData }) => {
  const router = useRouter();
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const today = startOfToday();
    const newMarkedDates: MarkedDates = {};

    // 1. Mark dates with uploaded videos
    calendarData.forEach((entry) => {
      if (entry.date && entry.userVideoUrl) {
        const dateStr = format(new Date(entry.date), 'yyyy-MM-dd');
        newMarkedDates[dateStr] = {
          marked: true,
          dotColor: colors.GoldPrimary || 'blue',
        };
      }
    });

    // 2. Mark past dates as disabled with a strikethrough effect
    const monthStartDate = startOfMonth(parse(currentMonth, 'yyyy-MM-dd', new Date()));
    const daysInMonth = 31; // Check up to 31 days to cover all months
    for (let i = 0; i < daysInMonth; i++) {
      const day = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth(), i + 1);

      if (day.getMonth() !== monthStartDate.getMonth()) break;

      const dateStr = format(day, 'yyyy-MM-dd');

      if (isBefore(day, today) && !newMarkedDates[dateStr]) {
        newMarkedDates[dateStr] = {
          disabled: true,
          disableTouchEvent: true,
          customStyles: {
            text: {
              color: '#707070',
              textDecorationLine: 'line-through',
            },
          },
        };
      }
    }

    setMarkedDates(newMarkedDates);
  }, [calendarData, currentMonth]);

  const handleDayPress = (day: DateData) => {
    // This check is important because custom marking allows pressing disabled dates
    if (markedDates[day.dateString]?.disabled) {
      return;
    }

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
      <Calendar
        onMonthChange={(month) => {
          setCurrentMonth(month.dateString);
        }}
        onDayPress={handleDayPress}
        markingType={'custom'}
        markedDates={markedDates}
        style={styles.calendar}
        theme={{
          backgroundColor: colors.Background || '#1E1E1E',
          calendarBackground: colors.Background || '#1E1E1E',
          textSectionTitleColor: colors.LightGrey || '#b6c1cd',
          selectedDayBackgroundColor: colors.GoldPrimary || '#FFDB5C',
          selectedDayTextColor: colors.Black || '#000000',
          // ✅ CHANGE: Today's date color changed to white
          todayTextColor: colors.White || '#FFFFFF',
          dayTextColor: colors.White || '#E0E0E0',
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
    backgroundColor: colors.Background || '#1F1F1F',
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
