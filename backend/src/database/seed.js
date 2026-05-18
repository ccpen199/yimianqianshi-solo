const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../data/app.sqlite');
const db = new sqlite3.Database(dbPath);

async function seedData() {
  console.log('开始插入测试数据...');

  // 客户数据
  const customers = [
    { name: '张三', phone: '13800138001', budget_min: 300, budget_max: 500, areas: '朝阳区', house_types: '两室一厅', school_district: '朝阳一小', loan_ability: 300, purchase_stage: '看房中', agent_id: 3, status: 'active' },
    { name: '李四', phone: '13800138002', budget_min: 400, budget_max: 600, areas: '海淀区', house_types: '三室两厅', school_district: '海淀实验', loan_ability: 400, purchase_stage: '意向中', agent_id: 3, status: 'active' },
    { name: '王五', phone: '13800138003', budget_min: 500, budget_max: 800, areas: '西城区', house_types: '四室两厅', school_district: '北京四中', loan_ability: 500, purchase_stage: '谈判中', agent_id: 4, status: 'active' },
    { name: '赵六', phone: '13800138004', budget_min: 200, budget_max: 350, areas: '丰台区', house_types: '一室一厅', school_district: '', loan_ability: 200, purchase_stage: '已成交', agent_id: 4, status: 'active' },
  ];

  for (const cust of customers) {
    const existing = await new Promise((resolve) => {
      db.get('SELECT id FROM customers WHERE phone = ?', [cust.phone], (err, row) => resolve(row));
    });
    
    if (!existing) {
      await new Promise((resolve) => {
        db.run(`INSERT INTO customers (name, phone, budget_min, budget_max, areas, house_types, school_district, loan_ability, purchase_stage, agent_id, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [cust.name, cust.phone, cust.budget_min, cust.budget_max, cust.areas, cust.house_types, cust.school_district, cust.loan_ability, cust.purchase_stage, cust.agent_id, cust.status],
          function(err) { resolve(); }
        );
      });
      console.log(`已添加客户: ${cust.name}`);
    }
  }

  // 房源数据
  const properties = [
    { owner_name: '业主A', owner_phone: '13900139001', address: '朝阳区建国路88号现代城2号楼1503室', price: 450, area: 89, house_type: '两室一厅', floor: '15/28', orientation: '南', has_key: 1, viewing_restrictions: '提前1小时预约', status: 'available', is_sensitive: 0, agent_id: 3 },
    { owner_name: '业主B', owner_phone: '13900139002', address: '海淀区中关村南大街5号3号楼802室', price: 580, area: 120, house_type: '三室两厅', floor: '8/18', orientation: '南北通透', has_key: 1, viewing_restrictions: '', status: 'available', is_sensitive: 0, agent_id: 3 },
    { owner_name: '业主C', owner_phone: '13900139003', address: '西城区金融街19号富凯大厦B座1201室', price: 750, area: 156, house_type: '四室两厅', floor: '12/25', orientation: '东南', has_key: 0, viewing_restrictions: '业主自住，需提前半天预约', status: 'available', is_sensitive: 1, agent_id: 4 },
    { owner_name: '业主D', owner_phone: '13900139004', address: '丰台区南三环西路16号搜宝商务中心1号楼506室', price: 280, area: 68, house_type: '一室一厅', floor: '5/20', orientation: '东', has_key: 1, viewing_restrictions: '', status: 'sold', is_sensitive: 0, agent_id: 4 },
  ];

  for (const prop of properties) {
    const existing = await new Promise((resolve) => {
      db.get('SELECT id FROM properties WHERE address = ?', [prop.address], (err, row) => resolve(row));
    });
    
    if (!existing) {
      await new Promise((resolve) => {
        db.run(`INSERT INTO properties (owner_name, owner_phone, address, price, area, house_type, floor, orientation, has_key, viewing_restrictions, status, is_sensitive, agent_id, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [prop.owner_name, prop.owner_phone, prop.address, prop.price, prop.area, prop.house_type, prop.floor, prop.orientation, prop.has_key, prop.viewing_restrictions, prop.status, prop.is_sensitive, prop.agent_id],
          function(err) { resolve(); }
        );
      });
      console.log(`已添加房源: ${prop.address}`);
    }
  }

  // 带看数据
  const viewings = [
    { customer_id: 1, property_id: 1, agent_id: 3, viewing_time: '2024-01-15 14:00:00', status: 'completed' },
    { customer_id: 1, property_id: 2, agent_id: 3, viewing_time: '2024-01-16 10:00:00', status: 'completed' },
    { customer_id: 2, property_id: 2, agent_id: 3, viewing_time: '2024-01-18 15:30:00', status: 'scheduled' },
    { customer_id: 3, property_id: 3, agent_id: 4, viewing_time: '2024-01-20 09:00:00', status: 'scheduled' },
  ];

  for (const v of viewings) {
    const existing = await new Promise((resolve) => {
      db.get('SELECT id FROM viewings WHERE customer_id = ? AND property_id = ? AND viewing_time = ?', 
        [v.customer_id, v.property_id, v.viewing_time], (err, row) => resolve(row));
    });
    
    if (!existing) {
      await new Promise((resolve) => {
        db.run(`INSERT INTO viewings (customer_id, property_id, agent_id, viewing_time, status, created_at) 
                VALUES (?, ?, ?, ?, ?, datetime('now'))`,
          [v.customer_id, v.property_id, v.agent_id, v.viewing_time, v.status],
          function(err) { resolve(); }
        );
      });
      console.log(`已添加带看记录`);
    }
  }

  // 谈判数据
  const negotiations = [
    { customer_id: 3, property_id: 3, agent_id: 4, initial_offer: 720, counter_offer: 740, final_price: 735, owner_feedback: '业主同意735万成交', loan_progress: '审批中', status: 'negotiating' },
    { customer_id: 4, property_id: 4, agent_id: 4, initial_offer: 270, counter_offer: 275, final_price: 275, owner_feedback: '已签约', loan_progress: '已放款', status: 'signed' },
  ];

  for (const n of negotiations) {
    const existing = await new Promise((resolve) => {
      db.get('SELECT id FROM negotiations WHERE customer_id = ? AND property_id = ?', 
        [n.customer_id, n.property_id], (err, row) => resolve(row));
    });
    
    if (!existing) {
      await new Promise((resolve) => {
        db.run(`INSERT INTO negotiations (customer_id, property_id, agent_id, initial_offer, counter_offer, final_price, owner_feedback, loan_progress, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [n.customer_id, n.property_id, n.agent_id, n.initial_offer, n.counter_offer, n.final_price, n.owner_feedback, n.loan_progress, n.status],
          function(err) { resolve(); }
        );
      });
      console.log(`已添加谈判记录`);
    }
  }

  // 合同数据
  const contracts = [
    { negotiation_id: 2, customer_id: 4, property_id: 4, contract_no: 'HT20240120001', total_price: 275, commission_amount: 5.5, sign_date: '2024-01-20', status: 'signed' },
  ];

  for (const c of contracts) {
    const existing = await new Promise((resolve) => {
      db.get('SELECT id FROM contracts WHERE contract_no = ?', [c.contract_no], (err, row) => resolve(row));
    });
    
    if (!existing) {
      const contractId = await new Promise((resolve) => {
        db.run(`INSERT INTO contracts (negotiation_id, customer_id, property_id, contract_no, total_price, commission_amount, sign_date, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [c.negotiation_id, c.customer_id, c.property_id, c.contract_no, c.total_price, c.commission_amount, c.sign_date, c.status],
          function(err) { resolve(this.lastID); }
        );
      });
      console.log(`已添加合同: ${c.contract_no}`);

      // 添加佣金记录
      const commissionAmount = c.commission_amount * 0.7;
      await new Promise((resolve) => {
        db.run(`INSERT INTO commissions (contract_id, user_id, amount, percentage, status, created_at) 
                VALUES (?, ?, ?, ?, ?, datetime('now'))`,
          [contractId, 4, commissionAmount, 0.7, 'pending'],
          function(err) { resolve(); }
        );
      });
      console.log(`已添加佣金记录`);
    }
  }

  console.log('测试数据插入完成！');
  db.close();
}

seedData().catch(console.error);
