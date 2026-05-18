import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Calls from './pages/Calls';
import Agents from './pages/Agents';
import Quality from './pages/Quality';
import Layout from './components/Layout';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      加载中...
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  
  const getDefaultRoute = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'operator':
        return '/calls';
      case 'quality_inspector':
        return '/quality';
      default:
        return '/';
    }
  };
  
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      加载中...
    </div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['supervisor', 'admin']}>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/leads" element={
        <ProtectedRoute allowedRoles={['supervisor', 'admin']}>
          <Layout>
            <Leads />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/agents" element={
        <ProtectedRoute allowedRoles={['supervisor', 'admin']}>
          <Layout>
            <Agents />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/calls" element={
        <ProtectedRoute allowedRoles={['operator']}>
          <Layout>
            <Calls />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/quality" element={
        <ProtectedRoute allowedRoles={['quality_inspector', 'admin']}>
          <Layout>
            <Quality />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to={user ? getDefaultRoute() : '/login'} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
