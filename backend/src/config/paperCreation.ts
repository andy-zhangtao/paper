export type PaperCreationStageCode = 'idea' | 'outline' | 'content'

interface PaperCreationStageConfig {
  code: PaperCreationStageCode
  displayName: string
  description?: string
}

export const PAPER_CREATION_STAGES: PaperCreationStageConfig[] = [
  {
    code: 'idea',
    displayName: '选择创意',
    description: '获取并打磨论文创意方向',
  },
  {
    code: 'outline',
    displayName: '生成大纲',
    description: '构建章节结构与重点内容',
  },
  {
    code: 'content',
    displayName: '填充内容',
    description: '根据大纲生成正文内容',
  },
]

const STAGE_CODE_SET = new Set(PAPER_CREATION_STAGES.map((stage) => stage.code))

export function isValidPaperCreationStage(value: string): value is PaperCreationStageCode {
  return STAGE_CODE_SET.has(value as PaperCreationStageCode)
}

export function getPaperCreationStage(code: PaperCreationStageCode) {
  return PAPER_CREATION_STAGES.find((stage) => stage.code === code)
}
