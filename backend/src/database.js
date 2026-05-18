const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './data/app.sqlite';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接错误:', err.message);
  } else {
    console.log('数据库连接成功');
    initTables();
  }
});

const initTables = () => {
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
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
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
      remark TEXT,
      FOREIGN KEY (audio_file_id) REFERENCES audio_files(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS speakers (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      name TEXT NOT NULL,
      role TEXT,
      color TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS revision_history (
      id TEXT PRIMARY KEY,
      segment_id TEXT NOT NULL,
      previous_text TEXT,
      new_text TEXT,
      previous_speaker_id TEXT,
      new_speaker_id TEXT,
      modified_by TEXT NOT NULL,
      modified_at INTEGER NOT NULL,
      FOREIGN KEY (segment_id) REFERENCES audio_segments(id) ON DELETE CASCADE
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
      comment TEXT,
      FOREIGN KEY (segment_id) REFERENCES audio_segments(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS sensitive_words (
      id TEXT PRIMARY KEY,
      segment_id TEXT NOT NULL,
      word TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (segment_id) REFERENCES audio_segments(id) ON DELETE CASCADE
    )`
  ];

  let index = 0;
  const createNext = () => {
    if (index < tables.length) {
      db.run(tables[index], (err) => {
        if (err) {
          console.error('创建表错误:', err.message);
        }
        index++;
        createNext();
      });
    } else {
      createIndexes();
    }
  };
  createNext();
};

const createIndexes = () => {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_audio_files_batch_id ON audio_files(batch_id)',
    'CREATE INDEX IF NOT EXISTS idx_audio_segments_file_id ON audio_segments(audio_file_id)',
    'CREATE INDEX IF NOT EXISTS idx_revision_segment_id ON revision_history(segment_id)',
    'CREATE INDEX IF NOT EXISTS idx_quality_check_segment_id ON quality_checks(segment_id)'
  ];

  let index = 0;
  const createNext = () => {
    if (index < indexes.length) {
      db.run(indexes[index], (err) => {
        if (err) {
          console.error('创建索引错误:', err.message);
        }
        index++;
        createNext();
      });
    }
  };
  createNext();
};

const allAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
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

const runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

module.exports = {
  db,
  allAsync,
  getAsync,
  runAsync
};