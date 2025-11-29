import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If roles prop is provided, use it for access control
  if (roles && Array.isArray(roles)) {
    if (!roles.includes(user?.role)) {
      // User doesn't have required role - redirect based on their role
      if (user?.role === 'admin' || user?.role === 'superadmin') {
        return <Navigate to="/admin/dashboard" replace />;
      }
      return <Navigate to="/student/dashboard" replace />;
    }
    return children;
  }

  // Role-based access control (backward compatibility)
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isStudentRoute = location.pathname.startsWith('/student');
  const userRole = user?.role;
  
  // Check if user role matches route requirement
  if (isAdminRoute && userRole !== 'admin' && userRole !== 'superadmin') {
    // Student trying to access admin route - redirect to student dashboard
    return <Navigate to="/student/dashboard" replace />;
  }
  
  if (isStudentRoute && (userRole === 'admin' || userRole === 'superadmin')) {
    // Admin trying to access student route - redirect to admin dashboard
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}

