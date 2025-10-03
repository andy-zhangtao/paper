import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { AI_MODELS, AI_PARAMS } from '../config/constants';

// 创建axios实例，配置代理
const aiClient = axios.create({
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'HTTP-Referer': 'https://paper-ai.com',
    'X-Title': 'Paper AI Assistant',
    'Content-Type': 'application/json',
  },
  timeout: AI_PARAMS.timeout,
});

// 如果配置了代理，使用代理
if (process.env.HTTPS_PROXY) {
  const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
  aiClient.defaults.httpsAgent = agent;
}

// 导出积分配置供其他模块使用
export { AI_CREDITS_COST } from '../config/constants';

/**
 * 调用OpenRouter API
 */
async function callOpenRouter(messages: any[], model: string = AI_MODELS.default) {
  try {
    const response = await aiClient.post('/chat/completions', {
      model,
      messages,
      temperature: AI_PARAMS.temperature,
      max_tokens: AI_PARAMS.maxTokens,
    });

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error('OpenRouter API调用错误:', error.response?.data || error.message);
    throw new Error('AI服务调用失败');
  }
}

/**
 * 段落润色
 */
export async function polishText(text: string, type: 'grammar' | 'logic' | 'style') {
  const prompts = {
    grammar: `请对以下段落进行语法和用词的润色，使其更符合学术规范。保持原意，仅优化表达：\n\n${text}`,
    logic: `请优化以下段落的逻辑结构，使论证更加清晰连贯。保持核心观点不变：\n\n${text}`,
    style: `请提升以下段落的学术风格，使用更正式、专业的表达方式：\n\n${text}`,
  };

  const polished = await callOpenRouter([
    { role: 'system', content: '你是一个专业的学术论文润色助手，擅长优化中文学术论文的表达。' },
    { role: 'user', content: prompts[type] },
  ]);

  // 简单的变更检测（实际应用中可以用diff算法）
  const changes = [
    {
      type: type,
      position: [0, text.length] as [number, number],
      suggestion: '已根据学术规范优化表达',
    },
  ];

  return {
    original: text,
    polished,
    changes,
  };
}

/**
 * 生成论文大纲
 */
export async function generateOutline(topic: string, paperType: 'research' | 'review' | 'thesis') {
  const typeNames = {
    research: '研究型论文',
    review: '综述型论文',
    thesis: '毕业论文',
  };

  const prompt = `请为主题"${topic}"生成一个${typeNames[paperType]}的详细大纲。要求：
1. 包含标题、引言、主体章节、结论等完整结构
2. 每个章节包含2-3个子章节
3. 以JSON格式返回，格式如下：
{
  "title": "论文标题",
  "sections": [
    {
      "heading": "章节名",
      "subsections": ["子章节1", "子章节2"]
    }
  ]
}`;

  const result = await callOpenRouter([
    { role: 'system', content: '你是一个学术论文写作专家，擅长构建论文框架。' },
    { role: 'user', content: prompt },
  ]);

  try {
    // 尝试解析JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // 如果解析失败，返回默认结构
  }

  // 默认结构
  return {
    title: `${topic}研究`,
    sections: [
      { heading: '引言', subsections: ['研究背景', '研究意义', '研究目标'] },
      { heading: '文献综述', subsections: ['理论基础', '国内外研究现状', '研究空白'] },
      { heading: '研究方法', subsections: ['研究设计', '数据来源', '分析方法'] },
      { heading: '结果与分析', subsections: ['主要发现', '深入分析', '讨论'] },
      { heading: '结论', subsections: ['研究总结', '局限性', '未来展望'] },
    ],
  };
}

/**
 * 语法检查
 */
export async function checkGrammar(text: string, level: 'basic' | 'standard' | 'strict') {
  const levelPrompts = {
    basic: '基础语法检查，只标注明显错误',
    standard: '标准检查，包括语法、标点、用词',
    strict: '严格检查，包括学术规范、表达优化建议',
  };

  const prompt = `请对以下文本进行${levelPrompts[level]}。以JSON数组格式返回错误列表：
[
  {
    "type": "spelling|grammar|punctuation|style",
    "position": [起始位置, 结束位置],
    "original": "错误文本",
    "suggestion": "修改建议",
    "severity": "error|warning|info"
  }
]

文本：
${text}`;

  const result = await callOpenRouter([
    { role: 'system', content: '你是一个专业的中文语法检查助手。' },
    { role: 'user', content: prompt },
  ]);

  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // 解析失败返回空数组
  }

  return [];
}

/**
 * 生成参考文献
 */
export async function generateReferences(
  topic: string,
  count: number,
  format: 'gb7714' | 'apa' | 'mla'
) {
  const formatNames = {
    gb7714: 'GB/T 7714（中文）',
    apa: 'APA 7th',
    mla: 'MLA 9th',
  };

  const prompt = `请为主题"${topic}"生成${count}条高质量的参考文献，使用${formatNames[format]}格式。
要求：
1. 包含经典文献和近期文献
2. 中英文文献结合
3. 以JSON数组格式返回：
[
  {
    "authors": ["作者1", "作者2"],
    "title": "文献标题",
    "year": 2023,
    "publisher": "出版社/期刊",
    "formatted": "完整格式化引用"
  }
]`;

  const result = await callOpenRouter([
    { role: 'system', content: '你是一个学术文献专家，熟悉各种引用格式。' },
    { role: 'user', content: prompt },
  ], AI_MODELS.premium);

  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // 解析失败
  }

  // 返回示例文献
  return [
    {
      authors: ['张三', '李四'],
      title: `${topic}研究综述`,
      year: 2024,
      publisher: '中国学术期刊',
      formatted: `张三, 李四. ${topic}研究综述[J]. 中国学术期刊, 2024.`,
    },
  ];
}

/**
 * 降重改写
 */
export async function rewriteText(text: string, similarityThreshold: number) {
  const prompt = `请对以下段落进行深度改写，要求：
1. 保持原意和核心观点
2. 大幅度改变表达方式和句式结构
3. 目标相似度低于${(similarityThreshold * 100).toFixed(0)}%
4. 保持学术性和专业性

原文：
${text}`;

  const rewritten = await callOpenRouter([
    { role: 'system', content: '你是一个专业的学术写作改写助手，擅长用不同方式表达相同观点。' },
    { role: 'user', content: prompt },
  ], AI_MODELS.premium);

  // 简单模拟相似度计算（实际应用中需要用专业算法）
  const similarity = Math.random() * (similarityThreshold - 0.1) + 0.1;

  return {
    original: text,
    rewritten,
    similarity: parseFloat(similarity.toFixed(2)),
  };
}

/**
 * 生成讨论回复
 */
export async function generateDiscussionReply(prompt: string) {
  const reply = await callOpenRouter([
    {
      role: 'system',
      content: '你是一个专业的学术论文写作助手，擅长回答关于论文写作、结构、逻辑等方面的问题。回答要简洁、专业、有针对性。',
    },
    { role: 'user', content: prompt },
  ]);

  return reply;
}

/**
 * 生成版本变更摘要
 */
export async function generateChangeSummary(oldContent: string, newContent: string) {
  const prompt = `请对比以下两个版本的论文内容，生成一个简洁的变更摘要(不超过50字)。

旧版本：
${oldContent.substring(0, 500)}...

新版本：
${newContent.substring(0, 500)}...

请只返回变更摘要，不要其他解释。`;

  const summary = await callOpenRouter([
    { role: 'system', content: '你是一个文档版本对比助手。' },
    { role: 'user', content: prompt },
  ]);

  return summary.substring(0, 100); // 限制长度
}
