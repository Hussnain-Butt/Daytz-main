// File: app/(app)/calendar.tsx
// ✅ COMPLETE AND FINAL UPDATED CODE WITH BUBBLE POPUP

import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  RefreshControl,
  Modal, // BubblePopup ke liye import
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import VideoCalendar from '../../components/calendar';
import { colors } from '../../utils/theme';
import { useUserStore } from '../../store/useUserStore';
import {
  getCalendarDaysByUserId,
  getUnreadNotificationsCount,
  getUpcomingDates,
} from '../../api/api';
import { CalendarDay } from '../../types/CalendarDay';
import { UpcomingDate } from '../../types/Date';
import { useRouter, useFocusEffect } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

const LOGO_IMAGE = require('../../assets/brand.png');
const COIN_ICON = require('../../assets/match.png');
const NOTIFICATION_ICON = require('../../assets/notification_bell_icon.png');

// =====> ALERT KI TASVEEREIN IMPORT KAREIN (PATH THEEK KAREIN) <=====
const calcHappyIcon = require('../../assets/calc-happy.png');
const calcErrorIcon = require('../../assets/calc-error.png');
// =====================================================================

// --- NEW BUBBLE POPUP COMPONENT ---
const BubblePopup = ({ visible, type, title, message, buttonText, onClose }) => {
  if (!visible) {
    return null;
  }

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
// --- END OF BUBBLE POPUP COMPONENT ---

const UpcomingDateItem = ({
  item,
  onPress,
}: {
  item: UpcomingDate;
  onPress: (item: UpcomingDate) => void;
}) => (
  <TouchableOpacity style={styles.upcomingItem} onPress={() => onPress(item)}>
    <Avatar.Image size={52} source={{ uri: item.otherUser.profilePictureUrl }} />
    <View style={styles.upcomingItemDetails}>
      <Text style={styles.upcomingItemName} numberOfLines={1}>
        {item.otherUser.firstName}
      </Text>
      <Text style={styles.upcomingItemInfo} numberOfLines={1}>
        {format(parseISO(item.date), 'MMMM dd, yyyy')} at {item.locationMetadata.name}
      </Text>
      <Text style={styles.upcomingItemTime}>
        {item.time ? format(parseISO(`1970-01-01T${item.time}`), 'p') : 'Time not set'}
      </Text>
    </View>
    <View style={styles.statusContainer}>
      <Ionicons name="checkmark-circle" size={20} color={colors.Success || '#28a745'} />
      <Text style={styles.statusText}>Approved</Text>
    </View>
  </TouchableOpacity>
);

const CalendarHomeScreen = () => {
  const { auth0User, logout, isReady: isAuthReady, isLoading: isAuthLoading } = useAuth();
  const { tokenBalance } = useUserStore();
  const router = useRouter();

  const [isCalendarLoading, setIsCalendarLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [upcomingDates, setUpcomingDates] = useState<UpcomingDate[]>([]);
  const [isUpcomingLoading, setIsUpcomingLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // =====> CUSTOM POPUP KE LIYE STATE <=====
  const [popupState, setPopupState] = useState({
    visible: false,
    type: 'error' as 'success' | 'error',
    title: '',
    message: '',
  });
  // ======================================

  // =====> CUSTOM POPUP DIKHANE KE LIYE HELPER FUNCTION <=====
  const showPopup = (title: string, message: string, type: 'success' | 'error' = 'error') => {
    setPopupState({
      visible: true,
      title,
      message,
      type,
    });
  };
  // ========================================================

  const fetchAllScreenData = useCallback(async () => {
    if (!auth0User?.sub) {
      setIsCalendarLoading(false);
      setIsUpcomingLoading(false);
      return;
    }
    if (!isRefreshing) {
      setIsCalendarLoading(true);
      setIsUpcomingLoading(true);
    }

    try {
      const [calendarResponse, upcomingResponse, countResponse] = await Promise.all([
        getCalendarDaysByUserId(),
        getUpcomingDates(),
        getUnreadNotificationsCount(),
      ]);
      setCalendarData(calendarResponse.data);
      setUpcomingDates(upcomingResponse.data);
      setUnreadCount(countResponse.data.unreadCount);
    } catch (apiError: any) {
      // Error ko Text ke bajaye Popup se dikhayein
      showPopup('Load Failed', 'Could not load your calendar data. Please try again.', 'error');
    } finally {
      setIsCalendarLoading(false);
      setIsUpcomingLoading(false);
      setIsRefreshing(false);
    }
  }, [auth0User, isRefreshing]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthReady && !isAuthLoading) fetchAllScreenData();
    }, [isAuthReady, isAuthLoading, fetchAllScreenData])
  );
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (isAuthReady) fetchAllScreenData();
    else setIsRefreshing(false);
  }, [isAuthReady, fetchAllScreenData]);

  if (!isAuthReady || isAuthLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.GoldPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Image source={LOGO_IMAGE} style={styles.logoImage} />
        </View>
        <View style={styles.headerCenter}>
          <View style={styles.tokenDisplayContainer}>
            <Image source={COIN_ICON} style={styles.tokenIcon} />
            <Text style={styles.tokenTextValue}>
              {tokenBalance !== null ? (
                `${tokenBalance} coins`
              ) : (
                <ActivityIndicator size="small" color="#FFFFFF" />
              )}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              setUnreadCount(0);
              router.push('/(app)/notifications');
            }}>
            <Image source={NOTIFICATION_ICON} style={styles.headerIcon} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
        }>
        {isCalendarLoading ? (
          <View style={[styles.loadingContainer, { minHeight: 400 }]}>
            <ActivityIndicator size="large" color={colors.GoldPrimary} />
          </View>
        ) : (
          // Error ab popup se handle hoga, isliye yahan se error check hata diya gaya hai
          <View style={styles.calendarGridContainer}>
            <VideoCalendar user={auth0User} calendarData={calendarData} />
          </View>
        )}

        <View style={styles.upcomingSection}>
          <Text style={styles.upcomingTitle}>Upcoming Dates</Text>
          {isUpcomingLoading ? (
            <ActivityIndicator color="#FFF" style={{ marginTop: 20 }} />
          ) : upcomingDates.length > 0 ? (
            <View style={styles.listContainer}>
              {upcomingDates.map((item, index) => (
                <React.Fragment key={item.dateId}>
                  <UpcomingDateItem
                    item={item}
                    onPress={(date) => router.push(`/(app)/dates/${date.dateId}`)}
                  />
                  {index < upcomingDates.length - 1 && <View style={styles.separator} />}
                </React.Fragment>
              ))}
            </View>
          ) : (
            <Text style={styles.noUpcomingText}>No upcoming dates scheduled.</Text>
          )}
        </View>
      </ScrollView>

      {/* Naya popup render ho raha hai */}
      <BubblePopup
        visible={popupState.visible}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        buttonText="OK"
        onClose={() => setPopupState((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.Background || '#121212',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // errorText style ab zaroori nahi hai
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
    height: 60,
  },
  headerLeft: { flex: 1 },
  headerCenter: { flex: 2, alignItems: 'center' },
  headerRight: {
    flex: 1.5,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  logoImage: { width: 100, height: 30, resizeMode: 'contain' },
  tokenDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tokenIcon: { width: 20, height: 20, marginRight: 8 },
  tokenTextValue: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  iconButton: { padding: 6, marginRight: 8, position: 'relative' },
  headerIcon: { width: 24, height: 24, tintColor: '#FFFFFF' },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'red',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#121212',
  },
  notificationBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  logoutButton: {
    backgroundColor: colors.PinkPrimary || '#f87171',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  logoutButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  calendarGridContainer: { paddingHorizontal: 15 },
  upcomingSection: { marginTop: 30, paddingHorizontal: 15 },
  upcomingTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 10 },
  listContainer: {
    backgroundColor: colors.DarkGrey || '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  separator: { height: 1, backgroundColor: '#3A3A3C' },
  noUpcomingText: { color: '#AAAAAA', textAlign: 'center', marginTop: 20, fontSize: 16 },
  upcomingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  upcomingItemDetails: { flex: 1, marginLeft: 12, gap: 2 },
  upcomingItemName: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  upcomingItemInfo: { fontSize: 13, color: '#EBEBF599' },
  upcomingItemTime: { fontSize: 13, color: '#EBEBF599', fontWeight: '500' },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 167, 69, 0.15)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginLeft: 10,
  },
  statusText: {
    color: colors.Success || '#28a745',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  // --- NAYE BUBBLE POPUP KE STYLES ---
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popupContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
  },
  popupImage: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
    zIndex: 1,
    marginBottom: -80,
  },
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
  errorButton: {
    backgroundColor: colors.PinkPrimary || '#FF6B6B',
  },
  successButton: {
    backgroundColor: colors.GoldPrimary || '#FFD700',
  },
  errorButtonText: {
    color: colors.White || '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  successButtonText: {
    color: colors.Black || '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default CalendarHomeScreen;
