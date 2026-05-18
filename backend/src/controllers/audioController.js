const { allAsync, getAsync, runAsync } = require('../database');
const { v4: uuidv4 } = require('uuid');
const { successResponse, errorResponse } = require('../utils/response');
const path = require('path');
const fs = require('fs');

const getAudioFiles = async (req, res) => {
  try {
    const { batchId, page = 1, pageSize = 10, status } = req.query;
    const offset = (page - 1) * pageSize;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (batchId) {
      whereClause += ' AND batch_id = ?';
      params.push(batchId);
    }
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    const files = await allAsync(`
      SELECT * FROM audio_files 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [...params, parseInt(pageSize), offset]);
    
    const totalResult = await getAsync(`
      SELECT COUNT(*) as count FROM audio_files ${whereClause}
    `, params);
    
    successResponse(res, {
      list: files,
      total: totalResult.count,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (err) {
    errorResponse(res, '获取音频列表失败');
  }
};

const getAudioFile = async (req, res) => {
  try {
    const { id } = req.params;
    const file = await getAsync('SELECT * FROM audio_files WHERE id = ?', [id]);
    
    if (!file) {
      return errorResponse(res, '音频文件不存在', 404);
    }
    
    const segments = await allAsync(`
      SELECT seg.*, qc.conclusion as quality_conclusion
      FROM audio_segments seg
      LEFT JOIN quality_checks qc ON seg.id = qc.segment_id
      WHERE seg.audio_file_id = ?
      ORDER BY seg.start_time ASC
    `, [id]);
    
    successResponse(res, {
      ...file,
      segments
    });
  } catch (err) {
    errorResponse(res, '获取音频详情失败');
  }
};

const uploadAudio = async (req, res) => {
  try {
    const { batchId } = req.body;
    
    if (!batchId) {
      return errorResponse(res, '批次ID不能为空', 400);
    }
    
    if (!req.file) {
      return errorResponse(res, '请选择音频文件', 400);
    }
    
    const batch = await getAsync('SELECT * FROM batches WHERE id = ?', [batchId]);
    if (!batch) {
      return errorResponse(res, '批次不存在', 404);
    }
    
    const id = uuidv4();
    const now = Date.now();
    const filename = id + path.extname(req.file.originalname);
    
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, filename);
    fs.renameSync(req.file.path, filePath);
    
    const duration = 0;
    
    await runAsync(`
      INSERT INTO audio_files 
      (id, batch_id, filename, original_name, file_path, file_size, duration, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, batchId, filename, req.file.originalname, filePath, req.file.size, duration, now, now]);
    
    const file = await getAsync('SELECT * FROM audio_files WHERE id = ?', [id]);
    successResponse(res, file, '上传成功');
  } catch (err) {
    errorResponse(res, '上传失败');
  }
};

const serveAudio = async (req, res) => {
  try {
    const { filename } = req.params;
    const file = await getAsync('SELECT * FROM audio_files WHERE filename = ?', [filename]);
    
    if (!file) {
      return errorResponse(res, '音频文件不存在', 404);
    }
    
    if (fs.existsSync(file.file_path)) {
      res.sendFile(file.file_path);
    } else {
      errorResponse(res, '文件未找到', 404);
    }
  } catch (err) {
    errorResponse(res, '获取音频文件失败');
  }
};

const deleteAudio = async (req, res) => {
  try {
    const { id } = req.params;
    
    const file = await getAsync('SELECT * FROM audio_files WHERE id = ?', [id]);
    if (!file) {
      return errorResponse(res, '音频文件不存在', 404);
    }
    
    if (fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path);
    }
    
    await runAsync('DELETE FROM audio_files WHERE id = ?', [id]);
    successResponse(res, null, '删除成功');
  } catch (err) {
    errorResponse(res, '删除失败');
  }
};

module.exports = {
  getAudioFiles,
  getAudioFile,
  uploadAudio,
  serveAudio,
  deleteAudio
};