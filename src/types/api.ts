// API 类型定义

export interface SearchHit {
  _formatted?: {
    chat_id?: string
    id?: string
    message?: string
    ocred?: string
    aigenerated?: string
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
  full_text: string
  ocred?: string
  aigenerated?: string
  full_formatted_text: string
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
  disable_ocred?: boolean // [TODO]
  enable_aigenerated?: boolean // [TODO]
  limit?: number
  offset?: number
  users?: number[]
  types?: string[]
}

export interface SearchOnMultiChatRequest {
  query: string
  disable_ocred?: boolean // [TODO]
  enable_aigenerated?: boolean // [TODO]
  // 搜索所有已索引聊天, 否则使用 chat_ids 指定的聊天列表
  // 只有 master API Key 才能使用, 否则无效
  // chat_ids 和 all_chats 必须至少指定一个
  all_chats?: boolean
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

export interface MessageResponse {
  status: string
  message: string
  // data: any // [TODO]
}

export interface ForwardMessagesRequest {
  from_chat_id: number
  to_chat_id: number
  message_ids: number[]
}

export interface ApiResponse<T> {
  status: string
  results?: T
  chats?: T
  index?: T
  // 标识当前 API Key 是否为 master key（仅部分接口返回）
  master?: boolean
}

export interface FetchMessagesRequest {
  ids: number[]
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
