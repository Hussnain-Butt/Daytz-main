// ✅ COMPLETE AND FINAL UPDATED CODE
// File: app/(app)/notifications.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar as RNStatusBar,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { colors } from '../../utils/theme';
import { getMyNotifications, markNotificationsAsRead } from '../../api/api';
import { Notification } from '../../types/Notification';

const BACK_ARROW_ICON = require('../../assets/back_arrow_icon.png');
const NOTIFICATION_BELL_ICON = require('../../assets/notification_bell_icon.png');
const calcHappyIcon = require('../../assets/calc-happy.png');
const calcErrorIcon = require('../../assets/calc-error.png');

// --- BUBBLE POPUP COMPONENT (UNCHANGED) ---
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

const getNotificationIcon = (notificationType: string) => {
  if (notificationType === 'MATCH_PROPOSAL' || notificationType.startsWith('DATE_APPROVED')) {
    return calcHappyIcon;
  }
  if (notificationType === 'DATE_DECLINED' || notificationType === 'DATE_CANCELLED') {
    return calcErrorIcon;
  }
  return calcHappyIcon;
};

const NotificationItem = ({
  item,
  onPress,
}: {
  item: Notification;
  onPress: (item: Notification) => void;
}) => (
  <TouchableOpacity
    style={[styles.notificationItem, item.status === 'unread' && styles.unreadItem]}
    onPress={() => onPress(item)}>
    <Image source={getNotificationIcon(item.type)} style={styles.notificationIcon} />
    <View style={styles.notificationContent}>
      <Text style={styles.notificationMessage}>{item.message}</Text>
      <Text style={styles.notificationTimestamp}>
        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
      </Text>
    </View>
    {item.status === 'unread' && <View style={styles.unreadDot} />}
  </TouchableOpacity>
);

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [popupState, setPopupState] = useState({
    visible: false,
    type: 'error' as 'success' | 'error',
    title: '',
    message: '',
  });

  const showPopup = (title: string, message: string, type: 'success' | 'error' = 'error') => {
    setPopupState({ visible: true, title, message, type });
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await getMyNotifications();
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      showPopup('Load Failed', 'Could not load notifications. Please try again.', 'error');
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchNotifications().finally(() => setIsLoading(false));
  }, [fetchNotifications]);

  useFocusEffect(
    useCallback(() => {
      console.log('Notifications screen focused. Marking notifications as read.');
      markNotificationsAsRead().catch((err) => {
        console.error('Failed to mark notifications as read:', err);
      });
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  }, [fetchNotifications]);
  const handleNotificationPress = (item: Notification) => {
    console.log('Notification pressed:', item);

    switch (item.type) {
      case 'ATTRACTION_PROPOSAL':
        // ✅ UPDATED: Redirect to the main calendar page
        router.push('/(app)/calender');
        break;

      case 'MATCH_PROPOSAL':
        if (item.related_entity_id && item.proposing_user_id) {
          // Explicitly convert parameters to string to prevent type errors.
          router.push({
            pathname: '/(app)/propose-date',
            params: {
              userToId: String(item.proposing_user_id),
              dateForProposal: String(item.related_entity_id),
            },
          });
        }
        break;

      case 'DATE_PROPOSAL':
      case 'DATE_APPROVED':
      case 'DATE_DECLINED':
      case 'DATE_RESCHEDULED':
      case 'DATE_CANCELLED':
        if (item.related_entity_id) {
          // Ensure this is a string for consistency and safety.
          router.push(`/(app)/dates/${String(item.related_entity_id)}`);
        }
        break;

      default:
        console.log('No specific navigation action for this notification type:', item.type);
        break;
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image source={NOTIFICATION_BELL_ICON} style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No Notifications Yet</Text>
      <Text style={styles.emptySubtitle}>
        When you get new matches or date proposals, they will appear here.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Image source={BACK_ARROW_ICON} style={styles.headerIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.headerButton} onPress={onRefresh} disabled={isRefreshing}>
          <Text style={{ color: 'white' }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.GoldPrimary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={handleNotificationPress} />
          )}
          keyExtractor={(item) => String(item.notification_id)}
          ListEmptyComponent={renderEmptyState}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.White}
            />
          }
        />
      )}

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
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.Background || '#121212',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.DarkGrey || '#333',
  },
  headerButton: { padding: 8 },
  headerIcon: { width: 24, height: 24 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.White || '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.Background || '#121212',
  },
  notificationIcon: { width: 50, height: 50, resizeMode: 'contain', marginRight: 15 },
  unreadItem: { backgroundColor: colors.DarkGrey || '#1E1E1E' },
  notificationContent: { flex: 1 },
  notificationMessage: { fontSize: 16, color: colors.White || '#FFFFFF' },
  notificationTimestamp: { fontSize: 13, color: colors.LightGrey || '#B0B0B0', marginTop: 4 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.TealPrimary || '#00BCD4',
    marginLeft: 15,
  },
  separator: { height: 1, backgroundColor: colors.DarkGrey || '#333', marginLeft: 85 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: '30%',
  },
  emptyIcon: { width: 80, height: 80, tintColor: colors.Grey || '#888', marginBottom: 20 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.White || '#FFFFFF',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.LightGrey || '#B0B0B0',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
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
