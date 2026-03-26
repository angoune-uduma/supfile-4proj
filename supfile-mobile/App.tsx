import React from "react";
import { AuthProvider } from "./src/store/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}