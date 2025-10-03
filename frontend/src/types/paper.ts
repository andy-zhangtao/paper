export interface Paper {
  id: string
  userId: string
  title: string
  content: string
  wordCount: number
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePaperRequest {
  title: string
  content?: string
}

export interface UpdatePaperRequest {
  title?: string
  content?: string
  isArchived?: boolean
}
