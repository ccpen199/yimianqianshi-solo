import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import * as evaluationService from '../services/evaluationService.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const promptVersionId = req.query.prompt_version_id ? parseInt(req.query.prompt_version_id as string) : undefined;
    const status = req.query.status as string;
    const evaluations = await evaluationService.getEvaluations(promptVersionId, status);
    
    res.json({
      success: true,
      data: evaluations
    });
  } catch (error) {
    console.error('Get evaluations error:', error);
    res.status(500).json({
      success: false,
      error: '获取评测列表失败'
    });
  }
});

router.get('/errors', async (req: AuthRequest, res) => {
  try {
    const promptVersionId = req.query.prompt_version_id ? parseInt(req.query.prompt_version_id as string) : undefined;
    const errorEvaluations = await evaluationService.getErrorEvaluations(promptVersionId);
    
    res.json({
      success: true,
      data: errorEvaluations
    });
  } catch (error) {
    console.error('Get error evaluations error:', error);
    res.status(500).json({
      success: false,
      error: '获取异常评测失败'
    });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const evaluation = await evaluationService.getEvaluationById(id);
    
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: '评测不存在'
      });
    }
    
    res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    console.error('Get evaluation error:', error);
    res.status(500).json({
      success: false,
      error: '获取评测详情失败'
    });
  }
});

router.post('/run', async (req: AuthRequest, res) => {
  try {
    const { prompt_version_id, test_case_id } = req.body;
    
    if (!prompt_version_id || !test_case_id) {
      return res.status(400).json({
        success: false,
        error: 'Prompt 版本 ID 和测试用例 ID 为必填项'
      });
    }
    
    const evaluation = await evaluationService.runEvaluation(prompt_version_id, test_case_id);
    
    res.json({
      success: true,
      data: evaluation,
      message: '评测执行成功'
    });
  } catch (error) {
    console.error('Run evaluation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '执行评测失败'
    });
  }
});

router.post('/run-batch', async (req: AuthRequest, res) => {
  try {
    const { prompt_version_id, test_case_ids } = req.body;
    
    if (!prompt_version_id || !Array.isArray(test_case_ids) || test_case_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Prompt 版本 ID 和测试用例 ID 列表为必填项'
      });
    }
    
    const evaluations = await evaluationService.runBatchEvaluation(prompt_version_id, test_case_ids);
    
    res.json({
      success: true,
      data: evaluations,
      message: '批量评测执行成功'
    });
  } catch (error) {
    console.error('Run batch evaluation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '执行批量评测失败'
    });
  }
});

export default router;
