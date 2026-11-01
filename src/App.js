import React, { useState } from "react";
import { NavigationProvider } from "./navigation";
import HomeScreen from "./screens/HomeScreen";
import ClothingScreen from "./screens/ClothingScreen";
import NotesScreen from "./screens/NotesScreen";
import HabitsScreen from "./screens/HabitsScreen";
import PlanningScreen from "./screens/PlanningScreen";

const screens = {
  home: HomeScreen,
  clothing: ClothingScreen,
  notes: NotesScreen,
  habits: HabitsScreen,
  planning: PlanningScreen,
};

export default function App() {
  const [page, setPage] = useState("home");
  const Screen = screens[page] || HomeScreen;

  return (
    <NavigationProvider navigate={setPage}>
      <Screen />
    </NavigationProvider>
  );
}
