import "./App.css";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./components/context/Authcontext";
import { ThemeProvider, ThemeToggle } from "./components/context/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/layout/Dashboardlayout";
import { Signin } from "./page/Signin";
import { Signup } from "./page/Signup";
import { Recent } from "./page/dashboard/Recent";
import { Profile } from "./page/dashboard/Profile";
import { queryClient } from "./lib/query/Queryclient";

const domains = [
  "Container",
  "Authority",
  "Registry",
  "Capability",
  "Ownership",
];

function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-sm font-semibold tracking-tight">Maicore</span>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex max-w-2xl flex-col items-start px-6 pt-16 pb-24 sm:pt-24">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          One platform, built domain by domain.
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-400">
          Containers, authorization, and a shared catalogue — designed as
          separate, well-defined pieces instead of one sprawling application.
        </p>

        <div className="mt-9 flex items-center gap-3">
          <Link
            to="/signup"
            className="rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400"
          >
            Create account
          </Link>
          <Link
            to="/signin"
            className="rounded-md px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Sign in
          </Link>
        </div>

        <ul className="mt-16 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-500">
          {domains.map((domain) => (
            <li key={domain}>{domain}</li>
          ))}
        </ul>
      </main>
    </div>
  );
}

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
