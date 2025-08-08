// File: store/useUserStore.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import { create } from 'zustand';
import { User } from '../types/User';
import { getUserById, getUserTokenBalance as fetchTokenBalanceApi } from '../api/api';

// 1. Define the state structure
interface UserState {
  userProfile: User | null;
  tokenBalance: number | null;
  isLoggedIn: boolean;
  isFetchingTokenBalance: boolean;
  isFetchingUserProfile: boolean;
  profileJustCompletedForNav: boolean;
  showThankYouAfterAuth: boolean;
  showWelcomeVideo: boolean;
  // ✅ NAYI STATE: Yeh yaad rakhegi ki kya user ko edit mode mein force kiya ja chuka hai.
  hasBeenForcedToProfileEdit: boolean;

  setUserProfile: (profile: User | null) => void;
  updateUserProfileOptimistic: (updates: Partial<User>) => void;
  clearUserProfile: () => void;
  setTokenBalance: (balance: number | null) => void;
  setIsFetchingTokenBalance: (isFetching: boolean) => void;
  setIsFetchingUserProfile: (isFetching: boolean) => void;
  setProfileJustCompletedForNav: (isCompleted: boolean) => void;
  setShowThankYouAfterAuth: (show: boolean) => void;
  clearShowThankYouAfterAuth: () => void;
  setShowWelcomeVideo: (show: boolean) => void;
  // ✅ NAYA SETTER
  setHasBeenForcedToProfileEdit: (hasBeenForced: boolean) => void;
}

// 2. Create the store
export const useUserStore = create<UserState>((set) => ({
  // --- Initial State ---
  userProfile: null,
  tokenBalance: null,
  isLoggedIn: false,
  isFetchingTokenBalance: false,
  isFetchingUserProfile: false,
  profileJustCompletedForNav: false,
  showThankYouAfterAuth: false,
  showWelcomeVideo: false,
  hasBeenForcedToProfileEdit: false, // ✅ Default value

  // --- Actions ---
  setUserProfile: (profile) => {
    console.log('useUserStore: Setting userProfile:', profile ? `ID: ${profile.userId}` : 'null');
    if (profile) {
      set({
        userProfile: profile,
        isLoggedIn: true,
        isFetchingUserProfile: false,
        tokenBalance: typeof profile.tokens === 'number' ? profile.tokens : null,
      });
      if (typeof profile.tokens === 'number') {
        console.log(
          `useUserStore: Initial tokenBalance set from profile.tokens: ${profile.tokens}`
        );
      }
    } else {
      set({
        userProfile: null,
        tokenBalance: null,
        isLoggedIn: false,
        isFetchingUserProfile: false,
      });
    }
  },

  updateUserProfileOptimistic: (updates) => {
    set((state) => {
      if (!state.userProfile) return {};
      return { userProfile: { ...state.userProfile, ...updates } };
    });
  },

  clearUserProfile: () => {
    console.log('useUserStore: Clearing all user state and setting isLoggedIn to false.');
    set({
      userProfile: null,
      tokenBalance: null,
      isLoggedIn: false,
      isFetchingTokenBalance: false,
      isFetchingUserProfile: false,
      profileJustCompletedForNav: false,
      showThankYouAfterAuth: false,
      showWelcomeVideo: false,
      hasBeenForcedToProfileEdit: false, // ✅ Logout par reset karein
    });
  },

  setTokenBalance: (balance) => set({ tokenBalance: balance }),
  setIsFetchingTokenBalance: (isFetching) => set({ isFetchingTokenBalance: isFetching }),
  setIsFetchingUserProfile: (isFetching) => set({ isFetchingUserProfile: isFetching }),
  setProfileJustCompletedForNav: (isCompleted) => set({ profileJustCompletedForNav: isCompleted }),
  setShowThankYouAfterAuth: (show) => set({ showThankYouAfterAuth: show }),
  clearShowThankYouAfterAuth: () => {
    console.log('useUserStore: Clearing showThankYouAfterAuth flag.');
    set({ showThankYouAfterAuth: false });
  },
  setShowWelcomeVideo: (show) => set({ showWelcomeVideo: show }),
  // ✅ NAYA SETTER FUNCTION
  setHasBeenForcedToProfileEdit: (hasBeenForced) =>
    set({ hasBeenForcedToProfileEdit: hasBeenForced }),
}));

// --- Helper Functions (No changes needed here) ---

export const fetchAndSetUserProfile = async (userId: string): Promise<User | null> => {
  const { isFetchingUserProfile, setIsFetchingUserProfile, setUserProfile } =
    useUserStore.getState();
  if (isFetchingUserProfile) {
    console.log('fetchAndSetUserProfile: Already fetching profile. Aborting.');
    return useUserStore.getState().userProfile;
  }
  setIsFetchingUserProfile(true);
  try {
    const response = await getUserById(userId);
    if (response.data) {
      console.log(`fetchAndSetUserProfile: API Success for ${userId}. Updating store.`);
      setUserProfile(response.data);
      return response.data;
    } else if (response.status === 404) {
      console.log(`fetchAndSetUserProfile: User ${userId} not found (404). Clearing profile.`);
      setUserProfile(null);
      return null;
    } else {
      throw new Error(`Failed to fetch user profile. Status: ${response.status}`);
    }
  } catch (error: any) {
    console.error(`fetchAndSetUserProfile: CRITICAL Error for ${userId}:`, error.message);
    useUserStore.getState().setUserProfile(null);
    throw error;
  } finally {
    setIsFetchingUserProfile(false);
  }
};

export const fetchAndUpdateTokenBalance = async (): Promise<number | null> => {
  const { userProfile, setIsFetchingTokenBalance, setTokenBalance, isFetchingTokenBalance } =
    useUserStore.getState();
  if (!userProfile?.userId) return null;
  if (isFetchingTokenBalance) return useUserStore.getState().tokenBalance;
  setIsFetchingTokenBalance(true);
  try {
    const response = await fetchTokenBalanceApi();
    if (response.data && typeof response.data.tokenBalance === 'number') {
      const newBalance = response.data.tokenBalance;
      setTokenBalance(newBalance);
      return newBalance;
    } else {
      throw new Error('Invalid token balance data from API.');
    }
  } catch (error: any) {
    console.error(`fetchAndUpdateTokenBalance: Error fetching balance:`, error.message);
    throw error;
  } finally {
    setIsFetchingTokenBalance(false);
  }
};
