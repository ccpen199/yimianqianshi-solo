const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/app.sqlite');
const db = new sqlite3.Database(dbPath);

const initTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS scoring_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          description TEXT,
          profile_rules TEXT NOT NULL,
          behavior_rules TEXT NOT NULL,
          negative_rules TEXT NOT NULL,
          is_active BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          industry TEXT,
          size TEXT,
          revenue TEXT,
          location TEXT,
          region TEXT,
          merged_from TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS leads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT NOT NULL UNIQUE,
          company_id INTEGER,
          email TEXT NOT NULL,
          name TEXT,
          phone TEXT,
          job_title TEXT,
          job_level TEXT,
          department TEXT,
          location TEXT,
          region TEXT,
          source TEXT,
          utm_source TEXT,
          utm_medium TEXT,
          utm_campaign TEXT,
          utm_term TEXT,
          utm_content TEXT,
          form_data TEXT,
          status TEXT DEFAULT 'new',
          total_score INTEGER DEFAULT 0,
          profile_score INTEGER DEFAULT 0,
          behavior_score INTEGER DEFAULT 0,
          negative_score INTEGER DEFAULT 0,
          scoring_version TEXT,
          scoring_details TEXT,
          heat_level TEXT DEFAULT 'cold',
          priority INTEGER DEFAULT 0,
          assigned_sales_id INTEGER,
          is_merged BOOLEAN DEFAULT 0,
          merged_to_lead_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id),
          FOREIGN KEY (assigned_sales_id) REFERENCES sales_reps(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS lead_contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lead_id INTEGER NOT NULL,
          contact_type TEXT NOT NULL,
          contact_value TEXT NOT NULL,
          source TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS activities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lead_id INTEGER NOT NULL,
          activity_type TEXT NOT NULL,
          activity_title TEXT NOT NULL,
          activity_data TEXT,
          page_url TEXT,
          referrer TEXT,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS sales_reps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone TEXT,
          avatar TEXT,
          regions TEXT,
          industries TEXT,
          max_capacity INTEGER DEFAULT 50,
          current_load INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS sales_blacklist (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sales_id INTEGER NOT NULL,
          lead_id INTEGER NOT NULL,
          reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sales_id) REFERENCES sales_reps(id) ON DELETE CASCADE,
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
          UNIQUE(sales_id, lead_id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lead_id INTEGER NOT NULL UNIQUE,
          sales_id INTEGER NOT NULL,
          reason TEXT,
          status TEXT DEFAULT 'active',
          feedback_score INTEGER,
          feedback_note TEXT,
          feedback_reason TEXT,
          assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          feedback_at DATETIME,
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
          FOREIGN KEY (sales_id) REFERENCES sales_reps(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS import_batches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          batch_uuid TEXT NOT NULL UNIQUE,
          filename TEXT NOT NULL,
          total_count INTEGER DEFAULT 0,
          success_count INTEGER DEFAULT 0,
          error_count INTEGER DEFAULT 0,
          errors TEXT,
          status TEXT DEFAULT 'processing',
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS system_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          log_type TEXT NOT NULL,
          module TEXT NOT NULL,
          action TEXT NOT NULL,
          details TEXT,
          reference_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

const seedInitialData = () => {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM scoring_rules', (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row.count === 0) {
        const defaultProfileRules = JSON.stringify([
          { id: 'ind_tech', field: 'industry', value: 'Technology', score: 15, label: '科技行业' },
          { id: 'ind_finance', field: 'industry', value: 'Finance', score: 12, label: '金融行业' },
          { id: 'ind_healthcare', field: 'industry', value: 'Healthcare', score: 10, label: '医疗行业' },
          { id: 'size_enterprise', field: 'size', value: 'Enterprise', score: 20, label: '大型企业(1000人+)' },
          { id: 'size_mid', field: 'size', value: 'Mid-Market', score: 15, label: '中型企业(100-999人)' },
          { id: 'size_smb', field: 'size', value: 'SMB', score: 5, label: '小型企业(<100人)' },
          { id: 'level_c', field: 'job_level', value: 'C-Level', score: 25, label: 'C级高管' },
          { id: 'level_vp', field: 'job_level', value: 'VP', score: 20, label: '副总裁' },
          { id: 'level_director', field: 'job_level', value: 'Director', score: 15, label: '总监' },
          { id: 'level_manager', field: 'job_level', value: 'Manager', score: 10, label: '经理' },
          { id: 'dept_it', field: 'department', value: 'IT', score: 12, label: 'IT部门' },
          { id: 'dept_marketing', field: 'department', value: 'Marketing', score: 8, label: '市场部门' },
          { id: 'reg_north', field: 'region', value: 'North', score: 8, label: '华北地区' },
          { id: 'reg_east', field: 'region', value: 'East', score: 8, label: '华东地区' },
          { id: 'reg_south', field: 'region', value: 'South', score: 8, label: '华南地区' }
        ]);

        const defaultBehaviorRules = JSON.stringify([
          { id: 'visit_home', type: 'page_view', page: '/', score: 2, label: '访问首页', decay_days: 30 },
          { id: 'visit_pricing', type: 'page_view', page: '/pricing', score: 5, label: '查看定价页', decay_days: 30 },
          { id: 'visit_product', type: 'page_view', page: '/product', score: 5, label: '查看产品页', decay_days: 30 },
          { id: 'download_whitepaper', type: 'download', asset: 'whitepaper', score: 15, label: '下载白皮书', decay_days: 60 },
          { id: 'download_case', type: 'download', asset: 'case_study', score: 12, label: '下载案例', decay_days: 60 },
          { id: 'webinar_attend', type: 'webinar', action: 'attend', score: 20, label: '参加直播', decay_days: 45 },
          { id: 'webinar_register', type: 'webinar', action: 'register', score: 10, label: '注册直播', decay_days: 45 },
          { id: 'trial_request', type: 'conversion', action: 'trial', score: 30, label: '申请试用', decay_days: 90 },
          { id: 'demo_request', type: 'conversion', action: 'demo', score: 25, label: '申请演示', decay_days: 90 },
          { id: 'contact_form', type: 'conversion', action: 'contact', score: 20, label: '提交联系表单', decay_days: 60 },
          { id: 'email_open', type: 'email', action: 'open', score: 1, label: '打开邮件', decay_days: 14 },
          { id: 'email_click', type: 'email', action: 'click', score: 5, label: '点击邮件链接', decay_days: 14 }
        ]);

        const defaultNegativeRules = JSON.stringify([
          { id: 'neg_free_email', field: 'email_domain', values: ['gmail.com', 'yahoo.com', 'hotmail.com', 'qq.com', '163.com'], penalty: -10, label: '免费邮箱域名' },
          { id: 'neg_student', field: 'job_title', keywords: ['学生', 'student', 'intern', '实习'], penalty: -15, label: '学生/实习生' },
          { id: 'neg_competitor', field: 'domain', keywords: ['competitor', 'rival', '竞品'], penalty: -50, label: '竞争对手' },
          { id: 'neg_spam', field: 'email', keywords: ['spam', 'test', 'fake'], penalty: -30, label: '垃圾邮箱' },
          { id: 'neg_bounced', type: 'email_bounce', penalty: -20, label: '邮件退信' },
          { id: 'neg_unsubscribe', type: 'email_unsubscribe', penalty: -15, label: '退订邮件' },
          { id: 'neg_sales_rejected', type: 'sales_rejected', penalty: -25, label: '销售退回' }
        ]);

        db.run(`
          INSERT INTO scoring_rules (version, name, description, profile_rules, behavior_rules, negative_rules, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, ['v1.0', '默认评分规则', '初始版本的默认评分规则', defaultProfileRules, defaultBehaviorRules, defaultNegativeRules, 1]);
      }

      db.get('SELECT COUNT(*) as count FROM sales_reps', (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row.count === 0) {
          const salesReps = [
            { name: '张明', email: 'zhang.ming@example.com', regions: JSON.stringify(['North']), industries: JSON.stringify(['Technology']), max_capacity: 50 },
            { name: '李华', email: 'li.hua@example.com', regions: JSON.stringify(['East']), industries: JSON.stringify(['Finance']), max_capacity: 50 },
            { name: '王芳', email: 'wang.fang@example.com', regions: JSON.stringify(['South']), industries: JSON.stringify(['Healthcare']), max_capacity: 50 }
          ];

          salesReps.forEach(rep => {
            db.run(`
              INSERT INTO sales_reps (name, email, regions, industries, max_capacity)
              VALUES (?, ?, ?, ?, ?)
            `, [rep.name, rep.email, rep.regions, rep.industries, rep.max_capacity]);
          });
        }
        
        resolve();
      });
    });
  });
};

const initDatabase = async () => {
  await initTables();
  await seedInitialData();
  console.log('Database initialized successfully');
};

module.exports = { db, initDatabase };