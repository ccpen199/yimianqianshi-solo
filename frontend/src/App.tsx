import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spin, Card } from 'antd';
import AppLayout from './components/Layout';
import Login from './pages/Login';
import useAuthStore from './store/useAuthStore';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const AgentWorkspace = React.lazy(() => import('./pages/AgentWorkspace'));
const Calls = React.lazy(() => import('./pages/Calls'));
const Tickets = React.lazy(() => import('./pages/Tickets'));
const Quality = React.lazy(() => import('./pages/Quality'));
const Customers = React.lazy(() => import('./pages/Customers'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
    <Card style={{ textAlign: 'center', padding: '40px' }}>
      <Spin size="large" tip="系统加载中..." />
    </Card>
  </div>
);

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { initialize, isAuthenticated } = useAuthStore();

  useEffect(() => {
    initialize();
    const timer = setTimeout(() => setIsInitialized(true), 300);
    return () => clearTimeout(timer);
  }, [initialize]);

  if (!isInitialized) {
    return <PageLoader />;
  }

  return (
    <Router>
      <React.Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/agent-workspace"
            element={
              <PrivateRoute>
                <AppLayout>
                  <AgentWorkspace />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/calls"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Calls />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tickets"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Tickets />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/quality"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Quality />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Customers />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
};

export default App;
