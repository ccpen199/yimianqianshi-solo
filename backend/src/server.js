require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 24339;

app.use(cors({
  origin: ['http://localhost:32433', 'http://127.0.0.1:32433'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '呼叫中心系统运行正常', timestamp: new Date().toISOString() });
});

app.get('/api/dashboard/overview', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        todayCalls: { count: 15, completed: 12, abandoned: 2, avg_duration: 180 },
        queueStats: [
          { id: 1, name: '普通咨询', waiting_count: 3, avg_wait_time: 45 },
          { id: 2, name: '技术支持', waiting_count: 2, avg_wait_time: 60 },
          { id: 3, name: 'VIP专线', waiting_count: 1, avg_wait_time: 30 },
        ],
        ticketStats: [
          { status: 'pending', count: 5 },
          { status: 'processing', count: 8 },
          { status: 'resolved', count: 12 },
        ],
        agentStats: [
          { id: 1, name: '李坐席', status: 'online', skill_group: 'general', active_calls: 1 },
          { id: 2, name: '王坐席', status: 'busy', skill_group: 'tech', active_calls: 2 },
        ],
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: '获取看板数据失败' });
  }
});

app.get('/api/users/me', authenticateToken, (req, res) => {
  res.json({ success: true, data: req.user });
});

app.get('/api/users/agents', authenticateToken, async (req, res) => {
  try {
    const { getAll } = require('./database');
    const result = await getAll(
      'SELECT id, name, username, role, skill_group, status FROM users WHERE role = ?',
      ['agent']
    );
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
});

app.get('/api/queues/list', authenticateToken, async (req, res) => {
  try {
    const { getAll } = require('./database');
    const result = await getAll('SELECT * FROM queues ORDER BY priority DESC');
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.json({ success: true, data: [
      { id: 1, name: '普通咨询' },
      { id: 2, name: '技术支持' },
      { id: 3, name: 'VIP专线' },
      { id: 4, name: '投诉处理' },
    ]});
  }
});

let mockCalls = [];
let nextCallId = 1000;

app.get('/api/calls/queue', authenticateToken, (req, res) => {
  const waitingCalls = mockCalls.filter(c => c.status === 'waiting');
  res.json({ success: true, data: waitingCalls });
});

app.get('/api/calls/my-calls', authenticateToken, (req, res) => {
  const myCalls = mockCalls.filter(c => c.agent_id === req.user.id && ['ringing', 'connected', 'held'].includes(c.status));
  res.json({ success: true, data: myCalls });
});

app.post('/api/calls/incoming', authenticateToken, (req, res) => {
  const { callerNumber, queueId } = req.body;
  const callId = `CALL-${nextCallId++}`;
  const newCall = {
    id: nextCallId - 1,
    call_id: callId,
    caller_number: callerNumber || '13800138000',
    queue_id: queueId || 1,
    customer_name: '未知客户',
    customer_level: 'normal',
    status: 'waiting',
    direction: 'inbound',
    priority: 5,
    wait_start_time: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  mockCalls.push(newCall);
  res.json({ success: true, data: newCall });
});

app.post('/api/calls/:callId/assign', authenticateToken, (req, res) => {
  const callId = req.params.callId;
  const call = mockCalls.find(c => c.call_id === callId);
  if (call) {
    call.status = 'ringing';
    call.agent_id = req.user.id;
    call.agent_name = req.user.name;
    call.ring_start_time = new Date().toISOString();
  }
  res.json({ success: true, message: '分配成功' });
});

app.post('/api/calls/:callId/answer', authenticateToken, (req, res) => {
  const callId = req.params.callId;
  const call = mockCalls.find(c => c.call_id === callId);
  if (call) {
    call.status = 'connected';
    call.connect_time = new Date().toISOString();
  }
  res.json({ success: true, message: '接听成功' });
});

app.post('/api/calls/:callId/hold', authenticateToken, (req, res) => {
  const callId = req.params.callId;
  const call = mockCalls.find(c => c.call_id === callId);
  if (call) {
    call.status = 'held';
  }
  res.json({ success: true, message: '保持成功' });
});

app.post('/api/calls/:callId/unhold', authenticateToken, (req, res) => {
  const callId = req.params.callId;
  const call = mockCalls.find(c => c.call_id === callId);
  if (call) {
    call.status = 'connected';
  }
  res.json({ success: true, message: '恢复成功' });
});

app.post('/api/calls/:callId/hangup', authenticateToken, (req, res) => {
  const callId = req.params.callId;
  const call = mockCalls.find(c => c.call_id === callId);
  if (call) {
    call.status = 'ended';
    call.end_time = new Date().toISOString();
  }
  res.json({ success: true, message: '挂断成功' });
});

app.get('/api/calls/history/list', authenticateToken, (req, res) => {
  const historyCalls = mockCalls.filter(c => ['ended', 'missed', 'abandoned'].includes(c.status)).slice(-20);
  res.json({ success: true, data: historyCalls });
});

let mockTickets = [];
let nextTicketId = 100;

app.get('/api/tickets/list', authenticateToken, (req, res) => {
  res.json({ success: true, data: mockTickets });
});

app.post('/api/tickets', authenticateToken, (req, res) => {
  const { callId, customerId, type, title, description, priority } = req.body;
  const newTicket = {
    id: ++nextTicketId,
    ticket_no: `TK${Date.now()}`,
    call_id: callId || null,
    customer_id: customerId || 1,
    customer_name: '未知客户',
    type,
    title,
    description,
    priority: priority || 'normal',
    status: 'pending',
    creator_id: req.user.id,
    creator_name: req.user.name,
    created_at: new Date().toISOString(),
  };
  mockTickets.push(newTicket);
  res.json({ success: true, data: newTicket, message: '工单创建成功' });
});

app.get('/api/customers/list', authenticateToken, (req, res) => {
  res.json({ success: true, data: [
    { id: 1, phone_number: '13800138000', name: '张三', level: 'vip', company: 'ABC公司' },
    { id: 2, phone_number: '13900139000', name: '李四', level: 'normal', company: 'XYZ公司' },
    { id: 3, phone_number: '13700137000', name: '王五', level: 'normal' },
  ]});
});

app.get('/api/customers/:customerId', authenticateToken, (req, res) => {
  const customerId = parseInt(req.params.customerId);
  const customer = {
    id: customerId,
    phone_number: '13800138000',
    name: '张三',
    email: 'zhangsan@example.com',
    company: 'ABC公司',
    level: 'vip',
    created_at: new Date().toISOString(),
    recentCalls: mockCalls.filter(c => c.customer_name === '张三').slice(-5),
    recentTickets: mockTickets.filter(t => t.customer_id === customerId).slice(-5),
  };
  res.json({ success: true, data: customer });
});

app.get('/api/quality/criteria', authenticateToken, (req, res) => {
  res.json({ success: true, data: [
    { id: 1, name: '服务态度', max_score: 20, category: 'service' },
    { id: 2, name: '专业知识', max_score: 30, category: 'professional' },
    { id: 3, name: '沟通技巧', max_score: 25, category: 'communication' },
    { id: 4, name: '流程规范', max_score: 25, category: 'process' },
  ]});
});

app.get('/api/quality/reviews', authenticateToken, (req, res) => {
  res.json({ success: true, data: [] });
});

app.post('/api/quality/reviews', authenticateToken, (req, res) => {
  res.json({ success: true, data: { id: 1 }, message: '质检评分创建成功' });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  呼叫中心系统后端服务已启动`);
  console.log(`  端口: ${PORT}`);
  console.log(`  环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  健康检查: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});
