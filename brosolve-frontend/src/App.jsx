import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import AppHeader from "./components/AppHeader.jsx";
import PageTransition from "./components/PageTransition.jsx";
import Homepage from "./pages/Homepage/Home.jsx";
import Login from "./pages/Auth/Login.jsx";
import Register from "./pages/Auth/Register.jsx";
import StudentDashboard from "./pages/Student/Dashboard.jsx";
import AdminDashboard from "./pages/Admin/Admin_dashboard.jsx";
import AdminCreate from "./pages/Admin/AdminCreate.jsx";
import AdminCategories from "./pages/Admin/AdminCategories.jsx";
import AdminAnalytics from "./pages/Admin/AdminAnalytics.jsx";
import AdminComplaintChat from "./pages/Admin/AdminComplaintChat.jsx";
import ComplaintForm from "./pages/Student/complaintform.jsx";
import StudentComplaintChat from "./pages/Student/StudentComplaintChat.jsx";
import Stats from "./pages/Public/Stats.jsx";
import ReplyThread from "./components/ReplyThread.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function AppContent() {
  const location = useLocation();
  const showHeader = location.pathname !== '/';

  return (
    <>
      {showHeader && <AppHeader />}
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Homepage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/stats" element={
            <PageTransition>
              <Stats />
            </PageTransition>
          } />
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <StudentDashboard />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/complaint"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <ComplaintForm />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/complaint/:id/replies"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <ReplyThread />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/complaint/:id/chat"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <StudentComplaintChat />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <AdminDashboard />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/create"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <AdminCreate />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <AdminCategories />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute roles={['admin', 'superadmin']}>
                <PageTransition>
                  <AdminAnalytics />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaint/:id/replies"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <ReplyThread />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaint/:id/chat"
            element={
              <ProtectedRoute roles={['admin', 'superadmin']}>
                <PageTransition>
                  <AdminComplaintChat />
                </PageTransition>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
