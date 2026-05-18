import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import * as monitoringService from '../services/monitoringService.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const stats = await monitoringService.getDashboardStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败'
    });
  }
});

router.get('/trend', async (req: AuthRequest, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const trend = await monitoringService.getCallTrend(days);
    
    res.json({
      success: true,
      data: trend
    });
  } catch (error) {
    console.error('Get call trend error:', error);
    res.status(500).json({
      success: false,
      error: '获取调用趋势失败'
    });
  }
});

router.get('/score-distribution', async (req: AuthRequest, res) => {
  try {
    const distribution = await monitoringService.getScoreDistribution();
    
    res.json({
      success: true,
      data: distribution
    });
  } catch (error) {
    console.error('Get score distribution error:', error);
    res.status(500).json({
      success: false,
      error: '获取分数分布失败'
    });
  }
});

router.get('/complaints', async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const complaints = await monitoringService.getRecentComplaints(limit);
    
    res.json({
      success: true,
      data: complaints
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({
      success: false,
      error: '获取投诉列表失败'
    });
  }
});

router.get('/version-comparison', async (req: AuthRequest, res) => {
  try {
    const releaseIdsParam = req.query.release_ids as string;
    if (!releaseIdsParam) {
      return res.status(400).json({
        success: false,
        error: '请提供 release_ids 参数'
      });
    }
    const releaseIds = releaseIdsParam.split(',').map(id => parseInt(id));
    const comparison = await monitoringService.getVersionComparison(releaseIds);
    
    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Get version comparison error:', error);
    res.status(500).json({
      success: false,
      error: '获取版本对比失败'
    });
  }
});

router.post('/logs', async (req: AuthRequest, res) => {
  try {
    const { release_id, event_type, data } = req.body;
    
    if (!release_id || !event_type) {
      return res.status(400).json({
        success: false,
        error: 'release_id 和 event_type 为必填项'
      });
    }
    
    const logId = await monitoringService.addMonitoringLog(release_id, event_type, data || {});
    
    res.json({
      success: true,
      data: { id: logId },
      message: '监控日志添加成功'
    });
  } catch (error) {
    console.error('Add monitoring log error:', error);
    res.status(500).json({
      success: false,
      error: '添加监控日志失败'
    });
  }
});

export default router;
