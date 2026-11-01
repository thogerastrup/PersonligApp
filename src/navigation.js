import React, { createContext, useContext } from "react";

const NavigationContext = createContext(null);

export function NavigationProvider({ children, navigate }) {
  return (
    <NavigationContext.Provider value={{ navigate, goHome: () => navigate("home") }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const navigation = useContext(NavigationContext);
  if (!navigation) throw new Error("useNavigation must be used inside NavigationProvider");
  return navigation;
}
