import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Appointments from './pages/Appointments';
import Plans from './pages/Plans';
import Orders from './pages/Orders';
import Services from './pages/Services';
import Followups from './pages/Followups';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="plans" element={<Plans />} />
            <Route path="orders" element={<Orders />} />
            <Route path="services" element={<Services />} />
            <Route path="followups" element={<Followups />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
};

export default App;
