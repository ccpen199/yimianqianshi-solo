import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import * as userService from '../services/userService.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const users = await userService.getUsers();
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: '获取用户列表失败'
    });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await userService.getUserById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: '获取用户详情失败'
    });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '用户名和密码为必填项'
      });
    }
    
    const user = await userService.createUser(username, password, role || 'viewer');
    
    res.json({
      success: true,
      data: user,
      message: '用户创建成功'
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    if (error.message?.includes('UNIQUE')) {
      return res.status(400).json({
        success: false,
        error: '用户名已存在'
      });
    }
    res.status(500).json({
      success: false,
      error: '创建用户失败'
    });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { username, role } = req.body;
    
    const user = await userService.updateUser(id, { username, role });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: user,
      message: '用户更新成功'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: '更新用户失败'
    });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await userService.deleteUser(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: '删除用户失败'
    });
  }
});

export default router;
