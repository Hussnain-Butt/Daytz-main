// ✅ COMPLETE AND FINAL UPDATED FILE

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import { format, startOfMonth, parse, isBefore, startOfToday, addMonths, parseISO } from 'date-fns';
import { CalendarDay } from '../types/CalendarDay';
import { User as Auth0User } from 'react-native-auth0';
import { colors } from '../utils/theme';
import { UpcomingDate } from '../types/Date'; // Make sure to import UpcomingDate

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

// ✅ PROPS UPDATED
interface VideoCalendarProps {
  user: (Auth0User & { sub?: string }) | null;
  calendarData: CalendarDay[];
  plannedDates: UpcomingDate[]; // New prop for pending/approved dates
}

const VideoCalendar: React.FC<VideoCalendarProps> = ({ user, calendarData, plannedDates }) => {
  const router = useRouter();
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM-dd'));

  // ✅ USEEFFECT LOGIC UPDATED FOR NEW COLORS AND DATE PARSING FIX
  useEffect(() => {
    const today = startOfToday();
    const newMarkedDates: MarkedDates = {};

    // 1. Mark dates with uploaded videos (Yellow) - This is the default
    calendarData.forEach((entry) => {
      if (entry.date && entry.userVideoUrl) {
        // 🛑 BUG FIX: Use parseISO instead of new Date() to correctly handle UTC dates
        // OLD CODE: const dateStr = format(new Date(entry.date), 'yyyy-MM-dd');
        const dateStr = format(parseISO(entry.date), 'yyyy-MM-dd');

        newMarkedDates[dateStr] = {
          marked: true,
          dotColor: colors.GoldPrimary, // Yellow for posted invite
        };
      }
    });

    // 2. Mark pending/confirmed plans (Orange/Teal) - This will override the yellow dot
    plannedDates.forEach((pDate) => {
      // This part was already correct
      const dateStr = format(parseISO(pDate.date), 'yyyy-MM-dd');
      if (pDate.status === 'pending') {
        newMarkedDates[dateStr] = { marked: true, dotColor: '#FFA500' }; // Orange for Pending
      } else if (pDate.status === 'approved') {
        newMarkedDates[dateStr] = { marked: true, dotColor: '#40E0D0' }; // Teal for Confirmed
      }
    });

    // 3. Disable days before today with strikethrough (if not already marked)
    const monthStartDate = startOfMonth(parse(currentMonth, 'yyyy-MM-dd', new Date()));
    const daysInMonth = 31;
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
  }, [calendarData, plannedDates, currentMonth]);

  const handleDayPress = (day: DateData) => {
    if (markedDates[day.dateString]?.disabled) return;

    if (!user?.sub) {
      Alert.alert('Authentication Error', 'User information not available. Please try again.');
      return;
    }

    const dateInfo = markedDates[day.dateString];
    if (dateInfo?.marked) {
      // If a day is marked, it means there's either a video or a plan.
      // Send user to stories page to see who is available.
      router.push({ pathname: '/(app)/stories', params: { date: day.dateString } });
    } else {
      // If not marked, it's an empty, available day. Allow user to upload.
      router.push({ pathname: '/(app)/upload-day-video', params: { date: day.dateString } });
    }
  };

  const today = startOfToday();
  const firstDayOfCurrentMonth = startOfMonth(today);
  const maxDateObj = addMonths(today, 6);
  const minDateStr = format(firstDayOfCurrentMonth, 'yyyy-MM-dd');
  const maxDateStr = format(maxDateObj, 'yyyy-MM-dd');

  return (
    <View style={styles.calendarWrapper}>
      <Calendar
        onMonthChange={(month) => setCurrentMonth(month.dateString)}
        onDayPress={handleDayPress}
        markingType={'custom'}
        markedDates={markedDates}
        style={styles.calendar}
        minDate={minDateStr}
        maxDate={maxDateStr}
        theme={{
          backgroundColor: colors.Background || '#1E1E1E',
          calendarBackground: colors.Background || '#1E1E1E',
          textSectionTitleColor: colors.LightGrey || '#b6c1cd',
          selectedDayBackgroundColor: colors.GoldPrimary || '#FFDB5C',
          selectedDayTextColor: colors.Black || '#000000',
          todayTextColor: colors.White || '#FFFFFF',
          dayTextColor: colors.White || '#E0E0E0',
          dotColor: colors.GoldPrimary,
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
      {/* ✅ LEGEND UPDATED WITH NEW COLORS */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot1, { backgroundColor: colors.GoldPrimary }]} />
          <Text style={styles.legendText}>Posted Invite</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot1, { backgroundColor: '#FFA500' }]} />
          <Text style={styles.legendText}>Pending</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot1, { backgroundColor: '#40E0D0' }]} />
          <Text style={styles.legendText}>Confirmed</Text>
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
    flexWrap: 'wrap',
    marginTop: 20,
    paddingBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendDot1: {
    width: 15,
    height: 15,
    borderRadius: 0,
    marginRight: 8,
  },
  legendText: {
    color: colors.LightGrey || '#E0E0E0',
    fontSize: 12,
  },
});

export default VideoCalendar;
