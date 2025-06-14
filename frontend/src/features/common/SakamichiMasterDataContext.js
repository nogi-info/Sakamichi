import React, { createContext, useContext } from "react";
import { useSakamichiMasterData } from "./useSakamichiMasterData";

const SakamichiMasterDataContext = createContext();

export const SakamichiMasterDataProvider = ({ children }) => {
  const value = useSakamichiMasterData();
  return (
    <SakamichiMasterDataContext.Provider value={value}>
      {children}
    </SakamichiMasterDataContext.Provider>
  );
};

export const useSakamichiMasterDataContext = () => useContext(SakamichiMasterDataContext);