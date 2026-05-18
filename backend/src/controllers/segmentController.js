const { allAsync, getAsync, runAsync } = require('../database');
const { v4: uuidv4 } = require('uuid');
const { successResponse, errorResponse } = require('../utils/response');
const _ = require('lodash');

const getSegments = async (req, res) => {
  try {
    const { audioFileId, status } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (audioFileId) {
      whereClause += ' AND audio_file_id = ?';
      params.push(audioFileId);
    }
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    const segments = await allAsync(`
      SELECT * FROM audio_segments 
      ${whereClause}
      ORDER BY start_time ASC
    `, params);
    
    successResponse(res, segments);
  } catch (err) {
    errorResponse(res, '获取片段列表失败');
  }
};

const getSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const segment = await getAsync('SELECT * FROM audio_segments WHERE id = ?', [id]);
    
    if (!segment) {
      return errorResponse(res, '片段不存在', 404);
    }
    
    const revisions = await allAsync(`
      SELECT * FROM revision_history 
      WHERE segment_id = ? 
      ORDER BY modified_at DESC
    `, [id]);
    
    const sensitiveWords = await allAsync(`
      SELECT * FROM sensitive_words 
      WHERE segment_id = ?
    `, [id]);
    
    successResponse(res, {
      ...segment,
      revisions,
      sensitiveWords
    });
  } catch (err) {
    errorResponse(res, '获取片段详情失败');
  }
};

const createSegments = async (req, res) => {
  try {
    const { audioFileId, segments } = req.body;
    
    if (!audioFileId || !Array.isArray(segments) || segments.length === 0) {
      return errorResponse(res, '参数错误', 400);
    }
    
    const audioFile = await getAsync('SELECT * FROM audio_files WHERE id = ?', [audioFileId]);
    if (!audioFile) {
      return errorResponse(res, '音频文件不存在', 404);
    }
    
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const seg1 = segments[i];
        const seg2 = segments[j];
        if (!(seg1.end_time <= seg2.start_time || seg1.start_time >= seg2.end_time)) {
          return errorResponse(res, `时间轴重叠: 片段${i + 1}和片段${j + 1}`, 400);
        }
      }
    }
    
    const now = Date.now();
    const results = [];
    
    for (const seg of segments) {
      const id = uuidv4();
      const duration = seg.end_time - seg.start_time;
      
      await runAsync(`
        INSERT INTO audio_segments 
        (id, audio_file_id, start_time, end_time, duration, text, speaker_id, speaker_name, speaker_role, status, created_by, created_at, updated_at, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, audioFileId, seg.start_time, seg.end_time, duration, 
        seg.text || '', seg.speaker_id || null, seg.speaker_name || '', 
        seg.speaker_role || '', 'pending', 'user', now, now, seg.remark || '']);
      
      const created = await getAsync('SELECT * FROM audio_segments WHERE id = ?', [id]);
      results.push(created);
    }
    
    await runAsync('UPDATE audio_files SET status = ? WHERE id = ?', ['segmented', audioFileId]);
    
    successResponse(res, results, '切分成功');
  } catch (err) {
    errorResponse(res, '创建片段失败');
  }
};

const updateSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, speaker_id, speaker_name, speaker_role, start_time, end_time, status, remark, sensitiveWords } = req.body;
    
    const segment = await getAsync('SELECT * FROM audio_segments WHERE id = ?', [id]);
    if (!segment) {
      return errorResponse(res, '片段不存在', 404);
    }
    
    const now = Date.now();
    
    if (text !== undefined && text !== segment.text) {
      await runAsync(`
        INSERT INTO revision_history 
        (id, segment_id, previous_text, new_text, previous_speaker_id, new_speaker_id, modified_by, modified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), id, segment.text, text, segment.speaker_id, speaker_id, 'user', now]);
    }
    
    let duration = segment.duration;
    if (start_time !== undefined && end_time !== undefined) {
      duration = end_time - start_time;
      
      const overlaps = await allAsync(`
        SELECT id FROM audio_segments 
        WHERE audio_file_id = ? AND id != ?
        AND NOT (end_time <= ? OR start_time >= ?)
      `, [segment.audio_file_id, id, start_time, end_time]);
      
      if (overlaps.length > 0) {
        return errorResponse(res, '时间轴与其他片段重叠', 400);
      }
    }
    
    await runAsync(`
      UPDATE audio_segments 
      SET text = COALESCE(?, text),
          speaker_id = COALESCE(?, speaker_id),
          speaker_name = COALESCE(?, speaker_name),
          speaker_role = COALESCE(?, speaker_role),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          duration = ?,
          status = COALESCE(?, status),
          remark = COALESCE(?, remark),
          updated_at = ?
      WHERE id = ?
    `, [text, speaker_id, speaker_name, speaker_role, start_time, end_time, duration, status, remark, now, id]);
    
    if (Array.isArray(sensitiveWords)) {
      await runAsync('DELETE FROM sensitive_words WHERE segment_id = ?', [id]);
      for (const sw of sensitiveWords) {
        await runAsync(`
          INSERT INTO sensitive_words (id, segment_id, word, position, created_at)
          VALUES (?, ?, ?, ?, ?)
        `, [uuidv4(), id, sw.word, sw.position, now]);
      }
    }
    
    const updated = await getAsync('SELECT * FROM audio_segments WHERE id = ?', [id]);
    successResponse(res, updated, '保存成功');
  } catch (err) {
    errorResponse(res, '保存失败');
  }
};

const autoSplit = async (req, res) => {
  try {
    const { audioFileId, minDuration = 3, maxDuration = 30 } = req.body;
    
    if (!audioFileId) {
      return errorResponse(res, '音频文件ID不能为空', 400);
    }
    
    const audioFile = await getAsync('SELECT * FROM audio_files WHERE id = ?', [audioFileId]);
    if (!audioFile) {
      return errorResponse(res, '音频文件不存在', 404);
    }
    
    const duration = audioFile.duration || 60;
    const segments = [];
    let currentTime = 0;
    
    while (currentTime < duration) {
      const segDuration = Math.min(maxDuration, duration - currentTime);
      if (segDuration >= minDuration) {
        segments.push({
          start_time: currentTime,
          end_time: currentTime + segDuration
        });
      }
      currentTime += segDuration;
    }
    
    const now = Date.now();
    
    for (const seg of segments) {
      await runAsync(`
        INSERT INTO audio_segments 
        (id, audio_file_id, start_time, end_time, duration, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), audioFileId, seg.start_time, seg.end_time, seg.end_time - seg.start_time,
        'pending', 'system', now, now]);
    }
    
    await runAsync('UPDATE audio_files SET status = ? WHERE id = ?', ['segmented', audioFileId]);
    
    const createdSegments = await allAsync(`
      SELECT * FROM audio_segments WHERE audio_file_id = ? ORDER BY start_time ASC
    `, [audioFileId]);
    
    successResponse(res, createdSegments, '自动切分成功');
  } catch (err) {
    errorResponse(res, '自动切分失败');
  }
};

module.exports = {
  getSegments,
  getSegment,
  createSegments,
  updateSegment,
  autoSplit
};