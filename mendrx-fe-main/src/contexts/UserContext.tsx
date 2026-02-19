"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface UserData {
  email: string;
  type: string;
  credits: number;
  expiry: string;
  parentDTO: Parent | null;
}

interface Parent {
  useParentWhiteLabels: boolean;
  rcaEnabled: boolean;
  supplementsEnabled: boolean;
  dietPlanEnabled: boolean;
  dietVersioningEnabled: boolean;
  supplementsAutoPopulationEnabled: boolean;
  lifestyleRecEnabled: boolean;
  comparisonEnabled: boolean;
  websiteWhiteLabelLogoFileUrl?: string;
  protocolEnabled: boolean;
}

interface UserContextType {
  userData: UserData | null;
  updateUserData: (data: UserData) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);

  const updateUserData = (data: UserData) => {
    setUserData(data);
  };

  return (
    <UserContext.Provider value={{ userData, updateUserData }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserData must be used within a UserProvider");
  }
  return context;
}
