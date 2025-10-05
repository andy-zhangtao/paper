export type PromptScope = 'system' | 'user'
export type PaperCreationStageCode = 'idea' | 'outline'

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

export interface PaperCreationStateOutlineItem {
  heading: string
  summary?: string
}

export interface PaperCreationContentSection {
  heading: string
  content: string
  sectionId?: string
}

export interface PaperCreationState {
  topic?: string | null
  outline?: PaperCreationStateOutlineItem[]
  confidence?: number
  stage?: PaperCreationStageCode
  updatedAt?: string
  contentApproved?: boolean
  contentSections?: PaperCreationContentSection[]
}

export interface PaperCreationChatRequest {
  stage: PaperCreationStageCode
  promptId: string
  message: string
  history: PaperCreationChatMessage[]
  stateSnapshot?: PaperCreationState
}

export interface PaperCreationChatResponse {
  reply: string
  state?: PaperCreationState
}
