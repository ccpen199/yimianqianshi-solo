import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu, Spin } from 'antd';
import {
  DatabaseOutlined,
  AudioOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ExportOutlined
} from '@ant-design/icons';
import ErrorBoundary from './components/ErrorBoundary';
import BatchList from './pages/BatchList';
import AudioDetail from './pages/AudioDetail';
import Annotation from './pages/Annotation';
import QualityCheck from './pages/QualityCheck';
import ExportPage from './pages/Export';
import './App.css';

const { Header, Content, Sider } = Layout;

function App() {
  const menuItems = [
    { key: '1', icon: <DatabaseOutlined />, label: <Link to="/">批次管理</Link> },
    { key: '2', icon: <EditOutlined />, label: <Link to="/annotation">标注工作台</Link> },
    { key: '3', icon: <CheckCircleOutlined />, label: <Link to="/quality">质检中心</Link> },
    { key: '4', icon: <ExportOutlined />, label: <Link to="/export">数据导出</Link> }
  ];

  return (
    <ErrorBoundary>
      <Router>
        <Layout style={{ minHeight: '100vh' }}>
          <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
              <AudioOutlined style={{ marginRight: '12px' }} />
              语音数据标注平台
            </div>
          </Header>
          <Layout>
            <Sider width={200} style={{ background: '#fff' }}>
              <Menu
                mode="inline"
                defaultSelectedKeys={['1']}
                style={{ height: '100%', borderRight: 0 }}
                items={menuItems}
              />
            </Sider>
            <Layout style={{ padding: '24px' }}>
              <Content
                style={{
                  padding: 24,
                  margin: 0,
                  minHeight: 280,
                  background: '#fff',
                  borderRadius: 8
                }}
              >
                <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', padding: '100px' }} />}>
                  <Routes>
                    <Route path="/" element={<BatchList />} />
                    <Route path="/batches/:batchId/audio/:audioId" element={<AudioDetail />} />
                    <Route path="/annotation" element={<Annotation />} />
                    <Route path="/annotation/:audioId" element={<Annotation />} />
                    <Route path="/quality" element={<QualityCheck />} />
                    <Route path="/export" element={<ExportPage />} />
                  </Routes>
                </Suspense>
              </Content>
            </Layout>
          </Layout>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;