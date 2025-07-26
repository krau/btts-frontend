// API 类型定义

export interface SearchHit {
  _formatted?: {
    chat_id?: string
    id?: string
    message?: string
    timestamp?: string
    type?: string
    user_id?: string
  }
  chat_id: number
  chat_title?: string
  id: number
  message: string
  timestamp: number
  type: string
  user_full_name?: string
  user_id: number
}

export interface SearchResponse {
  estimatedTotalHits: number
  hits: SearchHit[]
  limit: number
  offset: number
  processingTimeMs: number
  semanticHitCount: number
}

export interface SearchOnChatRequest {
  query: string
  limit?: number
  offset?: number
  users?: number[]
  types?: string[]
}

export interface SearchOnMultiChatRequest {
  query: string
  chat_ids?: number[]
  limit?: number
  offset?: number
  users?: number[]
  types?: string[]
}

export interface IndexChat {
  chat_id: number
  no_delete: boolean
  public: boolean
  title: string
  type: number
  username: string
  watching: boolean
}

export interface ReplyMessageRequest {
  chat_id: number
  message_id: number
  text: string
}

export interface ReplyMessageResponse {
  status: string
  message: string
  // data: any // [TODO]
}

export interface ApiResponse<T> {
  status: string
  results?: T
  chats?: T
  index?: T
}

export const MESSAGE_TYPES = [
  'text',
  'photo',
  'video',
  'document',
  'voice',
  'audio',
  'poll',
  'story',
] as const

export type MessageType = (typeof MESSAGE_TYPES)[number]
