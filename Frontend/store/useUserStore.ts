// File: store/useUserStore.ts
// ✅ 100% COMPLETE AND FINAL CORRECTED CODE

import { create } from 'zustand';
import { User } from '../types/User';
import { getUserById, getUserTokenBalance as fetchTokenBalanceApi } from '../api/api';

// 1. Define the state structure
interface UserState {
  userProfile: User | null;
  tokenBalance: number | null;
  isLoggedIn: boolean; // Flag to track login status
  isFetchingTokenBalance: boolean;
  isFetchingUserProfile: boolean;
  profileJustCompletedForNav: boolean;
  showThankYouAfterAuth: boolean;

  setUserProfile: (profile: User | null) => void;
  updateUserProfileOptimistic: (updates: Partial<User>) => void;
  clearUserProfile: () => void;
  setTokenBalance: (balance: number | null) => void;
  setIsFetchingTokenBalance: (isFetching: boolean) => void;
  setIsFetchingUserProfile: (isFetching: boolean) => void;
  setProfileJustCompletedForNav: (isCompleted: boolean) => void;
  setShowThankYouAfterAuth: (show: boolean) => void;
  clearShowThankYouAfterAuth: () => void; // ✅ NEW: Action to explicitly clear this flag
}

// 2. Create the store
export const useUserStore = create<UserState>((set) => ({
  // --- Initial State ---
  userProfile: null,
  tokenBalance: null,
  isLoggedIn: false, // Default to false
  isFetchingTokenBalance: false,
  isFetchingUserProfile: false,
  profileJustCompletedForNav: false,
  showThankYouAfterAuth: false,

  // --- Actions ---
  setUserProfile: (profile) => {
    console.log('useUserStore: Setting userProfile:', profile ? `ID: ${profile.userId}` : 'null');
    if (profile) {
      set({
        userProfile: profile,
        isLoggedIn: true, // Set isLoggedIn to true on setting a profile
        isFetchingUserProfile: false,
        tokenBalance: typeof profile.tokens === 'number' ? profile.tokens : null,
      });
      if (typeof profile.tokens === 'number') {
        console.log(
          `useUserStore: Initial tokenBalance set from profile.tokens: ${profile.tokens}`
        );
      }
    } else {
      // If profile is null, this is a part of logout/error flow, clear everything
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

  // This function is called on logout. It must reset EVERYTHING to its initial state.
  clearUserProfile: () => {
    console.log('useUserStore: Clearing all user state and setting isLoggedIn to false.');
    set({
      userProfile: null,
      tokenBalance: null,
      isLoggedIn: false, // Explicitly set to false
      isFetchingTokenBalance: false,
      isFetchingUserProfile: false,
      profileJustCompletedForNav: false,
      showThankYouAfterAuth: false, // Ensure this is also reset on full logout
    });
  },

  setTokenBalance: (balance) => set({ tokenBalance: balance }),
  setIsFetchingTokenBalance: (isFetching) => set({ isFetchingTokenBalance: isFetching }),
  setIsFetchingUserProfile: (isFetching) => set({ isFetchingUserProfile: isFetching }),
  setProfileJustCompletedForNav: (isCompleted) => set({ profileJustCompletedForNav: isCompleted }),
  setShowThankYouAfterAuth: (show) => set({ showThankYouAfterAuth: show }),
  // ✅ NEW ACTION: Resets only the showThankYouAfterAuth flag
  clearShowThankYouAfterAuth: () => {
    console.log('useUserStore: Clearing showThankYouAfterAuth flag.');
    set({ showThankYouAfterAuth: false });
  },
}));

// --- Helper Functions to interact with the store ---

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
    // On critical error, also clear the profile to prevent using stale data
    useUserStore.getState().setUserProfile(null);
    throw error;
  } finally {
    setIsFetchingUserProfile(false);
  }
};

export const fetchAndUpdateTokenBalance = async (): Promise<number | null> => {
  const { userProfile, setIsFetchingTokenBalance, setTokenBalance, isFetchingTokenBalance } =
    useUserStore.getState();

  if (!userProfile?.userId) {
    return null;
  }
  if (isFetchingTokenBalance) {
    return useUserStore.getState().tokenBalance;
  }

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
