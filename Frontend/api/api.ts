// File: api/api.ts
// ✅ COMPLETE AND FINAL UPDATED CODE (with explicit header control)

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

/**
 * ✅ NEW: Explicitly sets or removes the Authorization header.
 * This is crucial for robustly handling login and logout state changes.
 * @param token The bearer token, or null to remove the header.
 */
export const setApiClientAuthHeader = (token: string | null) => {
  if (token) {
    console.log('[API] Setting Axios auth header.');
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    console.log('[API] Clearing Axios auth header.');
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

/**
 * Configures an interceptor to transparently handle token fetching/refreshing for API calls.
 * This works alongside the explicit `setApiClientAuthHeader` function.
 */
export const configureApiClient = (getAccessTokenFunc: GetAccessTokenFunc) => {
  console.log('[API] Configuring Axios interceptor with token provider.');
  apiClient.interceptors.request.use(
    async (config) => {
      // If a header is not already set, try to get one.
      // This is useful for token refreshes.
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

const handleApiError = (error: unknown, context: string): void => {
  let message = 'An unknown error occurred.';
  if (axios.isAxiosError(error)) message = error.response?.data?.message || error.message;
  else if (error instanceof Error) message = error.message;
  const newError = new Error(`API call "${context}" failed: ${message}`);
  (newError as any).originalError = error;
  throw newError;
};

// ✅ ================== NAYI API FUNCTION ==================
export const addDateFeedback = async (
  dateId: number,
  payload: { outcome: DateOutcome; notes?: string }
): Promise<AxiosResponse<DateObject>> => {
  try {
    return await apiClient.patch<DateObject>(`/dates/${dateId}/feedback`, payload);
  } catch (e) {
    handleApiError(e, `addDateFeedback (ID: ${dateId})`);
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
    handleApiError(e, 'createUser');
    throw e;
  }
};

export const getUserById = async (userId: string): Promise<AxiosResponse<User | null>> => {
  try {
    return await apiClient.get<User>(`/users/${userId}`);
  } catch (e: any) {
    if (axios.isAxiosError(e) && e.response?.status === 404)
      return { ...e.response, status: 404, data: null } as AxiosResponse<User | null>;
    handleApiError(e, `getUserById (ID: ${userId})`);
    throw e;
  }
};

export const updateUser = async (updateData: Partial<User>): Promise<AxiosResponse<User>> => {
  try {
    return await apiClient.patch<User>(`/users`, updateData);
  } catch (e) {
    handleApiError(e, 'updateUser');
    throw e;
  }
};

// --- NOTIFICATION API ---
export const getMyNotifications = async (): Promise<AxiosResponse<Notification[]>> => {
  try {
    return await apiClient.get<Notification[]>(`/notifications`);
  } catch (e) {
    handleApiError(e, 'getMyNotifications');
    throw e;
  }
};

export const getUnreadNotificationsCount = async (): Promise<
  AxiosResponse<UnreadCountResponse>
> => {
  try {
    return await apiClient.get<UnreadCountResponse>(`/notifications/unread-count`);
  } catch (e) {
    handleApiError(e, 'getUnreadNotificationsCount');
    throw e;
  }
};

export const markNotificationsAsRead = async (): Promise<AxiosResponse<{ message: string }>> => {
  try {
    return await apiClient.post(`/notifications/mark-as-read`);
  } catch (e) {
    handleApiError(e, 'markNotificationsAsRead');
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
    handleApiError(e, 'registerPushToken');
    throw e;
  }
};

// --- TOKEN & TRANSACTION API ---
export const getUserTokenBalance = async (): Promise<AxiosResponse<{ tokenBalance: number }>> => {
  try {
    return await apiClient.get<{ tokenBalance: number }>(`/users/tokens`);
  } catch (e) {
    handleApiError(e, 'getUserTokenBalance');
    throw e;
  }
};

// --- (Rest of the functions are here) ---
export const purchaseTokens = async (payload: {
  tokenAmount: number;
  description: string;
  amountUsd?: number;
}): Promise<AxiosResponse<{ transaction?: BackendTransactionType; newTokenBalance: number }>> => {
  try {
    return await apiClient.post(`/transactions/purchase`, payload);
  } catch (e) {
    handleApiError(e, 'purchaseTokens');
    throw e;
  }
};
export const getCalendarDaysByUserId = async (): Promise<AxiosResponse<CalendarDay[]>> => {
  try {
    return await apiClient.get<CalendarDay[]>(`/calendarDays/user`);
  } catch (e) {
    handleApiError(e, 'getCalendarDaysByUserId');
    throw e;
  }
};
export const getStoriesByDate = async (
  date: string
): Promise<AxiosResponse<BackendStoryItem[]>> => {
  try {
    return await apiClient.get<BackendStoryItem[]>(`/stories/${date}`);
  } catch (e) {
    handleApiError(e, `getStoriesByDate (date: ${date})`);
    throw e;
  }
};
export const createDate = async (
  payload: CreateDatePayload
): Promise<AxiosResponse<DateObject>> => {
  try {
    return await apiClient.post<DateObject>(`/date`, payload);
  } catch (e) {
    handleApiError(e, 'createDate (Planned Event)');
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
    handleApiError(e, `getDateById (ID: ${dateId})`);
    throw e;
  }
};
// ✅ MODIFIED: This function is now more generic for updates and rescheduling.
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
    handleApiError(e, `updateDate (ID: ${dateId})`);
    throw e;
  }
};

// ✅ NEW: Function to cancel a date.
export const cancelDate = async (dateId: string): Promise<AxiosResponse<DateObject>> => {
  try {
    // The endpoint is .../cancel, so we don't need a payload.
    return await apiClient.patch<DateObject>(`/dates/${dateId}/cancel`, {});
  } catch (e) {
    handleApiError(e, `cancelDate (ID: ${dateId})`);
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
    handleApiError(e, `getDateByUserFromUserToAndDate`);
    throw e;
  }
};
export const createAttraction = async (
  payload: Omit<CreateAttractionPayload, 'userFrom'>
): Promise<AxiosResponse<AttractionResponse>> => {
  try {
    return await apiClient.post<AttractionResponse>(`/attraction`, payload);
  } catch (e) {
    handleApiError(e, 'createAttraction');
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
    handleApiError(e, `getAttractionByUserFromUserToAndDate`);
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
    handleApiError(e, 'uploadProfilePicture');
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
    handleApiError(e, 'uploadHomepageVideo');
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
    handleApiError(e, 'uploadCalendarVideo');
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
    handleApiError(e, 'getPlayableVideoUrl');
    throw e;
  }
};

export const getUpcomingDates = async (): Promise<AxiosResponse<UpcomingDate[]>> => {
  try {
    return await apiClient.get<UpcomingDate[]>(`/dates/me/upcoming`);
  } catch (e) {
    handleApiError(e, 'getUpcomingDates');
    throw e;
  }
};
