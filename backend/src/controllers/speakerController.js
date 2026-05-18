const { allAsync, getAsync, runAsync } = require('../database');
const { v4: uuidv4 } = require('uuid');
const { successResponse, errorResponse } = require('../utils/response');

const getSpeakers = async (req, res) => {
  try {
    const { batchId } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (batchId) {
      whereClause = 'WHERE batch_id = ?';
      params.push(batchId);
    }
    
    const speakers = await allAsync(`
      SELECT * FROM speakers 
      ${whereClause}
      ORDER BY created_at ASC
    `, params);
    
    successResponse(res, speakers);
  } catch (err) {
    errorResponse(res, '获取说话人列表失败');
  }
};

const createSpeaker = async (req, res) => {
  try {
    const { batch_id, name, role, color } = req.body;
    
    if (!name) {
      return errorResponse(res, '说话人名称不能为空', 400);
    }
    
    const id = uuidv4();
    const now = Date.now();
    
    await runAsync(`
      INSERT INTO speakers (id, batch_id, name, role, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, batch_id || null, name, role || '', color || getRandomColor(), now, now]);
    
    const speaker = await getAsync('SELECT * FROM speakers WHERE id = ?', [id]);
    successResponse(res, speaker);
  } catch (err) {
    errorResponse(res, '创建说话人失败');
  }
};

const updateSpeaker = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, color } = req.body;
    
    const speaker = await getAsync('SELECT * FROM speakers WHERE id = ?', [id]);
    if (!speaker) {
      return errorResponse(res, '说话人不存在', 404);
    }
    
    const now = Date.now();
    
    await runAsync(`
      UPDATE speakers 
      SET name = COALESCE(?, name),
          role = COALESCE(?, role),
          color = COALESCE(?, color),
          updated_at = ?
      WHERE id = ?
    `, [name, role, color, now, id]);
    
    const updated = await getAsync('SELECT * FROM speakers WHERE id = ?', [id]);
    successResponse(res, updated);
  } catch (err) {
    errorResponse(res, '更新说话人失败');
  }
};

const deleteSpeaker = async (req, res) => {
  try {
    const { id } = req.params;
    
    const speaker = await getAsync('SELECT * FROM speakers WHERE id = ?', [id]);
    if (!speaker) {
      return errorResponse(res, '说话人不存在', 404);
    }
    
    await runAsync('DELETE FROM speakers WHERE id = ?', [id]);
    successResponse(res, null, '删除成功');
  } catch (err) {
    errorResponse(res, '删除说话人失败');
  }
};

function getRandomColor() {
  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96', '#13c2c2'];
  return colors[Math.floor(Math.random() * colors.length)];
}

module.exports = {
  getSpeakers,
  createSpeaker,
  updateSpeaker,
  deleteSpeaker
};