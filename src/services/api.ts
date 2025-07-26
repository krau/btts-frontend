import ky, { type KyInstance } from 'ky'
import type {
  SearchResponse,
  SearchOnChatRequest,
  SearchOnMultiChatRequest,
  IndexChat,
  ApiResponse,
  ReplyMessageRequest,
  ReplyMessageResponse,
} from '@/types/api'

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

  // 获取所有已索引的聊天
  async getIndexedChats(): Promise<IndexChat[]> {
    const api = this.createKyInstance()
    const response = await api.get('indexed').json<ApiResponse<IndexChat[]>>()
    return response.chats || []
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

  async replyMessage(request: ReplyMessageRequest): Promise<ReplyMessageResponse> {
    const api = this.createKyInstance()
    const response = await api.post('client/reply', { json: request }).json<ReplyMessageResponse>()
    return response
  }
}

export const apiService = new ApiService()
