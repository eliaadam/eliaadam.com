import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./components/context/Authcontext";
import { ThemeProvider } from "./components/context/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/layout/Dashboardlayout";
import { Signin } from "./page/Signin";
import { Signup } from "./page/Signup";
import { Recent } from "./page/dashboard/Recent";
import { Profile } from "./page/dashboard/Profile";
import { queryClient } from "./lib/query/Queryclient";
import Home from "./page/Home";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/signin" element={<Signin />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Recent />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
