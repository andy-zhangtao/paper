export type PromptScope = 'system' | 'user'
export type PaperCreationStageCode = 'idea' | 'outline' | 'content'

export interface PromptTemplateSummary {
  id: string
  title: string
  scope: PromptScope
  content?: string
}

export interface PaperCreationStagePrompts {
  code: PaperCreationStageCode
  displayName: string
  description: string | null
  prompts: PromptTemplateSummary[]
}

export interface PaperCreationPromptsResponse {
  stages: PaperCreationStagePrompts[]
}

export interface PaperCreationChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface PaperCreationChatRequest {
  stage: PaperCreationStageCode
  promptId: string
  message: string
  history: PaperCreationChatMessage[]
}

export interface PaperCreationChatResponse {
  reply: string
}
