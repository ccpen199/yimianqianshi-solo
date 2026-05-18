const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const dbPath = './data/app.sqlite';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const getAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const initTables = async () => {
  const tables = [
    `CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      total_duration REAL DEFAULT 0,
      sample_rate INTEGER DEFAULT 16000,
      noise_level TEXT DEFAULT 'unknown',
      authorization_status TEXT DEFAULT 'pending',
      split_strategy TEXT DEFAULT 'auto',
      status TEXT DEFAULT 'created',
      created_by TEXT DEFAULT 'system',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      remark TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS audio_files (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      duration REAL NOT NULL DEFAULT 0,
      sample_rate INTEGER DEFAULT 16000,
      channels INTEGER DEFAULT 1,
      format TEXT,
      status TEXT DEFAULT 'uploaded',
      processed_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS audio_segments (
      id TEXT PRIMARY KEY,
      audio_file_id TEXT NOT NULL,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      duration REAL NOT NULL,
      text TEXT,
      speaker_id TEXT,
      speaker_name TEXT,
      speaker_role TEXT,
      status TEXT DEFAULT 'pending',
      created_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      remark TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS speakers (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      name TEXT NOT NULL,
      role TEXT,
      color TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS quality_checks (
      id TEXT PRIMARY KEY,
      segment_id TEXT NOT NULL,
      checker TEXT NOT NULL,
      checked_at INTEGER NOT NULL,
      wer REAL DEFAULT 0,
      missing_count INTEGER DEFAULT 0,
      time_offset REAL DEFAULT 0,
      rework_count INTEGER DEFAULT 0,
      conclusion TEXT NOT NULL,
      comment TEXT
    )`
  ];

  for (const tableSql of tables) {
    await runAsync(tableSql);
  }
};

const initTestData = async () => {
  const now = Date.now();
  
  try {
    const existingBatches = await getAsync('SELECT COUNT(*) as count FROM batches');
    if (existingBatches.count > 0) {
      console.log('数据库已有数据，跳过初始化');
      return;
    }
    
    console.log('开始初始化测试数据...');
    
    const batchId1 = uuidv4();
    await runAsync(`
      INSERT INTO batches (id, name, source, sample_rate, noise_level, authorization_status, split_strategy, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [batchId1, '客服中心录音批次-001', '客服中心', 16000, 'low', 'authorized', 'auto', 'created', now, now]);
    
    const batchId2 = uuidv4();
    await runAsync(`
      INSERT INTO batches (id, name, source, sample_rate, noise_level, authorization_status, split_strategy, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [batchId2, '电话回访录音批次-002', '电话回访', 8000, 'medium', 'pending', 'manual', 'processing', now, now]);
    
    console.log('✓ 添加了2个批次');
    
    const speakerId1 = uuidv4();
    const speakerId2 = uuidv4();
    const speakerId3 = uuidv4();
    
    await runAsync(`
      INSERT INTO speakers (id, batch_id, name, role, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [speakerId1, batchId1, '客服A', '客服代表', '#1890ff', now, now]);
    
    await runAsync(`
      INSERT INTO speakers (id, batch_id, name, role, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [speakerId2, batchId1, '客户B', '客户', '#52c41a', now, now]);
    
    await runAsync(`
      INSERT INTO speakers (id, batch_id, name, role, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [speakerId3, batchId2, '回访员C', '客服代表', '#faad14', now, now]);
    
    console.log('✓ 添加了3个说话人');
    
    const audioId1 = uuidv4();
    await runAsync(`
      INSERT INTO audio_files (id, batch_id, filename, original_name, file_path, file_size, duration, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [audioId1, batchId1, 'demo_audio_01.wav', '客户投诉录音_20240515.wav', '/tmp/demo1.wav', 1024000, 120.5, 'segmented', now, now]);
    
    const audioId2 = uuidv4();
    await runAsync(`
      INSERT INTO audio_files (id, batch_id, filename, original_name, file_path, file_size, duration, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [audioId2, batchId1, 'demo_audio_02.wav', '产品咨询录音_20240516.wav', '/tmp/demo2.wav', 2048000, 240.0, 'uploaded', now, now]);
    
    const audioId3 = uuidv4();
    await runAsync(`
      INSERT INTO audio_files (id, batch_id, filename, original_name, file_path, file_size, duration, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [audioId3, batchId2, 'demo_audio_03.wav', '回访确认录音_20240517.wav', '/tmp/demo3.wav', 1536000, 180.0, 'uploaded', now, now]);
    
    console.log('✓ 添加了3个音频文件');
    
    const segments = [
      { audio_id: audioId1, start: 0, end: 15, speaker: speakerId1, speakerName: '客服A', text: '您好，欢迎致电客服中心，请问有什么可以帮您的？', status: 'completed' },
      { audio_id: audioId1, start: 15, end: 30, speaker: speakerId2, speakerName: '客户B', text: '你好，我想咨询一下我上个月的账单问题。', status: 'completed' },
      { audio_id: audioId1, start: 30, end: 45, speaker: speakerId1, speakerName: '客服A', text: '好的，请您提供一下您的账号信息，我来帮您查询。', status: 'completed' },
      { audio_id: audioId1, start: 45, end: 60, speaker: speakerId2, speakerName: '客户B', text: '我的账号是138****5678。', status: 'completed' },
      { audio_id: audioId1, start: 60, end: 80, speaker: speakerId1, speakerName: '客服A', text: '好的，我已查看到您的账单。您上个月的消费是256元，主要是通话和流量费用。', status: 'pending' },
      { audio_id: audioId1, start: 80, end: 100, speaker: speakerId2, speakerName: '客户B', text: '哦，那为什么比上个月多了50元呢？', status: 'pending' },
      { audio_id: audioId1, start: 100, end: 120.5, speaker: speakerId1, speakerName: '客服A', text: '因为您这个月使用了漫游服务，具体扣费明细我可以发邮件给您。', status: 'pending' }
    ];
    
    for (const seg of segments) {
      const segId = uuidv4();
      await runAsync(`
        INSERT INTO audio_segments (id, audio_file_id, start_time, end_time, duration, text, speaker_id, speaker_name, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [segId, seg.audio_id, seg.start, seg.end, seg.end - seg.start, seg.text, seg.speaker, seg.speakerName, seg.status, 'system', now, now]);
    }
    
    console.log('✓ 添加了7个音频片段');
    console.log('\n✅ 测试数据初始化完成！');
    console.log('\n📊 数据概览:');
    console.log('  - 批次: 2');
    console.log('  - 说话人: 3');
    console.log('  - 音频文件: 3');
    console.log('  - 音频片段: 7');
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
  }
};

(async () => {
  console.log('数据库连接成功');
  await initTables();
  await initTestData();
  db.close();
})();