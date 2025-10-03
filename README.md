# 智能论文写作辅助平台

> 面向大学生的AI论文辅助工具，提供智能润色、大纲生成、版本管理等功能

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

---

## 📚 项目文档

### 核心文档
- [项目概述](docs/01-project-overview.md) - 项目定位、核心功能、用户画像
- [商业模式](docs/02-business-model.md) - 积分体系、盈利方案、转化策略
- [技术栈](docs/03-tech-stack.md) - 前后端技术选型、部署方案

### 技术文档
- [数据库设计](docs/04-database-design.md) - ER图、表结构、索引优化
- [API设计](docs/05-api-design.md) - 接口规范、请求响应格式
- [代理配置指南](docs/08-proxy-setup.md) - ⚠️ OpenRouter API代理配置（必读）

### 项目管理
- [开发计划](docs/06-development-plan.md) - MVP开发排期、里程碑
- [风险与应对](docs/07-risks-and-solutions.md) - 技术风险、业务风险、应急预案

---

## 🎯 快速开始

### 环境要求
```bash
Node.js >= 18
PostgreSQL >= 14
Redis >= 7
pnpm >= 8
代理工具: Clash/V2Ray (国内开发必须)
```

### ⚠️ 重要前置步骤：配置代理

由于项目使用OpenRouter API，**国内必须配置代理才能开发**。

**快速配置**:
```bash
# 1. 启动Clash/V2Ray，开启系统代理（通常端口7890）

# 2. 验证代理可用
curl -x http://127.0.0.1:7890 https://openrouter.ai/api/v1/models

# 3. 创建环境变量文件
cat > backend/.env.development <<EOF
HTTPS_PROXY=http://127.0.0.1:7890
HTTP_PROXY=http://127.0.0.1:7890
OPENROUTER_API_KEY=your_api_key_here
APP_URL=http://localhost:5173
EOF
```

详细配置方案见 **[代理配置指南](docs/08-proxy-setup.md)**

---

### 本地开发

**1. 克隆项目**
```bash
git clone <repo-url>
cd paper
```

**2. 启动数据库（Docker）**
```bash
docker-compose up -d postgres redis
```

**3. 配置环境变量**
```bash
# 后端配置（必须包含代理配置）
cp backend/.env.example backend/.env.development
# 编辑 backend/.env.development，添加：
# HTTPS_PROXY=http://127.0.0.1:7890
# OPENROUTER_API_KEY=your_key

# 前端配置
cp frontend/.env.example frontend/.env.development
```

**4. 后端启动**
```bash
cd backend
pnpm install
pnpm run start:dev
```

**5. 前端启动**
```bash
cd frontend
pnpm install
pnpm run dev
```

**6. 访问**
```
前端: http://localhost:5173
后端: http://localhost:3000/api
```

---

## 🏗️ 项目结构

```
paper/
├── frontend/              # React前端
│   ├── src/
│   │   ├── components/   # UI组件
│   │   ├── features/     # 业务模块
│   │   ├── hooks/        # 自定义Hooks
│   │   └── stores/       # Zustand状态
│   └── package.json
│
├── backend/              # NestJS后端
│   ├── src/
│   │   ├── modules/      # 业务模块
│   │   ├── common/       # 公共模块
│   │   └── config/       # 配置
│   └── package.json
│
├── docs/                 # 文档
├── docker-compose.yml    # 本地开发环境
└── README.md
```

---

## ✨ 核心功能

### 📝 智能写作辅助
- AI大纲生成
- 段落润色（语法/逻辑/文风）
- 全文语法检查
- 参考文献生成
- 降重改写

### 📄 论文管理
- 富文本编辑器（基于Tiptap）
- 自动保存
- 版本历史
- 版本对比与回滚

### 💬 智能讨论
- 针对段落提问
- AI分析与建议
- 讨论历史记录

### 💰 积分系统
- 按需付费（积分制）
- 多档位充值
- 流水查询

---

## 🛠️ 技术栈

### 前端
- **框架**: React 18 + TypeScript + Vite
- **编辑器**: Tiptap
- **样式**: TailwindCSS + shadcn/ui
- **状态**: Zustand
- **请求**: React Query + Axios

### 后端
- **框架**: NestJS + TypeScript
- **数据库**: PostgreSQL 14 + Redis 7
- **ORM**: TypeORM
- **认证**: JWT + bcrypt
- **LLM**: OpenRouter API (需代理访问)
- **代理**: https-proxy-agent

### DevOps
- **部署**: Docker + Nginx
- **监控**: Sentry + 自建日志
- **CI/CD**: GitHub Actions

详细技术栈说明见 [技术栈文档](docs/03-tech-stack.md)

---

## 📊 开发进度

### ✅ 已完成
- [x] 项目初始化
- [x] 文档编写
- [x] 技术选型

### ⏳ 进行中
- [ ] MVP开发（Week 1-2）
  - [ ] 用户系统
  - [ ] 富文本编辑器
  - [ ] AI功能
  - [ ] 充值系统

### 📅 计划中
- [ ] 版本管理（Week 3）
- [ ] 讨论区（Week 3）
- [ ] 运营功能（Week 4）
- [ ] 上线部署（Week 4）

详细排期见 [开发计划](docs/06-development-plan.md)

---

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

### 开发流程
1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交变更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交Pull Request

### 代码规范
- ESLint + Prettier
- Commit信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 📧 联系方式

- 项目负责人: [Your Name]
- Email: [your.email@example.com]
- Issue: [GitHub Issues](https://github.com/yourusername/paper/issues)

---

## 🙏 致谢

- [Tiptap](https://tiptap.dev/) - 富文本编辑器
- [NestJS](https://nestjs.com/) - 后端框架
- [阿里云通义千问](https://tongyi.aliyun.com/) - LLM服务

---

## ⚠️ 免责声明

本平台仅为学术写作辅助工具，不承担用户使用本工具产生的学术诚信问题。用户需遵守所在学校的学术规范，AI生成内容仅供参考，需自行审核。
