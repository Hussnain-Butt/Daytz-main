// ✅ COMPLETE AND FINAL UPDATED CODE

import axios, { AxiosInstance, AxiosProgressEvent, AxiosResponse } from 'axios';
import { Platform } from 'react-native';

import { User, CreateUserApiPayload as ActualCreateUserPayloadType } from '../types/User';
import { CalendarDay, StoryQueryResult as BackendStoryItem } from '../types/CalendarDay';
import {
  DateObject,
  CreateDatePayload,
  DetailedDateObject,
  UpcomingDate,
  DateOutcome,
} from '../types/Date';
import { Transaction as BackendTransactionType } from '../types/Transaction';
import { Notification, UnreadCountResponse } from '../types/Notification';
import {
  CreateAttraction as CreateAttractionPayload,
  Attraction as AttractionResponse,
} from '../types/Attraction';

const getApiBaseUrl = (): string => {
  const envApiUrl = 'https://backend-production-7442.up.railway.app/api';
  if (envApiUrl) return envApiUrl;
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000/api';
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();
console.log(`✅ API: Final API_BASE_URL is: ${API_BASE_URL}`);

const apiClient: AxiosInstance = axios.create({ baseURL: API_BASE_URL, timeout: 45000 });

export type GetAccessTokenFunc = () => Promise<string | null | undefined>;

export const setApiClientAuthHeader = (token: string | null) => {
  if (token) {
    console.log('[API] Setting Axios auth header.');
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    console.log('[API] Clearing Axios auth header.');
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export const configureApiClient = (getAccessTokenFunc: GetAccessTokenFunc) => {
  console.log('[API] Configuring Axios interceptor with token provider.');
  apiClient.interceptors.request.use(
    async (config) => {
      if (!config.headers.Authorization) {
        const token = await getAccessTokenFunc();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
};

export const isAuthTokenApiError = (error: any): boolean => {
  const status = error?.response?.status || error?.originalError?.response?.status;
  return status === 401 || status === 403;
};

// NOTE: The problematic handleApiError function has been removed.
// We will now re-throw the original error in each function.

// ================== API FUNCTIONS ==================

export const addDateFeedback = async (
  dateId: number,
  payload: { outcome: DateOutcome; notes?: string }
): Promise<AxiosResponse<DateObject>> => {
  try {
    return await apiClient.patch<DateObject>(`/dates/${dateId}/feedback`, payload);
  } catch (e) {
    throw e;
  }
};

// --- USER API ---
export const createUser = async (
  userData: ActualCreateUserPayloadType
): Promise<AxiosResponse<User>> => {
  try {
    return await apiClient.post<User>(`/users`, userData);
  } catch (e) {
    throw e;
  }
};

export const getUserById = async (userId: string): Promise<AxiosResponse<User | null>> => {
  try {
    return await apiClient.get<User>(`/users/${userId}`);
  } catch (e: any) {
    if (axios.isAxiosError(e) && e.response?.status === 404)
      return { ...e.response, status: 404, data: null } as AxiosResponse<User | null>;
    throw e;
  }
};

export const updateUser = async (updateData: Partial<User>): Promise<AxiosResponse<User>> => {
  try {
    return await apiClient.patch<User>(`/users`, updateData);
  } catch (e) {
    throw e;
  }
};

// --- NOTIFICATION API ---
export const getMyNotifications = async (): Promise<AxiosResponse<Notification[]>> => {
  try {
    return await apiClient.get<Notification[]>(`/notifications`);
  } catch (e) {
    throw e;
  }
};

export const getUnreadNotificationsCount = async (): Promise<
  AxiosResponse<UnreadCountResponse>
> => {
  try {
    return await apiClient.get<UnreadCountResponse>(`/notifications/unread-count`);
  } catch (e) {
    throw e;
  }
};

export const markNotificationsAsRead = async (): Promise<AxiosResponse<{ message: string }>> => {
  try {
    return await apiClient.post(`/notifications/mark-as-read`);
  } catch (e) {
    throw e;
  }
};

// --- PUSH NOTIFICATION TOKEN REGISTRATION ---
export const registerPushToken = async (
  fcmToken: string
): Promise<AxiosResponse<{ message: string }>> => {
  try {
    return await apiClient.post(`/users/push-token`, { token: fcmToken });
  } catch (e) {
    throw e;
  }
};

// --- TOKEN & TRANSACTION API ---
export const getUserTokenBalance = async (): Promise<AxiosResponse<{ tokenBalance: number }>> => {
  try {
    return await apiClient.get<{ tokenBalance: number }>(`/users/tokens`);
  } catch (e) {
    throw e;
  }
};

// ✅✅✅ --- NAYE FUNCTIONS: BLOCK/UNBLOCK --- ✅✅✅
export const blockUser = async (
  userIdToBlock: string
): Promise<AxiosResponse<{ message: string }>> => {
  try {
    return await apiClient.post('/users/block', { userId: userIdToBlock });
  } catch (e) {
    throw e;
  }
};

export const unblockUser = async (
  userIdToUnblock: string
): Promise<AxiosResponse<{ message: string }>> => {
  try {
    return await apiClient.post('/users/unblock', { userId: userIdToUnblock });
  } catch (e) {
    throw e;
  }
};

export const getMyBlockedUsers = async (): Promise<AxiosResponse<User[]>> => {
  try {
    return await apiClient.get<User[]>('/users/me/blocked');
  } catch (e) {
    throw e;
  }
};
// ✅✅✅ --- END OF NAYE FUNCTIONS --- ✅✅✅

export const purchaseTokens = async (payload: {
  tokenAmount: number;
  description: string;
  amountUsd?: number;
}): Promise<AxiosResponse<{ transaction?: BackendTransactionType; newTokenBalance: number }>> => {
  try {
    return await apiClient.post(`/transactions/purchase`, payload);
  } catch (e) {
    throw e;
  }
};

export const getCalendarDaysByUserId = async (): Promise<AxiosResponse<CalendarDay[]>> => {
  try {
    return await apiClient.get<CalendarDay[]>(`/calendarDays/user`);
  } catch (e) {
    throw e;
  }
};

export const getStoriesByDate = async (
  date: string
): Promise<AxiosResponse<BackendStoryItem[]>> => {
  try {
    return await apiClient.get<BackendStoryItem[]>(`/stories/${date}`);
  } catch (e) {
    throw e;
  }
};

export const createDate = async (
  payload: CreateDatePayload
): Promise<AxiosResponse<DateObject>> => {
  try {
    return await apiClient.post<DateObject>(`/date`, payload);
  } catch (e) {
    // ✅ FIX: Re-throwing the original error to preserve the .response object
    throw e;
  }
};

export const getDateById = async (
  dateId: string
): Promise<AxiosResponse<DetailedDateObject | null>> => {
  try {
    return await apiClient.get<DetailedDateObject>(`/dates/${dateId}`);
  } catch (e: any) {
    if (axios.isAxiosError(e) && e.response?.status === 404)
      return { ...e.response, status: 404, data: null } as AxiosResponse<DetailedDateObject | null>;
    throw e;
  }
};

export const updateDate = async (
  dateId: string,
  payload: Partial<{
    status: 'approved' | 'declined';
    date: string;
    time: string;
    locationMetadata: any;
  }>
): Promise<AxiosResponse<DateObject>> => {
  try {
    return await apiClient.patch<DateObject>(`/dates/${dateId}`, payload);
  } catch (e) {
    throw e;
  }
};

export const cancelDate = async (dateId: string): Promise<AxiosResponse<DateObject>> => {
  try {
    return await apiClient.patch<DateObject>(`/dates/${dateId}/cancel`, {});
  } catch (e) {
    throw e;
  }
};

export const getDateByUserFromUserToAndDate = async (
  userFrom: string,
  userTo: string,
  date: string
): Promise<AxiosResponse<DateObject | null>> => {
  try {
    return await apiClient.get<DateObject>(`/date/${userFrom}/${userTo}/${date}`);
  } catch (e: any) {
    if (axios.isAxiosError(e) && e.response?.status === 404)
      return { ...e.response, status: 404, data: null } as AxiosResponse<DateObject | null>;
    throw e;
  }
};

export const createAttraction = async (
  payload: Omit<CreateAttractionPayload, 'userFrom'>
): Promise<AxiosResponse<AttractionResponse>> => {
  try {
    return await apiClient.post<AttractionResponse>(`/attraction`, payload);
  } catch (e) {
    throw e;
  }
};

export const getAttractionByUserFromUserToAndDate = async (
  userFromId: string,
  userToId: string,
  date: string
): Promise<AxiosResponse<AttractionResponse | null>> => {
  try {
    return await apiClient.get<AttractionResponse>(`/attraction/${userFromId}/${userToId}/${date}`);
  } catch (e: any) {
    if (axios.isAxiosError(e) && e.response?.status === 404)
      return { ...e.response, status: 404, data: null } as AxiosResponse<AttractionResponse | null>;
    throw e;
  }
};

export const uploadProfilePicture = async (
  formData: FormData
): Promise<AxiosResponse<{ message: string; profilePictureUrl: string; user: User }>> => {
  try {
    return await apiClient.post(`/users/profilePicture`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    });
  } catch (e) {
    throw e;
  }
};

export const uploadHomepageVideo = async (
  formData: FormData,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
): Promise<AxiosResponse<{ message: string; videoUrl: string; vimeoUri?: string; user: User }>> => {
  try {
    return await apiClient.post(`/users/homePageVideo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
      onUploadProgress,
    });
  } catch (e) {
    throw e;
  }
};

export const uploadCalendarVideo = async (
  formData: FormData,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
): Promise<AxiosResponse<{ message: string; videoUrl: string; vimeoUri?: string }>> => {
  try {
    return await apiClient.post(`/users/calendarVideos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
      onUploadProgress,
    });
  } catch (e) {
    throw e;
  }
};

export const getPlayableVideoUrl = async (identifier: {
  vimeoUri?: string | null;
  calendarId?: number | null;
}): Promise<AxiosResponse<{ playableUrl: string | null; message?: string }>> => {
  const params = new URLSearchParams();
  if (identifier.vimeoUri) params.append('uri', identifier.vimeoUri);
  else if (identifier.calendarId) params.append('calendarId', String(identifier.calendarId));
  try {
    return await apiClient.get<{ playableUrl: string | null; message?: string }>(
      `/videos/playable-url?${params.toString()}`
    );
  } catch (e: any) {
    if (axios.isAxiosError(e) && e.response?.status === 404)
      return {
        ...e.response,
        status: 404,
        data: { playableUrl: null, message: 'Video not found' },
      } as AxiosResponse<{ playableUrl: string | null; message?: string }>;
    throw e;
  }
};

export const getUpcomingDates = async (): Promise<AxiosResponse<UpcomingDate[]>> => {
  try {
    return await apiClient.get<UpcomingDate[]>(`/dates/me/upcoming`);
  } catch (e) {
    throw e;
  }
};
