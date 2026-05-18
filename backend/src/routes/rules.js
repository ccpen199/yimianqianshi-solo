const express = require('express');
const { dbAll, dbGet, dbRun } = require('../database/db');
const scoringEngine = require('../services/scoringEngine');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const rules = await dbAll('SELECT * FROM scoring_rules ORDER BY created_at DESC');
    
    res.json({
      success: true,
      data: rules.map(r => ({
        ...r,
        profile_rules: JSON.parse(r.profile_rules),
        behavior_rules: JSON.parse(r.behavior_rules),
        negative_rules: JSON.parse(r.negative_rules)
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/active', async (req, res) => {
  try {
    const rule = await dbGet('SELECT * FROM scoring_rules WHERE is_active = 1');
    
    if (!rule) {
      return res.status(404).json({ success: false, error: 'No active rule found' });
    }

    res.json({
      success: true,
      data: {
        ...rule,
        profile_rules: JSON.parse(rule.profile_rules),
        behavior_rules: JSON.parse(rule.behavior_rules),
        negative_rules: JSON.parse(rule.negative_rules)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { version, name, description, profile_rules, behavior_rules, negative_rules } = req.body;

    const existing = await dbGet('SELECT * FROM scoring_rules WHERE version = ?', [version]);
    if (existing) {
      return res.status(400).json({ success: false, error: '版本号已存在' });
    }

    await dbRun('BEGIN');

    await dbRun('UPDATE scoring_rules SET is_active = 0');

    await dbRun(`
      INSERT INTO scoring_rules (version, name, description, profile_rules, behavior_rules, negative_rules, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      version,
      name,
      description,
      JSON.stringify(profile_rules),
      JSON.stringify(behavior_rules),
      JSON.stringify(negative_rules),
      1
    ]);

    await dbRun('COMMIT');

    await scoringEngine.loadActiveRules();

    res.json({ success: true, message: '评分规则已创建并激活' });
  } catch (error) {
    await dbRun('ROLLBACK');
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/activate', async (req, res) => {
  try {
    const rule = await dbGet('SELECT * FROM scoring_rules WHERE id = ?', [req.params.id]);
    
    if (!rule) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    await dbRun('BEGIN');
    await dbRun('UPDATE scoring_rules SET is_active = 0');
    await dbRun('UPDATE scoring_rules SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    await dbRun('COMMIT');

    await scoringEngine.loadActiveRules();

    res.json({ success: true, message: '评分规则已激活' });
  } catch (error) {
    await dbRun('ROLLBACK');
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const rule = await dbGet('SELECT * FROM scoring_rules WHERE id = ?', [req.params.id]);
    
    if (!rule) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    if (rule.is_active) {
      return res.status(400).json({ success: false, error: '不能删除正在使用的规则' });
    }

    await dbRun('DELETE FROM scoring_rules WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: '评分规则已删除' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
