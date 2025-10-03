import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import authRoutes from './routes/authRoutes';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/auth', authRoutes);

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

    app.listen(PORT, () => {
      console.log(`
🚀 Server running on http://localhost:${PORT}
📝 API docs: http://localhost:${PORT}/api
🔧 Environment: ${process.env.NODE_ENV || 'development'}
      `);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
