import type { User, AuthResponse } from '@/types/user'
import type { Paper } from '@/types/paper'
import type { CreditBalance, CreditTransaction, RechargePackage } from '@/types/credit'
import type {
  PaperCreationPromptsResponse,
  PaperCreationChatRequest,
  PaperCreationChatResponse,
  PaperCreationStageCode,
} from '@/types/prompt'

// Mock 用户数据
export const mockUser: User = {
  id: '1',
  email: 'demo@example.com',
  username: '演示用户',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
  createdAt: '2024-01-01T00:00:00Z'
}

// Mock 认证响应
export const mockAuthResponse: AuthResponse = {
  user: mockUser,
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token'
}

// Mock 论文数据
export const mockPapers: Paper[] = [
  {
    id: '1',
    userId: '1',
    title: '基于深度学习的图像识别技术研究',
    content: '本文研究了深度学习在图像识别领域的应用...',
    wordCount: 5234,
    isArchived: false,
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-02T15:30:00Z'
  },
  {
    id: '2',
    userId: '1',
    title: '人工智能伦理问题探讨',
    content: '随着人工智能技术的快速发展，伦理问题日益凸显...',
    wordCount: 8120,
    isArchived: false,
    createdAt: '2024-02-15T14:20:00Z',
    updatedAt: '2024-02-20T09:45:00Z'
  },
  {
    id: '3',
    userId: '1',
    title: '区块链技术在供应链管理中的应用',
    content: '区块链技术具有去中心化、不可篡改等特性...',
    wordCount: 6890,
    isArchived: true,
    createdAt: '2024-01-10T08:15:00Z',
    updatedAt: '2024-01-25T16:00:00Z'
  }
]

// Mock 积分余额
export const mockCreditBalance: CreditBalance = {
  balance: 2580,
  totalEarned: 5000,
  totalConsumed: 2420
}

// Mock 积分流水
export const mockTransactions: CreditTransaction[] = [
  {
    id: '1',
    userId: '1',
    type: 'recharge',
    amount: 1000,
    balanceBefore: 1580,
    balanceAfter: 2580,
    orderId: 'ORD-20240301-001',
    description: '充值1000积分',
    createdAt: '2024-03-01T10:00:00Z'
  },
  {
    id: '2',
    userId: '1',
    type: 'consume',
    amount: -50,
    balanceBefore: 1630,
    balanceAfter: 1580,
    aiTaskId: 'TASK-20240228-015',
    description: 'AI润色 - 深度学习研究论文',
    createdAt: '2024-02-28T15:30:00Z'
  },
  {
    id: '3',
    userId: '1',
    type: 'consume',
    amount: -80,
    balanceBefore: 1710,
    balanceAfter: 1630,
    aiTaskId: 'TASK-20240228-014',
    description: 'AI翻译 - 中文翻译英文',
    createdAt: '2024-02-28T14:20:00Z'
  },
  {
    id: '4',
    userId: '1',
    type: 'reward',
    amount: 100,
    balanceBefore: 1610,
    balanceAfter: 1710,
    description: '首次充值奖励',
    createdAt: '2024-02-25T09:00:00Z'
  }
]

// Mock 充值套餐
export const mockRechargePackages: RechargePackage[] = [
  {
    id: 'pkg-1',
    credits: 1000,
    price: 10,
    bonus: 100,
    isPopular: false
  },
  {
    id: 'pkg-2',
    credits: 3000,
    price: 30,
    bonus: 500,
    isPopular: true
  },
  {
    id: 'pkg-3',
    credits: 5000,
    price: 50,
    bonus: 1000,
    isPopular: false
  },
  {
    id: 'pkg-4',
    credits: 10000,
    price: 100,
    bonus: 3000,
    isPopular: false
  }
]

export const mockPaperCreationPrompts: PaperCreationPromptsResponse = {
  stages: [
    {
      code: 'idea',
      displayName: '选择创意',
      description: '帮助用户确定论文研究方向与创意亮点',
      prompts: [
        {
          id: 'idea-system-1',
          title: '学术创意提炼专家',
          scope: 'system',
        },
        {
          id: 'idea-user-1',
          title: '聚焦AI伦理选题',
          scope: 'user',
          content: '请围绕人工智能伦理与治理方向，帮助我提出3个具有研究价值的论文题目，并说明创新点。',
        },
        {
          id: 'idea-user-2',
          title: '关注可持续发展',
          scope: 'user',
          content: '基于可持续发展视角，给出关于能源管理或环境治理的论文选题建议。',
        },
      ],
    },
    {
      code: 'outline',
      displayName: '生成大纲',
      description: '梳理论文的章节结构与逻辑',
      prompts: [
        {
          id: 'outline-system-1',
          title: '结构化写作导师',
          scope: 'system',
        },
        {
          id: 'outline-user-1',
          title: '强调实验设计',
          scope: 'user',
          content: '请在大纲中重点突出实验设计章节，包含数据来源、实验方法和结果分析部分。',
        },
      ],
    },
    {
      code: 'content',
      displayName: '填充内容',
      description: '根据大纲撰写具体正文',
      prompts: [
        {
          id: 'content-system-1',
          title: '严谨写作助手',
          scope: 'system',
        },
        {
          id: 'content-user-1',
          title: '强调实证分析',
          scope: 'user',
          content: '撰写正文时请详细展开实证分析部分，给出可能的数据指标和分析方法。',
        },
      ],
    },
  ],
}

export const mockPaperCreationChat = async (
  payload: PaperCreationChatRequest,
): Promise<PaperCreationChatResponse> => {
  const { stage, message } = payload
  let reply = ''

  if (stage === 'idea') {
    reply = `根据你的想法「${message}」，我梳理了三个可供选择的论文创意：\n\n1. **数据驱动的伦理决策模型**：从算法透明度与责任分配角度切入，探讨如何在实际部署中保证公平性。\n2. **人机协同下的医疗诊断伦理框架**：聚焦AI辅助诊断过程中的隐私、安全与知情同意问题。\n3. **生成式AI内容审核策略研究**：分析不同审核机制对虚假信息与版权风险的应对效果。\n\n如果满意，可以回复「确认」继续生成大纲；如需调整，请描述你的偏好。`
  } else if (stage === 'outline') {
    reply = `我已经根据你的需求草拟了论文大纲结构：\n\n## 论文大纲\n\n### 1. 引言\n- 研究背景与问题陈述\n- 研究意义与创新点\n\n### 2. 理论基础与相关工作\n- 核心理论框架\n- 国内外研究进展\n\n### 3. 研究设计\n- 数据来源与预处理\n- 模型或方法设计\n- 实验方案与评估指标\n\n### 4. 实验与结果分析\n- 实验结果展示\n- 对比分析与讨论\n\n### 5. 结论与展望\n- 研究结论\n- 局限性与未来工作方向\n\n如需强调特定章节，请告诉我，我可以进一步调整。`
  } else {
    reply = `下面是正文草稿的首段内容示例：\n\n## 1. 引言\n随着人工智能技术的迅速发展，伦理治理问题逐渐成为学术界与产业界关注的焦点。现有研究多聚焦于算法公平性、隐私保护以及透明度三大维度，但在具体应用场景中仍面临落地难题。为回应这一挑战，本研究以${message}为切入点，构建兼顾技术可行性与伦理可接受性的分析框架。\n\n需要我继续完善后续章节吗？`
  }

  return mockApiResponse({ reply }, 800)
}

// Mock API 延迟
export const delay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms))

// Mock API 响应包装器
export const mockApiResponse = async <T>(data: T, delayMs: number = 500): Promise<T> => {
  await delay(delayMs)
  return data
}

// Mock 错误响应
export const mockApiError = async (message: string, delayMs: number = 500): Promise<never> => {
  await delay(delayMs)
  throw new Error(message)
}
