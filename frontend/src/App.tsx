import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { TargetCursor } from './components/TargetCursor';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResumeUploadPage } from './pages/ResumeUploadPage';
import { AtsCheckerPage } from './pages/AtsCheckerPage';
import { InterviewSetupPage } from './pages/InterviewSetupPage';
import { DeviceCheckPage } from './pages/DeviceCheckPage';
import { InterviewRoomPage } from './pages/InterviewRoomPage';
import { InterviewResultsPage } from './pages/InterviewResultsPage';
import { InterviewHistoryPage } from './pages/InterviewHistoryPage';
import { PracticePage } from './pages/PracticePage';

/* ── Route guard ───────────────────────────────────────────── */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm"
        style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)' }}
      >
        Authenticating session…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/* ── Public shell (dark, original style) ──────────────────── */
const PublicShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
    <Navbar />
    <main className="flex-1">{children}</main>
  </div>
);

/* ── App shell: 3-column card layout ──────────────────────── */
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-shell">
      <div className="app-card">
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
        {/* Right panel is only rendered on the dashboard — other pages fill 2 columns */}
      </div>
    </div>
  );
};

/* ── Interview room uses its own full-screen layout ────────── */
const FullScreenShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="min-h-screen flex flex-col font-sans"
    style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
  >
    {children}
  </div>
);

/* ── Inner router (needs access to location) ───────────────── */
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes – dark shell */}
      <Route path="/" element={<PublicShell><LandingPage /></PublicShell>} />
      <Route path="/login" element={<PublicShell><LoginPage /></PublicShell>} />
      <Route path="/register" element={<PublicShell><RegisterPage /></PublicShell>} />

      {/* Full-screen routes (interview room & device check) */}
      <Route
        path="/device-check"
        element={
          <ProtectedRoute>
            <FullScreenShell><DeviceCheckPage /></FullScreenShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:sessionId"
        element={
          <ProtectedRoute>
            <FullScreenShell><InterviewRoomPage /></FullScreenShell>
          </ProtectedRoute>
        }
      />

      {/* App shell routes (sidebar + main) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell><DashboardPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppShell><ProfilePage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/resumes"
        element={
          <ProtectedRoute>
            <AppShell><ResumeUploadPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ats-checker"
        element={
          <ProtectedRoute>
            <AppShell><AtsCheckerPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <AppShell><InterviewSetupPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/:sessionId"
        element={
          <ProtectedRoute>
            <AppShell><InterviewResultsPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <AppShell><InterviewHistoryPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/practice"
        element={
          <ProtectedRoute>
            <AppShell><PracticePage /></AppShell>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

/* ── Root component ────────────────────────────────────────── */
export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <TargetCursor
          targetSelector=".cursor-target, button, a, [role='button']"
          cursorColor="#4F8FE0"
          cursorColorOnTarget="#A9D0F5"
          hoverDuration={0.18}
          spinDuration={2.5}
          size={32}
          cornerSize={10}
          thickness={2.5}
          padding={6}
          dotSize={4}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
