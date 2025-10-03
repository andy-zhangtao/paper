import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import authRoutes from './routes/authRoutes';
import { SERVER_CONFIG, CORS_CONFIG } from './config/constants';

// 加载环境变量
dotenv.config();

const app = express();

// 中间件
app.use(cors({
  origin: CORS_CONFIG.origin,
  credentials: CORS_CONFIG.credentials,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 用户端路由
app.use('/api/auth', authRoutes);
import paperRoutes from './routes/paperRoutes';
app.use('/api/papers', paperRoutes);
import creditsRoutes from './routes/creditsRoutes';
app.use('/api/credits', creditsRoutes);
import aiRoutes from './routes/aiRoutes';
app.use('/api/ai', aiRoutes);
import userRoutes from './routes/userRoutes';
app.use('/api/user', userRoutes);

// 管理员路由
import adminAuthRoutes from './routes/adminAuthRoutes';
import adminUserRoutes from './routes/adminUserRoutes';
import adminStatsRoutes from './routes/adminStatsRoutes';
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/stats', adminStatsRoutes);

// 健康检查
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('⚠️  数据库连接失败，服务器启动中止');
      process.exit(1);
    }

    app.listen(SERVER_CONFIG.port, () => {
      console.log(`
🚀 Server running on http://localhost:${SERVER_CONFIG.port}
📝 API docs: http://localhost:${SERVER_CONFIG.port}/api
🔧 Environment: ${SERVER_CONFIG.env}
      `);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
