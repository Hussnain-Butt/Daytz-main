import React, {createContext, useContext, useState} from 'react';
import {User} from '../types/User';

interface UserContextType {
  accessToken: string | null;
  userProfile: User | null;
  setAccessToken: (token: string) => void;
  setUserProfile: (profile: User) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  const logout = () => {
    setAccessToken(null);
    setUserProfile(null);
  };

  return (
    <UserContext.Provider
      value={{
        accessToken,
        userProfile,
        setAccessToken,
        setUserProfile,
        logout,
      }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}; 