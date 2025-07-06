// File: api/api.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import axios, { AxiosInstance, AxiosProgressEvent, AxiosResponse } from 'axios';
import { Platform } from 'react-native';

// Apne sabhi types ko yahan import karein
import { User, CreateUserApiPayload as ActualCreateUserPayloadType } from '../types/User';
import { CalendarDay, StoryQueryResult as BackendStoryItem } from '../types/CalendarDay';
import { DateObject as DateType, CreateDatePayload } from '../types/Date';
import { Transaction as BackendTransactionType } from '../types/Transaction';
import {
  CreateAttraction as CreateAttractionPayload,
  Attraction as AttractionResponse,
} from '../types/Attraction';

// --- Base URL Configuration ---
const getApiBaseUrl = (): string => {
  const envApiUrl = 'http://192.168.1.3:3000/api'; // Development URL
  if (envApiUrl) {
    // console.log(`API: Using URL from environment: ${envApiUrl}`);
    return envApiUrl;
  }
  // Fallback for emulators
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();
console.log(`✅ API: Final API_BASE_URL is: ${API_BASE_URL}`);

// --- Axios Instance and Interceptor Configuration ---
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // 45-second timeout for requests
});

export type GetAccessTokenFunc = () => Promise<string | null | undefined>;

export const configureApiClient = (getAccessTokenFunc: GetAccessTokenFunc) => {
  console.log('[API] Configuring Axios interceptor with token provider.');
  apiClient.interceptors.request.use(
    async (config) => {
      try {
        const token = await getAccessTokenFunc();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('[API Interceptor] CRITICAL: Could not get access token for request.', error);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
};

// --- API Error Handling ---
export const isAuthTokenApiError = (error: any): boolean => {
  const status = error?.response?.status || error?.originalError?.response?.status;
  return status === 401 || status === 403;
};

const handleApiError = (error: unknown, context: string): void => {
  let message = 'An unknown error occurred.';
  let status = 'N/A';

  if (axios.isAxiosError(error)) {
    status = String(error.response?.status || 'Network/Timeout');
    message = error.response?.data?.message || error.message;
    console.error(`API Error in [${context}] (${status}): ${message}`);
  } else if (error instanceof Error) {
    message = error.message;
    console.error(`Generic Error in [${context}]: ${message}`);
  } else {
    console.error(`Unknown Error Type in [${context}]:`, error);
  }

  const newError = new Error(`API call "${context}" failed: ${message}`);
  (newError as any).originalError = error; // Preserve original error
  throw newError;
};

// --- API Functions ---

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

// --- CALENDAR DAY & STORIES API ---
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

// --- PLANNED DATE API ---
export const createDate = async (payload: CreateDatePayload): Promise<AxiosResponse<DateType>> => {
  try {
    return await apiClient.post<DateType>(`/date`, payload);
  } catch (e) {
    handleApiError(e, 'createDate (Planned Event)');
    throw e;
  }
};

export const getDateByUserFromUserToAndDate = async (
  userFrom: string,
  userTo: string,
  date: string
): Promise<AxiosResponse<DateType | null>> => {
  try {
    return await apiClient.get<DateType>(`/date/${userFrom}/${userTo}/${date}`);
  } catch (e: any) {
    if (axios.isAxiosError(e) && e.response?.status === 404)
      return { ...e.response, status: 404, data: null } as AxiosResponse<DateType | null>;
    handleApiError(e, `getDateByUserFromUserToAndDate`);
    throw e;
  }
};

// --- ATTRACTION API ---
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

// --- FILE UPLOAD API ---
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

// --- PLAYABLE VIDEO URL API ---
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
