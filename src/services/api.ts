import ky, { type KyInstance } from 'ky'
import type {
  SearchResponse,
  SearchOnChatRequest,
  SearchOnMultiChatRequest,
  IndexChat,
  ApiResponse,
  ReplyMessageRequest,
  MessageResponse,
  FetchMessagesRequest,
} from '@/types/api'
import { buildReqToken } from '@/utils/helpers'

class ApiService {
  private baseURL: string
  private apiKey: string | null = null
  private instance: KyInstance

  constructor() {
    this.baseURL = '/api'
    this.apiKey = localStorage.getItem('btts_api_key')
    this.instance = this.createKyInstance()
  }

  setApiKey(key: string) {
    this.apiKey = key
    localStorage.setItem('btts_api_key', key)
    this.recreateKyInstance()
  }

  getApiKey() {
    return this.apiKey
  }

  clearApiKey() {
    this.apiKey = null
    localStorage.removeItem('btts_api_key')
    this.recreateKyInstance()
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`
    }

    return headers
  }

  private createKyInstance() {
    if (this.instance) {
      return this.instance
    }
    this.instance = ky.create({
      prefixUrl: this.baseURL,
      headers: this.getHeaders(),
      timeout: 30000,
    })
    return this.instance
  }

  private recreateKyInstance() {
    this.instance = ky.create({
      prefixUrl: this.baseURL,
      headers: this.getHeaders(),
      timeout: 30000,
    })
  }

  // 获取所有已索引的聊天，并返回当前 key 是否为 master
  async getIndexedChats(): Promise<{ chats: IndexChat[]; master: boolean }> {
    const api = this.createKyInstance()
    const response = await api.get('indexed').json<ApiResponse<IndexChat[]>>()
    return {
      chats: response.chats || [],
      master: response.master ?? false,
    }
  }

  // 获取指定聊天的索引信息
  async getChatIndex(chatId: number): Promise<IndexChat | null> {
    const api = this.createKyInstance()
    const response = await api.get(`index/${chatId}`).json<ApiResponse<IndexChat>>()
    return response.index || null
  }

  // 在指定聊天中搜索消息 (POST方法)
  async searchInChatByPost(chatId: number, request: SearchOnChatRequest): Promise<SearchResponse> {
    const api = this.createKyInstance()
    const response = await api
      .post(`index/${chatId}/search`, { json: request })
      .json<ApiResponse<SearchResponse>>()
    return (
      response.results || {
        hits: [],
        estimatedTotalHits: 0,
        limit: 10,
        offset: 0,
        processingTimeMs: 0,
        semanticHitCount: 0,
      }
    )
  }

  // 在多个聊天中搜索消息
  async searchInMultiChat(request: SearchOnMultiChatRequest): Promise<SearchResponse> {
    const api = this.createKyInstance()
    const response = await api
      .post('index/multi-search', { json: request })
      .json<ApiResponse<SearchResponse>>()
    return (
      response.results || {
        hits: [],
        estimatedTotalHits: 0,
        limit: 10,
        offset: 0,
        processingTimeMs: 0,
        semanticHitCount: 0,
      }
    )
  }

  // 获取附近/指定消息列表
  async fetchMessages(chatId: number, ids: number[]): Promise<SearchResponse> {
    const api = this.createKyInstance()
    const payload: FetchMessagesRequest = { ids }

    const response = await api
      .post(`index/${chatId}/msgs/fetch`, { json: payload })
      .json<ApiResponse<SearchResponse>>()

    return (
      response.results || {
        hits: [],
        estimatedTotalHits: 0,
        limit: 10,
        offset: 0,
        processingTimeMs: 0,
        semanticHitCount: 0,
      }
    )
  }

  async replyMessage(request: ReplyMessageRequest): Promise<MessageResponse> {
    const api = this.createKyInstance()
    const response = await api.post('client/reply', { json: request }).json<MessageResponse>()
    return response
  }

  async repeatMessage(chatId: number, messageId: number): Promise<MessageResponse> {
    const api = this.createKyInstance()
    const response = await api
      .post('client/forward', {
        json: { from_chat_id: chatId, to_chat_id: chatId, message_ids: [messageId] },
      })
      .json<MessageResponse>()
    return response
  }

  async streamFile(chatId: number, messageId: number): Promise<ReadableStream<Uint8Array>> {
    // 返回文件流
    const api = this.createKyInstance()
    const response = await api.get('client/filestream', {
      searchParams: { chat_id: chatId, message_id: messageId },
    })
    return response.body as ReadableStream<Uint8Array>
  }

  async buildReqToken(...params: string[]): Promise<string> {
    const token = await buildReqToken(this.apiKey, ...params)
    return token || ''
  }
}

export const apiService = new ApiService()
