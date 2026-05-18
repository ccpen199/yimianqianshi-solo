import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Trials from './pages/Trials';
import Enrollments from './pages/Enrollments';
import Classes from './pages/Classes';

const navStyle = {
  background: '#2c3e50',
  color: 'white',
  padding: '1rem 2rem',
  display: 'flex',
  gap: '2rem',
  alignItems: 'center'
};

const linkStyle = {
  color: 'white',
  textDecoration: 'none',
  padding: '0.5rem 1rem',
  borderRadius: '4px'
};

const activeStyle = {
  ...linkStyle,
  background: '#3498db'
};

function App() {
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh' }}>
        <nav style={navStyle}>
          <h1 style={{ margin: 0, fontSize: '1.2rem' }}>教培CRM</h1>
          <Link to="/" style={currentPath === '/' ? activeStyle : linkStyle}>
            仪表盘
          </Link>
          <Link to="/leads" style={currentPath === '/leads' ? activeStyle : linkStyle}>
            线索管理
          </Link>
          <Link to="/trials" style={currentPath === '/trials' ? activeStyle : linkStyle}>
            试听预约
          </Link>
          <Link to="/enrollments" style={currentPath === '/enrollments' ? activeStyle : linkStyle}>
            报名缴费
          </Link>
          <Link to="/classes" style={currentPath === '/classes' ? activeStyle : linkStyle}>
            分班排课
          </Link>
        </nav>
        <div style={{ padding: '2rem' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/trials" element={<Trials />} />
            <Route path="/enrollments" element={<Enrollments />} />
            <Route path="/classes" element={<Classes />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
