#!/usr/bin/env tsx
/**
 * OpenRouter代理测试脚本
 * 用于验证代理配置是否正确
 *
 * 使用方法:
 *   pnpm tsx scripts/test-proxy.ts
 */

import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import * as dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.example' })

interface TestResult {
  step: string
  status: 'success' | 'failed'
  message: string
  details?: any
}

const results: TestResult[] = []

function log(result: TestResult) {
  results.push(result)
  const emoji = result.status === 'success' ? '✅' : '❌'
  console.log(`${emoji} ${result.step}: ${result.message}`)
  if (result.details) {
    console.log(`   详情: ${JSON.stringify(result.details, null, 2)}`)
  }
}

async function testProxyConfig() {
  console.log('🚀 开始测试OpenRouter代理配置...\n')

  // 1. 检查环境变量
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!proxyUrl) {
    log({
      step: '环境变量检查',
      status: 'failed',
      message: '未配置代理！请设置 HTTPS_PROXY 环境变量'
    })
    return false
  }

  log({
    step: '环境变量检查',
    status: 'success',
    message: '代理配置已找到',
    details: { proxy: proxyUrl }
  })

  // 2. 测试代理连通性
  try {
    await axios.get('https://www.google.com', {
      httpsAgent: new HttpsProxyAgent(proxyUrl),
      timeout: 10000
    })

    log({
      step: '代理连通性',
      status: 'success',
      message: '代理服务正常工作'
    })
  } catch (err: any) {
    log({
      step: '代理连通性',
      status: 'failed',
      message: `代理连接失败: ${err.message}`,
      details: {
        code: err.code,
        errno: err.errno
      }
    })
    return false
  }

  // 3. 测试OpenRouter连接
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      httpsAgent: new HttpsProxyAgent(proxyUrl),
      timeout: 15000
    })

    log({
      step: 'OpenRouter连接',
      status: 'success',
      message: `成功获取模型列表 (${response.data.data.length} 个模型)`,
      details: {
        models_count: response.data.data.length,
        sample_models: response.data.data.slice(0, 3).map((m: any) => m.id)
      }
    })
  } catch (err: any) {
    log({
      step: 'OpenRouter连接',
      status: 'failed',
      message: `无法访问OpenRouter: ${err.message}`,
      details: {
        status: err.response?.status,
        statusText: err.response?.statusText
      }
    })
    return false
  }

  // 4. 测试API调用（如果有API Key）
  if (apiKey && apiKey !== 'sk-or-v1-xxxxxxxxxxxxxxxx') {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'openai/gpt-3.5-turbo',
          messages: [
            { role: 'user', content: '你好，这是一个测试消息，请回复OK' }
          ],
          max_tokens: 10
        },
        {
          httpsAgent: new HttpsProxyAgent(proxyUrl),
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      log({
        step: 'API调用测试',
        status: 'success',
        message: 'API调用成功',
        details: {
          model: response.data.model,
          usage: response.data.usage,
          reply: response.data.choices[0].message.content
        }
      })
    } catch (err: any) {
      log({
        step: 'API调用测试',
        status: 'failed',
        message: `API调用失败: ${err.message}`,
        details: {
          status: err.response?.status,
          error: err.response?.data
        }
      })
      return false
    }
  } else {
    log({
      step: 'API调用测试',
      status: 'failed',
      message: '跳过（未配置有效的 OPENROUTER_API_KEY）'
    })
  }

  return true
}

async function testProxySpeed() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  if (!proxyUrl) return

  console.log('\n⏱️  测试代理响应速度...\n')

  const urls = [
    'https://openrouter.ai/api/v1/models',
    'https://api.openai.com',  // 对比测试
  ]

  for (const url of urls) {
    const start = Date.now()
    try {
      await axios.get(url, {
        httpsAgent: new HttpsProxyAgent(proxyUrl),
        timeout: 10000
      })
      const duration = Date.now() - start
      console.log(`✅ ${url}: ${duration}ms`)
    } catch (err: any) {
      const duration = Date.now() - start
      console.log(`❌ ${url}: ${duration}ms (${err.message})`)
    }
  }
}

async function main() {
  const success = await testProxyConfig()

  if (success) {
    await testProxySpeed()
  }

  console.log('\n' + '='.repeat(60))
  const successCount = results.filter(r => r.status === 'success').length
  const totalCount = results.filter(r => r.status !== 'failed' || r.message !== '跳过（未配置有效的 OPENROUTER_API_KEY）').length

  if (successCount === totalCount) {
    console.log('🎉 所有测试通过！代理配置正确，可以开始开发。')
  } else {
    console.log(`⚠️  ${successCount}/${totalCount} 测试通过，请检查失败项。`)
  }

  console.log('='.repeat(60) + '\n')

  // 输出配置建议
  if (successCount < totalCount) {
    console.log('📝 配置建议：\n')
    console.log('1. 确保Clash/V2Ray已启动且开启系统代理')
    console.log('2. 检查代理端口是否为 7890 (Clash) 或 10809 (V2Ray)')
    console.log('3. 运行命令验证: curl -x http://127.0.0.1:7890 https://openrouter.ai')
    console.log('4. 如果仍然失败，尝试切换代理节点\n')
  }

  process.exit(success ? 0 : 1)
}

main().catch(err => {
  console.error('❌ 测试脚本执行失败:', err)
  process.exit(1)
})
