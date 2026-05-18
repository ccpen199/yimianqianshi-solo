import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import * as testCaseService from '../services/testCaseService.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const promptId = req.query.prompt_id ? parseInt(req.query.prompt_id as string) : undefined;
    const testCases = await testCaseService.getTestCases(promptId);
    
    res.json({
      success: true,
      data: testCases
    });
  } catch (error) {
    console.error('Get test cases error:', error);
    res.status(500).json({
      success: false,
      error: '获取测试用例列表失败'
    });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const testCase = await testCaseService.getTestCaseById(id);
    
    if (!testCase) {
      return res.status(404).json({
        success: false,
        error: '测试用例不存在'
      });
    }
    
    res.json({
      success: true,
      data: testCase
    });
  } catch (error) {
    console.error('Get test case error:', error);
    res.status(500).json({
      success: false,
      error: '获取测试用例详情失败'
    });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, input_data, expected_output, prompt_id } = req.body;
    
    if (!name || !input_data) {
      return res.status(400).json({
        success: false,
        error: '名称和输入数据为必填项'
      });
    }
    
    const testCase = await testCaseService.createTestCase({
      name,
      input_data,
      expected_output,
      prompt_id,
      created_by: req.user!.id,
      created_at: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: testCase,
      message: '测试用例创建成功'
    });
  } catch (error) {
    console.error('Create test case error:', error);
    res.status(500).json({
      success: false,
      error: '创建测试用例失败'
    });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, input_data, expected_output, prompt_id } = req.body;
    
    const testCase = await testCaseService.updateTestCase(id, {
      name,
      input_data,
      expected_output,
      prompt_id
    });
    
    if (!testCase) {
      return res.status(404).json({
        success: false,
        error: '测试用例不存在'
      });
    }
    
    res.json({
      success: true,
      data: testCase,
      message: '测试用例更新成功'
    });
  } catch (error) {
    console.error('Update test case error:', error);
    res.status(500).json({
      success: false,
      error: '更新测试用例失败'
    });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await testCaseService.deleteTestCase(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '测试用例不存在'
      });
    }
    
    res.json({
      success: true,
      message: '测试用例删除成功'
    });
  } catch (error) {
    console.error('Delete test case error:', error);
    res.status(500).json({
      success: false,
      error: '删除测试用例失败'
    });
  }
});

export default router;
