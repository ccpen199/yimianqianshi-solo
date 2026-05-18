const { allAsync, getAsync, runAsync } = require('../database');
const { v4: uuidv4 } = require('uuid');
const { successResponse, errorResponse } = require('../utils/response');

const getBatches = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    const offset = (page - 1) * pageSize;
    
    let whereClause = '';
    const params = [];
    
    if (status) {
      whereClause = 'WHERE status = ?';
      params.push(status);
    }
    
    const batches = await allAsync(`
      SELECT * FROM batches 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [...params, parseInt(pageSize), offset]);
    
    const totalResult = await getAsync(`
      SELECT COUNT(*) as count FROM batches ${whereClause}
    `, params);
    
    successResponse(res, {
      list: batches,
      total: totalResult.count,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (err) {
    errorResponse(res, '获取批次列表失败');
  }
};

const getBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await getAsync('SELECT * FROM batches WHERE id = ?', [id]);
    
    if (!batch) {
      return errorResponse(res, '批次不存在', 404);
    }
    
    const stats = await getAsync(`
      SELECT 
        COUNT(DISTINCT af.id) as file_count,
        COUNT(seg.id) as segment_count,
        SUM(CASE WHEN seg.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(af.duration) as total_duration
      FROM batches b
      LEFT JOIN audio_files af ON b.id = af.batch_id
      LEFT JOIN audio_segments seg ON af.id = seg.audio_file_id
      WHERE b.id = ?
    `, [id]);
    
    successResponse(res, {
      ...batch,
      ...stats
    });
  } catch (err) {
    errorResponse(res, '获取批次详情失败');
  }
};

const createBatch = async (req, res) => {
  try {
    const { name, source, sample_rate, noise_level, authorization_status, split_strategy, remark } = req.body;
    
    if (!name || !source) {
      return errorResponse(res, '批次名称和来源不能为空', 400);
    }
    
    const id = uuidv4();
    const now = Date.now();
    
    await runAsync(`
      INSERT INTO batches 
      (id, name, source, sample_rate, noise_level, authorization_status, split_strategy, remark, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, name, source, sample_rate || 16000, noise_level || 'unknown', authorization_status || 'pending', split_strategy || 'auto', remark || '', now, now]);
    
    const batch = await getAsync('SELECT * FROM batches WHERE id = ?', [id]);
    successResponse(res, batch);
  } catch (err) {
    errorResponse(res, '创建批次失败');
  }
};

const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, source, sample_rate, noise_level, authorization_status, split_strategy, status, remark } = req.body;
    
    const batch = await getAsync('SELECT * FROM batches WHERE id = ?', [id]);
    if (!batch) {
      return errorResponse(res, '批次不存在', 404);
    }
    
    const now = Date.now();
    
    await runAsync(`
      UPDATE batches 
      SET name = COALESCE(?, name),
          source = COALESCE(?, source),
          sample_rate = COALESCE(?, sample_rate),
          noise_level = COALESCE(?, noise_level),
          authorization_status = COALESCE(?, authorization_status),
          split_strategy = COALESCE(?, split_strategy),
          status = COALESCE(?, status),
          remark = COALESCE(?, remark),
          updated_at = ?
      WHERE id = ?
    `, [name, source, sample_rate, noise_level, authorization_status, split_strategy, status, remark, now, id]);
    
    const updated = await getAsync('SELECT * FROM batches WHERE id = ?', [id]);
    successResponse(res, updated);
  } catch (err) {
    errorResponse(res, '更新批次失败');
  }
};

const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    
    const batch = await getAsync('SELECT * FROM batches WHERE id = ?', [id]);
    if (!batch) {
      return errorResponse(res, '批次不存在', 404);
    }
    
    await runAsync('DELETE FROM batches WHERE id = ?', [id]);
    successResponse(res, null, '删除成功');
  } catch (err) {
    errorResponse(res, '删除批次失败');
  }
};

module.exports = {
  getBatches,
  getBatch,
  createBatch,
  updateBatch,
  deleteBatch
};