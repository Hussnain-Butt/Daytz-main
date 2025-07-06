// File: app/(app)/calendar.tsx
// ✅ 100% COMPLETE AND FINAL CORRECTED CODE

import React, { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import VideoCalendar from '../../components/calendar';
import { colors } from '../../utils/theme';
import { useUserStore } from '../../store/useUserStore';
import { getCalendarDaysByUserId } from '../../api/api';
import { CalendarDay } from '../../types/CalendarDay';

const LOGO_IMAGE = require('../../assets/brand.png');
const COIN_ICON = require('../../assets/match.png');

const CalendarHomeScreen = () => {
  // ✅ STEP 1: Rely on AuthContext as the SINGLE SOURCE OF TRUTH
  const { auth0User, logout, isReady: isAuthReady, isLoading: isAuthLoading } = useAuth();

  // Use the store ONLY for supplementary data
  const { tokenBalance } = useUserStore();

  const [isCalendarLoading, setIsCalendarLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    if (!isAuthReady) return;
    await logout();
  };

  const fetchCalendarData = useCallback(async () => {
    // We get the user ID directly from auth0User, the source of truth
    if (!auth0User?.sub) {
      console.log('[CalendarScreen] No authenticated user found in AuthContext. Not fetching.');
      setIsCalendarLoading(false);
      setCalendarData([]);
      return;
    }

    console.log(`[CalendarScreen] Fetching calendar data for the correct user: ${auth0User.sub}`);
    setIsCalendarLoading(true);
    setError(null);

    try {
      const response = await getCalendarDaysByUserId();
      setCalendarData(response.data);
    } catch (apiError: any) {
      console.error('[CalendarScreen] Error fetching calendar data:', apiError.message);
      setError('Could not load your calendar. Please try again.');
    } finally {
      setIsCalendarLoading(false);
    }
  }, [auth0User]); // Depend directly on auth0User from AuthContext

  // ✅ STEP 2: THE MAIN FIX IS IN THIS useEffect
  // It only reacts to changes from useAuth, making it robust against store corruption.
  useEffect(() => {
    // If auth is ready and a user is present, fetch their data.
    if (isAuthReady && auth0User) {
      console.log('[CalendarScreen] Auth is ready and user is logged in. Triggering data fetch.');
      fetchCalendarData();
    }
    // If auth is ready and NO user is present (logged out), clear all local state.
    else if (isAuthReady && !auth0User) {
      console.log('[CalendarScreen] Auth is ready but no user logged in. Clearing local data.');
      setCalendarData([]);
      setError(null);
      setIsCalendarLoading(false);
    }
  }, [isAuthReady, auth0User, fetchCalendarData]);

  // Show a loading screen while AuthContext is initializing
  if (!isAuthReady || isAuthLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.GoldPrimary || '#FFD700'} />
          <Text style={styles.loadingText}>Finalizing Session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
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
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Area */}
        {isCalendarLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.GoldPrimary || '#FFD700'} />
            <Text style={styles.loadingText}>Loading Calendar...</Text>
          </View>
        ) : error ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.calendarGridContainer}>
            {/* ✅ STEP 3: Pass the authoritative auth0User to the calendar */}
            <VideoCalendar user={auth0User} calendarData={calendarData} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.Background || '#121212',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  container: { flex: 1, paddingHorizontal: 15, paddingTop: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 16, color: colors.LightGrey || '#CCCCCC' },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center', paddingHorizontal: 20 },
  topHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, height: 40 },
  headerLeft: { flex: 1 },
  headerCenter: { flex: 1.5, alignItems: 'center' },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  logoImage: { width: 100, height: 30, resizeMode: 'contain' },
  tokenDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
  },
  tokenIcon: { width: 20, height: 20, marginRight: 8, resizeMode: 'contain' },
  tokenTextValue: { color: colors.White || '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  logoutButton: {
    backgroundColor: colors.PinkPrimary || '#f87171',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  logoutButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  calendarGridContainer: { flex: 1 },
});

export default CalendarHomeScreen;
