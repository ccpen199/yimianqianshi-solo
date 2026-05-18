import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Properties from './pages/Properties'
import Viewings from './pages/Viewings'
import Negotiations from './pages/Negotiations'
import Contracts from './pages/Contracts'
import Commissions from './pages/Commissions'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  const location = useLocation()
  
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="properties" element={<Properties />} />
        <Route path="viewings" element={<Viewings />} />
        <Route path="negotiations" element={<Negotiations />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="commissions" element={<Commissions />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
