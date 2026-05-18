const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const dbPath = path.join(__dirname, '../../data/app.sqlite');
const db = new sqlite3.Database(dbPath);

async function run() {
  try {
    // 获取现有客户
    const customers = await new Promise((resolve, reject) => {
      db.all('SELECT id, name FROM customers LIMIT 3', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('找到客户:', customers.map(c => c.name));
    
    if (customers.length < 3) {
      console.log('客户数量不足，先添加客户...');
      return;
    }
    
    // 获取现有合同
    const contracts = await new Promise((resolve, reject) => {
      db.all('SELECT id, contract_no FROM contracts LIMIT 3', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('找到合同:', contracts.map(c => c.contract_no));
    
    // 添加续费记录
    const renewalRecords = [
      {
        customerId: customers[0].id,
        contractId: contracts[0]?.id,
        amount: 45000,
        discount: 10,
        status: 'pending_verification',
        notes: '客户希望增加10个席位，正在等待财务确认',
        financeVerified: 0,
        daysAgo: 2
      },
      {
        customerId: customers[1].id,
        contractId: contracts[1]?.id,
        amount: 30000,
        discount: 0,
        status: 'completed',
        notes: '已完成续费，客户满意度高',
        financeVerified: 1,
        daysAgo: 10
      },
      {
        customerId: customers[2].id,
        contractId: contracts[2]?.id,
        amount: 0,
        discount: 0,
        status: 'churned',
        churnReason: '竞品价格更低，决定不再续费',
        notes: '已流失，需要持续跟进',
        financeVerified: 1,
        daysAgo: 20
      }
    ];
    
    for (const record of renewalRecords) {
      const renewalId = uuidv4();
      await new Promise((resolve, reject) => {
        const sql = record.churnReason 
          ? `INSERT INTO renewal_records (id, customer_id, contract_id, renewal_amount, discount_rate, status, churn_reason, notes, finance_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          : `INSERT INTO renewal_records (id, customer_id, contract_id, renewal_amount, discount_rate, status, notes, finance_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const params = record.churnReason
          ? [renewalId, record.customerId, record.contractId, record.amount, record.discount, record.status, record.churnReason, record.notes, record.financeVerified, dayjs().subtract(record.daysAgo, 'day').toISOString()]
          : [renewalId, record.customerId, record.contractId, record.amount, record.discount, record.status, record.notes, record.financeVerified, dayjs().subtract(record.daysAgo, 'day').toISOString()];
        
        db.run(sql, params, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log(`添加续费记录: ${customers.find(c => c.id === record.customerId).name} - ${record.status}`);
    }
    
    console.log('\n续费记录添加成功！共添加', renewalRecords.length, '条记录');
    
  } catch (error) {
    console.error('添加续费记录失败:', error);
  } finally {
    db.close();
  }
}

run();
