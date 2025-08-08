// File: contexts/AuthContext.tsx
// ✅ THIS CODE IS CORRECT AND REQUIRES NO CHANGES.

import 'react-native-get-random-values';
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { Platform } from 'react-native';
import { getItemAsync, setItemAsync, deleteItemAsync } from 'expo-secure-store';
import { useUserStore } from '../store/useUserStore';
import {
  configureApiClient,
  setApiClientAuthHeader,
  GetAccessTokenFunc,
  registerPushToken,
} from '../api/api';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import axios from 'axios';
import messaging from '@react-native-firebase/messaging';

interface SessionData {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}
const auth0Domain = 'dev-il3jgemg2szpurs5.us.auth0.com';
const auth0ClientId = 'B2VXJNJdOzT0AXuZOsBDHgGUc3QvtaER';
const AUTH_SESSION_KEY = 'daytzFinalAuthSession_v1';
const apiAudience = 'https://api.daytz.app/v1';

const getApiBaseUrl = (): string => {
  // Using production URL from Railway.app
  const envApiUrl = 'https://backend-production-7442.up.railway.app/api';
  if (envApiUrl) return envApiUrl;
  // Fallback for local development (not typically used with production backend)
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000/api';
  return 'http://localhost:3000/api';
};
const API_BASE_URL = getApiBaseUrl();
console.log('✅ API: Final API_BASE_URL is:', API_BASE_URL);

WebBrowser.maybeCompleteAuthSession();

interface AuthContextData {
  auth0User: any | null;
  isReady: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextData>({
  auth0User: null,
  isReady: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const discovery = AuthSession.useAutoDiscovery(`https://${auth0Domain}`);
  const [auth0User, setAuth0User] = useState<any | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const processedCodeRef = useRef<string | null>(null);

  const { clearUserProfile, setShowThankYouAfterAuth, setShowWelcomeVideo, setUserProfile } =
    useUserStore();

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'com.daytz.app', path: 'callback' });
  const getAccessTokenRef = useRef<GetAccessTokenFunc>(async () => undefined);
  const hasRegisteredToken = useRef(false);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: auth0ClientId,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: { audience: apiAudience },
    },
    discovery
  );

  const performLogoutCleanup = useCallback(
    async (initiator?: string) => {
      console.log(`AuthContext: Local logout initiated. Reason: ${initiator || 'N/A'}`);
      hasRegisteredToken.current = false;
      setAuth0User(null);
      setSession(null);
      setApiClientAuthHeader(null);
      clearUserProfile();
      await deleteItemAsync(AUTH_SESSION_KEY);
    },
    [clearUserProfile]
  );

  const checkAndSetupDbProfile = useCallback(
    async (
      auth0UserInfo: any,
      accessToken: string
    ): Promise<{ success: boolean; isNewUser: boolean }> => {
      const tempApiClient = axios.create({
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 20000,
      });
      try {
        console.log(`[Auth] Checking DB for user: ${auth0UserInfo.sub}`);
        const response = await tempApiClient.get(`/users/${auth0UserInfo.sub}`);
        console.log(`[Auth] User found in DB. Setting profile.`);
        setUserProfile(response.data);
        return { success: true, isNewUser: false };
      } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.log(`[Auth] User not in DB. Creating new user profile...`);
          try {
            const newUserPayload = {
              userId: auth0UserInfo.sub,
              firstName: auth0UserInfo.given_name || auth0UserInfo.name || 'New',
              lastName: auth0UserInfo.family_name || 'User',
              profilePictureUrl: auth0UserInfo.picture || null,
              email: auth0UserInfo.email,
            };
            const createResponse = await tempApiClient.post('/users', newUserPayload);
            setUserProfile(createResponse.data);
            return { success: true, isNewUser: true };
          } catch (createError) {
            console.error('[Auth] CRITICAL: Failed to create user in DB after 404:', createError);
            return { success: false, isNewUser: false };
          }
        }
        console.error(
          '[Auth] CRITICAL: Failed to check/setup DB profile due to a non-404 error:',
          error
        );
        return { success: false, isNewUser: false };
      }
    },
    [setUserProfile]
  );

  const getAccessToken = useCallback(async (): Promise<string | undefined> => {
    let currentSession: SessionData | null = null;
    setSession((s) => {
      currentSession = s;
      return s;
    });
    if (!currentSession) return undefined;
    if (Date.now() < currentSession.expiresAt - 60000) {
      return currentSession.accessToken;
    }
    if (!currentSession.refreshToken) {
      await performLogoutCleanup('no_refresh_token');
      return undefined;
    }
    try {
      if (!discovery) throw new Error('Discovery document not available for refresh.');
      const refreshedCreds = await AuthSession.refreshAsync(
        { clientId: auth0ClientId, refreshToken: currentSession.refreshToken },
        discovery
      );
      const expiresAt = (refreshedCreds.issuedAt + (refreshedCreds.expiresIn || 0)) * 1000;
      const newSession: SessionData = {
        accessToken: refreshedCreds.accessToken,
        refreshToken: refreshedCreds.refreshToken || currentSession.refreshToken,
        expiresAt,
      };
      await setItemAsync(AUTH_SESSION_KEY, JSON.stringify(newSession));
      setApiClientAuthHeader(newSession.accessToken);
      setSession(newSession);
      return newSession.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await performLogoutCleanup('refresh_failed');
      return undefined;
    }
  }, [discovery, performLogoutCleanup]);

  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  }, [getAccessToken]);

  useEffect(() => {
    console.log('[API] Configuring Axios interceptor with token provider.');
    configureApiClient(() => getAccessTokenRef.current());
  }, []);

  const setAuthenticatedSession = useCallback(
    async (creds: AuthSession.TokenResponseConfig) => {
      setIsLoading(true);
      try {
        if (!creds.accessToken || !discovery?.userInfoEndpoint)
          throw new Error('Token or user info endpoint not found after authentication.');

        const userInfoResponse = await fetch(discovery.userInfoEndpoint, {
          headers: { Authorization: `Bearer ${creds.accessToken}` },
        });
        if (!userInfoResponse.ok) throw new Error('Failed to fetch user info from Auth0.');
        const userInfo = await userInfoResponse.json();

        const profileResult = await checkAndSetupDbProfile(userInfo, creds.accessToken);

        if (profileResult.success) {
          const expiresAt = (creds.issuedAt + (creds.expiresIn || 0)) * 1000;
          const newSession: SessionData = {
            accessToken: creds.accessToken,
            refreshToken: creds.refreshToken || null,
            expiresAt,
          };
          await setItemAsync(AUTH_SESSION_KEY, JSON.stringify(newSession));
          setApiClientAuthHeader(newSession.accessToken);
          setSession(newSession);
          setAuth0User(userInfo);

          if (profileResult.isNewUser) {
            setShowWelcomeVideo(true);
            setShowThankYouAfterAuth(false);
          } else {
            setShowWelcomeVideo(false);
            setShowThankYouAfterAuth(true);
          }
          setIsReady(true);
        } else {
          console.error(
            '[Auth] DB profile setup failed. Forcing logout to prevent inconsistent state.'
          );
          await performLogoutCleanup('db_setup_failed');
          setIsReady(true);
        }
      } catch (error) {
        console.error('Error setting authenticated session:', error);
        await performLogoutCleanup('setAuthenticatedSession_failure');
        setIsReady(true);
      } finally {
        setIsLoading(false);
      }
    },
    [
      discovery,
      checkAndSetupDbProfile,
      performLogoutCleanup,
      setShowThankYouAfterAuth,
      setShowWelcomeVideo,
    ]
  );

  useEffect(() => {
    if (
      response?.type === 'success' &&
      response.params.code &&
      request?.codeVerifier &&
      response.params.code !== processedCodeRef.current
    ) {
      processedCodeRef.current = response.params.code;
      if (!discovery) return;
      AuthSession.exchangeCodeAsync(
        {
          clientId: auth0ClientId,
          code: response.params.code,
          redirectUri,
          extraParams: { code_verifier: request.codeVerifier },
        },
        discovery
      )
        .then(setAuthenticatedSession)
        .catch((e) => {
          console.error('Token exchange fail:', e);
          setIsLoading(false);
          setIsReady(true);
        });
    } else if (response?.type === 'error') {
      console.error('AuthSession error:', response.error);
      setIsLoading(false);
      setIsReady(true);
    }
  }, [response, request, discovery, redirectUri, setAuthenticatedSession]);

  useEffect(() => {
    if (!discovery) return;
    const loadAuthData = async () => {
      setIsLoading(true);
      try {
        const sessionJson = await getItemAsync(AUTH_SESSION_KEY);
        if (!sessionJson) throw new Error('No session stored.');
        let currentSession: SessionData = JSON.parse(sessionJson);
        if (Date.now() >= currentSession.expiresAt - 60000) {
          if (!currentSession.refreshToken) throw new Error('Session expired, no refresh token.');
          const refreshed = await AuthSession.refreshAsync(
            { clientId: auth0ClientId, refreshToken: currentSession.refreshToken },
            discovery
          );
          currentSession = {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken || currentSession.refreshToken,
            expiresAt: (refreshed.issuedAt + (refreshed.expiresIn || 0)) * 1000,
          };
          await setItemAsync(AUTH_SESSION_KEY, JSON.stringify(currentSession));
        }

        setApiClientAuthHeader(currentSession.accessToken);
        setSession(currentSession);
        const userInfoRes = await fetch(discovery.userInfoEndpoint!, {
          headers: { Authorization: `Bearer ${currentSession.accessToken}` },
        });
        if (!userInfoRes.ok) throw new Error('User info fetch failed on load.');
        const userInfo = await userInfoRes.json();
        const dbProfileResult = await checkAndSetupDbProfile(userInfo, currentSession.accessToken);

        if (dbProfileResult.success) {
          setAuth0User(userInfo);
          setShowWelcomeVideo(false);
        } else {
          throw new Error('DB profile setup failed on load.');
        }
      } catch (error) {
        console.log(
          `Initial auth load failed: ${error instanceof Error ? error.message : String(error)}`
        );
        await performLogoutCleanup('initial_load_exception');
      } finally {
        setIsLoading(false);
        setIsReady(true);
      }
    };
    loadAuthData();
  }, [
    discovery,
    checkAndSetupDbProfile,
    performLogoutCleanup,
    setUserProfile,
    setShowWelcomeVideo,
  ]);

  useEffect(() => {
    const setupPushNotifications = async () => {
      try {
        await messaging().requestPermission();
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          console.log('[FCM] Device Token:', fcmToken);
          await registerPushToken(fcmToken);
          console.log('[FCM] Token successfully registered with backend.');
          hasRegisteredToken.current = true;
        }
      } catch (error) {
        console.error('[FCM] Failed to setup push notifications:', error);
      }
    };
    if (isReady && auth0User && !hasRegisteredToken.current) {
      console.log('[AuthContext] User is authenticated and ready. Setting up push notifications.');
      setupPushNotifications();
    }
  }, [isReady, auth0User]);

  const login = useCallback(async () => {
    if (isLoading || !request) return;
    await promptAsync();
  }, [isLoading, request, promptAsync]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    const returnTo = AuthSession.makeRedirectUri({
      scheme: 'com.daytz.app',
      path: 'logout-complete',
    });
    const logoutUrl = `https://${auth0Domain}/v2/logout?client_id=${auth0ClientId}&returnTo=${encodeURIComponent(returnTo)}`;
    try {
      if (session?.accessToken && discovery) {
        await AuthSession.revokeAsync(
          { token: session.accessToken, clientId: auth0ClientId },
          discovery
        );
      }
      await WebBrowser.openAuthSessionAsync(logoutUrl, returnTo);
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      await performLogoutCleanup('logout_end_process');
      setIsReady(true);
      setIsLoading(false);
    }
  }, [session, discovery, performLogoutCleanup]);

  const contextValue = useMemo(
    () => ({ auth0User, isLoading, isReady, login, logout }),
    [auth0User, isLoading, isReady, login, logout]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
