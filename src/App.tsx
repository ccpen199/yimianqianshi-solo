import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Prompts from "./pages/Prompts";
import TestCases from "./pages/TestCases";
import Evaluations from "./pages/Evaluations";
import Releases from "./pages/Releases";
import Monitoring from "./pages/Monitoring";
import UsersPage from "./pages/Users";
import Layout from "./components/Layout";
import useAuthStore from "./store/useAuthStore";

function App() {
  const { user } = useAuthStore();

  React.useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        {user ? (
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/prompts" element={<Prompts />} />
            <Route path="/test-cases" element={<TestCases />} />
            <Route path="/evaluations" element={<Evaluations />} />
            <Route path="/releases" element={<Releases />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;
