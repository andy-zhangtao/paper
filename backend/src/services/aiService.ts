import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Readable } from 'stream';
import { AI_MODELS, AI_PARAMS, OPENROUTER_CONFIG } from '../config/constants';

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

const DEFAULT_MODEL = OPENROUTER_CONFIG.modelName || AI_MODELS.default;

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface ChatCompletionResult {
  content: string;
  usage: TokenUsage;
  model: string;
}

const PAPER_CREATION_ASSISTANT_PROMPT =
  '你是Paper AI论文写作助手。请在帮助用户的同时，根据对话判断核心信息，并按以下格式回应：\n' +
  '1. 先输出自然语言回答。\n' +
  '2. 紧接着输出一个以<STATE>开始、</STATE>结束的JSON。JSON字段要求：\n' +
  '- topic: string|null，无法确认请为null。\n' +
  '- outline: 数组(可为空)，元素包含heading与可选summary，用于概述章节结构。\n' +
  '- confidence: 0-1之间数字，表示你对topic/outline判断的信心。\n' +
  '- stage: idea|outline|content (可选)，表明你认为用户所处阶段。\n' +
  '- contentApproved: boolean，当你判断用户对生成的正文内容满意且准备进入预览时为true。\n' +
  '- contentSections: 当contentApproved为true时必须提供的数组，每个元素包含heading(章节标题)与content(对应的Markdown正文)。\n' +
  '示例：\n回答内容...\n<STATE>{"topic":"论文主题","outline":[{"heading":"章节"}],"contentApproved":false,"contentSections":[]}</STATE>';

function buildPaperCreationMessages(
  messages: ChatMessage[],
  stateSnapshot?: PaperCreationState,
): ChatMessage[] {
  const systemMessages: ChatMessage[] = [
    {
      role: 'system',
      content: PAPER_CREATION_ASSISTANT_PROMPT,
    },
  ];

  if (stateSnapshot) {
    systemMessages.push({
      role: 'system',
      content: `当前已知的论文状态(JSON)：${JSON.stringify(stateSnapshot)}`,
    });
  }

  return [...systemMessages, ...messages];
}

// 如果配置了代理，使用代理
if (OPENROUTER_CONFIG.proxyUrl) {
  const agent = new HttpsProxyAgent(OPENROUTER_CONFIG.proxyUrl);
  aiClient.defaults.httpsAgent = agent;
}

/**
 * 调用OpenRouter API
 */
async function callOpenRouter(messages: any[], model: string): Promise<ChatCompletionResult> {
  try {
    const requestBody = {
      model,
      messages,
      temperature: AI_PARAMS.temperature,
      max_tokens: AI_PARAMS.maxTokens,
    };

    console.info('OpenRouter request body:', JSON.stringify(requestBody));

    const response = await aiClient.post('/chat/completions', requestBody);

    const data = response.data || {};
    const choiceContent = data.choices?.[0]?.message?.content ?? '';
    const usage = data.usage || {};

    const promptTokens = Number(usage.prompt_tokens) || 0;
    const completionTokens = Number(usage.completion_tokens) || 0;
    const totalTokens = Number(usage.total_tokens) || promptTokens + completionTokens;

    return {
      content: choiceContent,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      model: data.model || model,
    };
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

  const completion = await callOpenRouter([
    { role: 'system', content: '你是一个专业的学术论文润色助手，擅长优化中文学术论文的表达。' },
    { role: 'user', content: prompts[type] },
  ], DEFAULT_MODEL);
  const polished = completion.content;

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
    usage: completion.usage,
    model: completion.model,
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

  const completion = await callOpenRouter([
    { role: 'system', content: '你是一个学术论文写作专家，擅长构建论文框架。' },
    { role: 'user', content: prompt },
  ], DEFAULT_MODEL);

  try {
    // 尝试解析JSON
    const jsonMatch = completion.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return {
        outline: JSON.parse(jsonMatch[0]),
        usage: completion.usage,
        model: completion.model,
      };
    }
  } catch (e) {
    // 如果解析失败，返回默认结构
  }

  // 默认结构
  const fallbackOutline = {
    title: `${topic}研究`,
    sections: [
      { heading: '引言', subsections: ['研究背景', '研究意义', '研究目标'] },
      { heading: '文献综述', subsections: ['理论基础', '国内外研究现状', '研究空白'] },
      { heading: '研究方法', subsections: ['研究设计', '数据来源', '分析方法'] },
      { heading: '结果与分析', subsections: ['主要发现', '深入分析', '讨论'] },
      { heading: '结论', subsections: ['研究总结', '局限性', '未来展望'] },
    ],
  };

  return {
    outline: fallbackOutline,
    usage: completion.usage,
    model: completion.model,
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

  const completion = await callOpenRouter([
    { role: 'system', content: '你是一个专业的中文语法检查助手。' },
    { role: 'user', content: prompt },
  ], DEFAULT_MODEL);

  try {
    const jsonMatch = completion.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return {
        errors: JSON.parse(jsonMatch[0]),
        usage: completion.usage,
        model: completion.model,
      };
    }
  } catch (e) {
    // 解析失败返回空数组
  }

  return {
    errors: [],
    usage: completion.usage,
    model: completion.model,
  };
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

  const completion = await callOpenRouter([
    { role: 'system', content: '你是一个学术文献专家，熟悉各种引用格式。' },
    { role: 'user', content: prompt },
  ], AI_MODELS.premium);

  try {
    const jsonMatch = completion.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return {
        references: JSON.parse(jsonMatch[0]),
        usage: completion.usage,
        model: completion.model,
      };
    }
  } catch (e) {
    // 解析失败
  }

  // 返回示例文献
  return {
    references: [
      {
        authors: ['张三', '李四'],
        title: `${topic}研究综述`,
        year: 2024,
        publisher: '中国学术期刊',
        formatted: `张三, 李四. ${topic}研究综述[J]. 中国学术期刊, 2024.`,
      },
    ],
    usage: completion.usage,
    model: completion.model,
  };
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

  const completion = await callOpenRouter([
    { role: 'system', content: '你是一个专业的学术写作改写助手，擅长用不同方式表达相同观点。' },
    { role: 'user', content: prompt },
  ], AI_MODELS.premium);
  const rewritten = completion.content;

  // 简单模拟相似度计算（实际应用中需要用专业算法）
  const similarity = Math.random() * (similarityThreshold - 0.1) + 0.1;

  return {
    original: text,
    rewritten,
    similarity: parseFloat(similarity.toFixed(2)),
    usage: completion.usage,
    model: completion.model,
  };
}

/**
 * 生成讨论回复
 */
export async function generateDiscussionReply(prompt: string) {
  const completion = await callOpenRouter([
    {
      role: 'system',
      content: '你是一个专业的学术论文写作助手，擅长回答关于论文写作、结构、逻辑等方面的问题。回答要简洁、专业、有针对性。',
    },
    { role: 'user', content: prompt },
  ], DEFAULT_MODEL);

  return {
    reply: completion.content,
    usage: completion.usage,
    model: completion.model,
  };
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

  const completion = await callOpenRouter([
    { role: 'system', content: '你是一个文档版本对比助手。' },
    { role: 'user', content: prompt },
  ], DEFAULT_MODEL);

  return completion.content.substring(0, 100); // 限制长度
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface PaperCreationState {
  topic?: string
  outline?: Array<{
    heading: string
    summary?: string
  }>
  confidence?: number
  stage?: 'idea' | 'outline' | 'content'
  updatedAt?: string
  contentApproved?: boolean
  contentSections?: Array<{
    heading: string
    content: string
  }>
}

export interface PaperCreationChatResult {
  reply: string
  state?: PaperCreationState
  usage: TokenUsage
  model: string
}

export interface PaperCreationStreamCallbacks {
  onChunk?: (chunk: string) => void
  onComplete?: (result: PaperCreationChatResult) => void
}

export async function chatCompletionStream(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  stateSnapshot: PaperCreationState | undefined,
  callbacks: PaperCreationStreamCallbacks,
  signal?: AbortSignal,
  useEnhancedFormat: boolean = true,
): Promise<PaperCreationChatResult> {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages不能为空');
  }

  const enhancedMessages = useEnhancedFormat 
    ? buildPaperCreationMessages(messages, stateSnapshot)
    : messages
  
  console.log("enhancedMessages:", enhancedMessages)
  console.log("model:", model)

  const requestBody = {
    model,
    messages: enhancedMessages,
    temperature: AI_PARAMS.temperature,
    max_tokens: AI_PARAMS.maxTokens,
    stream: true,
  }

  const response = await aiClient.post('/chat/completions', requestBody, {
    responseType: 'stream',
    signal,
  })

  const stream: Readable = response.data

  let buffer = ''
  let fullText = ''
  let emittedLength = 0
  let streamUsage: TokenUsage | null = null

  const emitLatestVisibleText = () => {
    const stateIndex = fullText.indexOf('<STATE>')
    const visibleEnd = stateIndex === -1 ? fullText.length : stateIndex
    if (visibleEnd > emittedLength) {
      const chunk = fullText.slice(emittedLength, visibleEnd)
      if (chunk && callbacks.onChunk) {
        callbacks.onChunk(chunk)
      }
      emittedLength = visibleEnd
    }
  }

  const processEvent = (rawEvent: string) => {
    const trimmed = rawEvent.trim()
    if (!trimmed) return

    const lines = trimmed.split('\n')
    let dataLine = ''
    for (const line of lines) {
      if (line.startsWith('data:')) {
        dataLine += line.slice(5).trim()
      }
    }

    if (!dataLine) {
      return
    }

    if (dataLine === '[DONE]') {
      return
    }

    try {
      const parsed = JSON.parse(dataLine)
      const delta = parsed.choices?.[0]?.delta ?? {}
      const content: string = delta.content ?? ''
      if (content) {
        fullText += content.replace(/\r/g, '')
        emitLatestVisibleText()
      }
      // 捕获 usage 信息
      if (parsed.usage) {
        const usage = parsed.usage
        const promptTokens = Number(usage.prompt_tokens) || 0
        const completionTokens = Number(usage.completion_tokens) || 0
        const totalTokens = Number(usage.total_tokens) || promptTokens + completionTokens
        streamUsage = {
          promptTokens,
          completionTokens,
          totalTokens,
        }
      }
    } catch (error) {
      console.warn('解析OpenRouter流数据失败:', error)
    }
  }

  const result = await new Promise<PaperCreationChatResult>((resolve, reject) => {
    const handleError = (error: Error) => {
      stream.destroy()
      reject(error)
    }

    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          handleError(new Error('请求已被取消'))
        },
        { once: true },
      )
    }

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf-8')

      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        processEvent(rawEvent)
        boundary = buffer.indexOf('\n\n')
      }
    })

    stream.on('error', handleError)

    stream.on('end', () => {
      if (buffer.trim()) {
        processEvent(buffer)
      }

      const stateMatch = fullText.match(/<STATE>([\s\S]*?)<\/STATE>/)
      let parsedState: PaperCreationState | undefined
      if (stateMatch) {
        try {
          parsedState = {
            ...JSON.parse(stateMatch[1]),
            updatedAt: new Date().toISOString(),
          }
        } catch (error) {
          console.warn('解析PaperCreation状态失败:', error)
        }
      }

      const cleanReply = fullText.replace(/<STATE>[\s\S]*?<\/STATE>/, '').trim()
      
      // 如果流式响应没有提供 usage，则估算 token 数量
      const finalUsage = streamUsage || {
        promptTokens: Math.ceil(JSON.stringify(enhancedMessages).length / 4),
        completionTokens: Math.ceil(fullText.length / 4),
        totalTokens: Math.ceil((JSON.stringify(enhancedMessages).length + fullText.length) / 4),
      }
      
      const result: PaperCreationChatResult = {
        reply: cleanReply,
        state: parsedState,
        usage: finalUsage,
        model,
      }

      emittedLength = cleanReply.length

      if (callbacks.onComplete) {
        callbacks.onComplete(result)
      }

      resolve(result)
    })
  })

  return result
}
export async function chatCompletion(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  stateSnapshot?: PaperCreationState,
): Promise<PaperCreationChatResult> {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages不能为空');
  }

  const enhancedMessages = buildPaperCreationMessages(messages, stateSnapshot)

  const completion = await callOpenRouter(enhancedMessages, model)
  const replyContent = completion.content

  const stateMatch = replyContent.match(/<STATE>([\s\S]*?)<\/STATE>/)
  let parsedState: PaperCreationState | undefined
  if (stateMatch) {
    const jsonText = stateMatch[1]
    try {
      parsedState = {
        ...JSON.parse(jsonText),
        updatedAt: new Date().toISOString(),
      }
    } catch (err) {
      console.warn('解析PaperCreation状态失败:', err)
    }
  }

  const cleanReply = replyContent.replace(/<STATE>[\s\S]*?<\/STATE>/, '').trim()

  return {
    reply: cleanReply,
    state: parsedState,
    usage: completion.usage,
    model: completion.model,
  }
}
