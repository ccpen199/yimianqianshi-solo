import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import * as promptService from '../services/promptService.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await promptService.getPrompts(page, pageSize);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get prompts error:', error);
    res.status(500).json({
      success: false,
      error: '获取 Prompt 列表失败'
    });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const prompt = await promptService.getPromptById(id);
    
    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: 'Prompt 不存在'
      });
    }
    
    res.json({
      success: true,
      data: prompt
    });
  } catch (error) {
    console.error('Get prompt error:', error);
    res.status(500).json({
      success: false,
      error: '获取 Prompt 详情失败'
    });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, content, variables_json, example_input, scenario, risk_description } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: '名称和内容为必填项'
      });
    }
    
    const prompt = await promptService.createPrompt({
      name,
      content,
      variables_json,
      example_input,
      scenario,
      risk_description,
      status: 'draft',
      created_by: req.user!.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: prompt,
      message: 'Prompt 创建成功'
    });
  } catch (error) {
    console.error('Create prompt error:', error);
    res.status(500).json({
      success: false,
      error: '创建 Prompt 失败'
    });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, content, variables_json, example_input, scenario, risk_description, status } = req.body;
    
    const prompt = await promptService.updatePrompt(id, {
      name,
      content,
      variables_json,
      example_input,
      scenario,
      risk_description,
      status
    });
    
    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: 'Prompt 不存在'
      });
    }
    
    res.json({
      success: true,
      data: prompt,
      message: 'Prompt 更新成功'
    });
  } catch (error) {
    console.error('Update prompt error:', error);
    res.status(500).json({
      success: false,
      error: '更新 Prompt 失败'
    });
  }
});

router.get('/:id/versions', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const versions = await promptService.getPromptVersions(id);
    
    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    console.error('Get prompt versions error:', error);
    res.status(500).json({
      success: false,
      error: '获取版本历史失败'
    });
  }
});

router.post('/:id/versions', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { content, variables_json, change_description } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: '内容为必填项'
      });
    }
    
    const version = await promptService.createPromptVersion(
      id,
      content,
      variables_json,
      change_description || '',
      req.user!.id
    );
    
    res.json({
      success: true,
      data: version,
      message: '版本创建成功'
    });
  } catch (error) {
    console.error('Create prompt version error:', error);
    res.status(500).json({
      success: false,
      error: '创建版本失败'
    });
  }
});

export default router;
