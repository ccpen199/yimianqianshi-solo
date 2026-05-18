const { allAsync, getAsync, runAsync } = require('../database');
const { v4: uuidv4 } = require('uuid');
const { successResponse, errorResponse } = require('../utils/response');

const createQualityCheck = async (req, res) => {
  try {
    const { segment_id, wer, missing_count, time_offset, rework_count, conclusion, comment } = req.body;
    
    if (!segment_id || !conclusion) {
      return errorResponse(res, '参数错误', 400);
    }
    
    const segment = await getAsync('SELECT * FROM audio_segments WHERE id = ?', [segment_id]);
    if (!segment) {
      return errorResponse(res, '片段不存在', 404);
    }
    
    const id = uuidv4();
    const now = Date.now();
    
    await runAsync(`
      INSERT INTO quality_checks 
      (id, segment_id, checker, checked_at, wer, missing_count, time_offset, rework_count, conclusion, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, segment_id, 'checker', now, wer || 0, missing_count || 0, time_offset || 0, rework_count || 0, conclusion, comment || '']);
    
    if (conclusion === 'pass') {
      await runAsync('UPDATE audio_segments SET status = ? WHERE id = ?', ['completed', segment_id]);
    } else {
      await runAsync('UPDATE audio_segments SET status = ? WHERE id = ?', ['rework', segment_id]);
    }
    
    const qc = await getAsync('SELECT * FROM quality_checks WHERE id = ?', [id]);
    successResponse(res, qc, '质检完成');
  } catch (err) {
    errorResponse(res, '质检失败');
  }
};

const getQualityChecks = async (req, res) => {
  try {
    const { segmentId, batchId } = req.query;
    
    let query = `
      SELECT seg.id, seg.text, seg.start_time, seg.end_time, seg.speaker_name, 
             af.original_name, af.batch_id, qc.conclusion, qc.checked_at,
             qc.wer, qc.missing_count, qc.time_offset, qc.comment
      FROM audio_segments seg
      JOIN audio_files af ON seg.audio_file_id = af.id
      LEFT JOIN quality_checks qc ON seg.id = qc.segment_id
      WHERE 1=1
    `;
    const params = [];
    
    if (segmentId) {
      query += ' AND seg.id = ?';
      params.push(segmentId);
    }
    
    if (batchId) {
      query += ' AND af.batch_id = ?';
      params.push(batchId);
    }
    
    query += ' ORDER BY seg.start_time ASC';
    
    const checks = await allAsync(query, params);
    successResponse(res, checks);
  } catch (err) {
    errorResponse(res, '获取质检记录失败');
  }
};

const getQualityStats = async (req, res) => {
  try {
    const { batchId } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (batchId) {
      whereClause = 'WHERE af.batch_id = ?';
      params.push(batchId);
    }
    
    const stats = await getAsync(`
      SELECT 
        COUNT(DISTINCT seg.id) as total_segments,
        COUNT(DISTINCT CASE WHEN seg.status = 'completed' THEN seg.id END) as completed_segments,
        COUNT(DISTINCT CASE WHEN seg.status = 'rework' THEN seg.id END) as rework_segments,
        AVG(qc.wer) as avg_wer,
        SUM(qc.missing_count) as total_missing,
        AVG(qc.time_offset) as avg_time_offset
      FROM audio_segments seg
      JOIN audio_files af ON seg.audio_file_id = af.id
      LEFT JOIN quality_checks qc ON seg.id = qc.segment_id
      ${whereClause}
    `, params);
    
    successResponse(res, stats);
  } catch (err) {
    errorResponse(res, '获取质检统计失败');
  }
};

const exportData = async (req, res) => {
  try {
    const { batchId } = req.body;
    
    if (!batchId) {
      return errorResponse(res, '批次ID不能为空', 400);
    }
    
    const batch = await getAsync('SELECT * FROM batches WHERE id = ?', [batchId]);
    if (!batch) {
      return errorResponse(res, '批次不存在', 404);
    }
    
    const audioFiles = await allAsync(`
      SELECT * FROM audio_files WHERE batch_id = ?
    `, [batchId]);
    
    const segments = await allAsync(`
      SELECT seg.*, qc.conclusion, qc.wer
      FROM audio_segments seg
      JOIN audio_files af ON seg.audio_file_id = af.id
      LEFT JOIN quality_checks qc ON seg.id = qc.segment_id
      WHERE af.batch_id = ?
      ORDER BY seg.start_time ASC
    `, [batchId]);
    
    const exportData = {
      batch,
      export_time: Date.now(),
      audio_files: audioFiles,
      segments: segments,
      summary: {
        total_files: audioFiles.length,
        total_segments: segments.length,
        completed_segments: segments.filter(s => s.status === 'completed').length,
        total_duration: audioFiles.reduce((sum, f) => sum + (f.duration || 0), 0)
      }
    };
    
    successResponse(res, exportData);
  } catch (err) {
    errorResponse(res, '导出失败');
  }
};

module.exports = {
  createQualityCheck,
  getQualityChecks,
  getQualityStats,
  exportData
};