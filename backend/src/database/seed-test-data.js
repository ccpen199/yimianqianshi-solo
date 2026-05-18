const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'app.sqlite');
const db = new sqlite3.Database(dbPath);

async function run() {
  try {
    // 创建测试客户
    const customerId1 = uuidv4();
    const customerId2 = uuidv4();
    const customerId3 = uuidv4();
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO customers (id, name, industry, contact_name, contact_email, contact_phone, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customerId1,
        '北京科技有限公司',
        '科技',
        '张三',
        'zhangsan@beijingtech.com',
        '13800138001',
        'active',
        dayjs().toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO customers (id, name, industry, contact_name, contact_email, contact_phone, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customerId2,
        '上海贸易股份有限公司',
        '贸易',
        '李四',
        'lisi@shanghaitrade.com',
        '13800138002',
        'active',
        dayjs().toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO customers (id, name, industry, contact_name, contact_email, contact_phone, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customerId3,
        '广州制造集团',
        '制造',
        '王五',
        'wangwu@guangzhoumfg.com',
        '13800138003',
        'active',
        dayjs().toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // 创建测试合同
    const contractId1 = uuidv4();
    const contractId2 = uuidv4();
    const contractId3 = uuidv4();
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO contracts (id, customer_id, contract_no, subscription_version, seats_count, arr_amount, start_date, end_date, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        contractId1,
        customerId1,
        'BJ-2024-001',
        'Enterprise',
        50,
        50000,
        dayjs().subtract(6, 'month').toISOString(),
        dayjs().add(15, 'day').toISOString(), // 15天后到期
        'active',
        dayjs().toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO contracts (id, customer_id, contract_no, subscription_version, seats_count, arr_amount, start_date, end_date, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        contractId2,
        customerId2,
        'SH-2024-001',
        'Professional',
        30,
        30000,
        dayjs().subtract(9, 'month').toISOString(),
        dayjs().add(45, 'day').toISOString(), // 45天后到期
        'active',
        dayjs().toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO contracts (id, customer_id, contract_no, subscription_version, seats_count, arr_amount, start_date, end_date, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        contractId3,
        customerId3,
        'GZ-2024-001',
        'Basic',
        100,
        80000,
        dayjs().subtract(3, 'month').toISOString(),
        dayjs().add(75, 'day').toISOString(), // 75天后到期
        'active',
        dayjs().toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // 创建测试风险预警
    const alertId1 = uuidv4();
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO risk_alerts (id, customer_id, contract_id, type, severity, title, description, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        alertId1,
        customerId1,
        contractId1,
        'low_usage',
        'high',
        '产品使用率偏低',
        '该客户过去30天登录次数少于5次，存在流失风险',
        'open',
        dayjs().toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // 创建健康评分
    const healthId1 = uuidv4();
    const healthId2 = uuidv4();
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO health_scores (id, customer_id, contract_id, overall_score, usage_score, satisfaction_score, engagement_score, payment_score, risk_level, calculated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        healthId1,
        customerId1,
        contractId1,
        35,
        20,
        60,
        40,
        50,
        'high',
        dayjs().toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO health_scores (id, customer_id, contract_id, overall_score, usage_score, satisfaction_score, engagement_score, payment_score, risk_level, calculated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        healthId2,
        customerId2,
        contractId2,
        85,
        90,
        80,
        85,
        90,
        'low',
        dayjs().toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // 创建续费记录
    const renewalId1 = uuidv4();
    const renewalId2 = uuidv4();
    const renewalId3 = uuidv4();
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO renewal_records (id, customer_id, contract_id, renewal_amount, discount_rate, status, notes, finance_verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        renewalId1,
        customerId1,
        contractId1,
        45000,
        10,
        'pending_verification',
        '客户希望增加10个席位，正在等待财务确认',
        0,
        dayjs().subtract(2, 'day').toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO renewal_records (id, customer_id, contract_id, renewal_amount, discount_rate, status, notes, finance_verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        renewalId2,
        customerId2,
        contractId2,
        30000,
        0,
        'completed',
        '已完成续费，客户满意度高',
        1,
        dayjs().subtract(10, 'day').toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO renewal_records (id, customer_id, contract_id, renewal_amount, discount_rate, status, churn_reason, notes, finance_verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        renewalId3,
        customerId3,
        contractId3,
        0,
        0,
        'churned',
        '竞品价格更低，决定不再续费',
        '已流失，需要持续跟进',
        1,
        dayjs().subtract(20, 'day').toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // 创建跟进记录
    const followupId1 = uuidv4();
    const followupId2 = uuidv4();
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO follow_up_records (id, customer_id, contract_id, contact_type, content, outcome, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        followupId1,
        customerId1,
        contractId1,
        'phone',
        '电话联系客户，提醒合同即将到期，客户表示需要与团队讨论后决定',
        'pending',
        dayjs().subtract(3, 'day').toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO follow_up_records (id, customer_id, contract_id, contact_type, content, outcome, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        followupId2,
        customerId2,
        contractId2,
        'email',
        '发送续费报价邮件，客户当天回复确认同意续费',
        'success',
        dayjs().subtract(15, 'day').toISOString()
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('测试数据创建成功！');
    console.log('- 3个测试客户');
    console.log('- 3个测试合同（分别在15天、45天、75天后到期）');
    console.log('- 2个风险预警');
    console.log('- 2个健康评分记录');
    console.log('- 3个续费记录（待确认、已完成、已流失）');
    console.log('- 2个跟进记录');
    
  } catch (error) {
    console.error('创建测试数据失败:', error);
  } finally {
    db.close();
  }
}

run();
