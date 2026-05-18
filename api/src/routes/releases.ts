import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import * as releaseService from '../services/releaseService.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const status = req.query.status as string;
    const releases = await releaseService.getReleases(status);
    
    res.json({
      success: true,
      data: releases
    });
  } catch (error) {
    console.error('Get releases error:', error);
    res.status(500).json({
      success: false,
      error: '获取发布列表失败'
    });
  }
});

router.get('/active', async (req: AuthRequest, res) => {
  try {
    const releases = await releaseService.getActiveReleases();
    
    res.json({
      success: true,
      data: releases
    });
  } catch (error) {
    console.error('Get active releases error:', error);
    res.status(500).json({
      success: false,
      error: '获取活跃发布失败'
    });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const release = await releaseService.getReleaseById(id);
    
    if (!release) {
      return res.status(404).json({
        success: false,
        error: '发布不存在'
      });
    }
    
    res.json({
      success: true,
      data: release
    });
  } catch (error) {
    console.error('Get release error:', error);
    res.status(500).json({
      success: false,
      error: '获取发布详情失败'
    });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { prompt_version_id, usage_scope } = req.body;
    
    if (!prompt_version_id) {
      return res.status(400).json({
        success: false,
        error: 'Prompt 版本 ID 为必填项'
      });
    }
    
    const release = await releaseService.createRelease(prompt_version_id, usage_scope || '');
    
    res.json({
      success: true,
      data: release,
      message: '发布申请创建成功'
    });
  } catch (error) {
    console.error('Create release error:', error);
    res.status(500).json({
      success: false,
      error: '创建发布申请失败'
    });
  }
});

router.post('/:id/approve', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { gray_ratio } = req.body;
    
    const release = await releaseService.approveRelease(id, req.user!.id, gray_ratio || 0);
    
    if (!release) {
      return res.status(404).json({
        success: false,
        error: '发布不存在'
      });
    }
    
    res.json({
      success: true,
      data: release,
      message: '发布审批通过'
    });
  } catch (error) {
    console.error('Approve release error:', error);
    res.status(500).json({
      success: false,
      error: '审批发布失败'
    });
  }
});

router.post('/:id/release', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const release = await releaseService.releaseToProduction(id);
    
    if (!release) {
      return res.status(404).json({
        success: false,
        error: '发布不存在'
      });
    }
    
    res.json({
      success: true,
      data: release,
      message: '已正式发布'
    });
  } catch (error) {
    console.error('Release to production error:', error);
    res.status(500).json({
      success: false,
      error: '正式发布失败'
    });
  }
});

router.post('/:id/rollback', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: '回滚原因为必填项'
      });
    }
    
    const release = await releaseService.rollbackRelease(id, reason);
    
    if (!release) {
      return res.status(404).json({
        success: false,
        error: '发布不存在'
      });
    }
    
    res.json({
      success: true,
      data: release,
      message: '回滚成功'
    });
  } catch (error) {
    console.error('Rollback release error:', error);
    res.status(500).json({
      success: false,
      error: '回滚失败'
    });
  }
});

router.post('/:id/reject', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: '拒绝原因为必填项'
      });
    }
    
    const release = await releaseService.rejectRelease(id, reason);
    
    if (!release) {
      return res.status(404).json({
        success: false,
        error: '发布不存在'
      });
    }
    
    res.json({
      success: true,
      data: release,
      message: '已拒绝发布申请'
    });
  } catch (error) {
    console.error('Reject release error:', error);
    res.status(500).json({
      success: false,
      error: '拒绝发布失败'
    });
  }
});

export default router;
