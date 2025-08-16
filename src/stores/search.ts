import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiService } from '@/services/api'
import type { SearchHit, IndexChat, SearchOnMultiChatRequest } from '@/types/api'

export const useSearchStore = defineStore('search', () => {
  // 状态
  const searchResults = ref<SearchHit[]>([])
  const isLoading = ref(false)
  const totalHits = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(12)
  const processingTime = ref(0)
  const semanticHitCount = ref(0)

  // 搜索参数
  const query = ref('')
  const selectedChatIds = ref<number[]>([])
  const selectedUserIds = ref<number[]>([])
  const selectedTypes = ref<string[]>([])

  // 聊天列表
  const indexedChats = ref<IndexChat[]>([])
  const isLoadingChats = ref(false)

  // 计算属性
  const totalPages = computed(() => Math.ceil(totalHits.value / pageSize.value))
  const offset = computed(() => (currentPage.value - 1) * pageSize.value)

  // API Key 管理
  const apiKey = ref(apiService.getApiKey())
  const isApiKeyConfigured = computed(() => !!apiKey.value)

  function setApiKey(key: string) {
    apiKey.value = key
    apiService.setApiKey(key)
  }

  function clearApiKey() {
    apiKey.value = null
    apiService.clearApiKey()
  }

  // 加载聊天列表
  async function loadIndexedChats() {
    if (!isApiKeyConfigured.value) return

    isLoadingChats.value = true
    try {
      indexedChats.value = await apiService.getIndexedChats()
    } catch (error) {
      throw error
    } finally {
      isLoadingChats.value = false
    }
  }

  // 执行搜索
  async function search() {
    if (!isApiKeyConfigured.value) return

    isLoading.value = true
    try {
      const request: SearchOnMultiChatRequest = {
        query: query.value.trim(),
        limit: pageSize.value,
        offset: offset.value,
      }

      if (selectedChatIds.value.length > 0) {
        request.chat_ids = selectedChatIds.value
      }

      if (selectedUserIds.value.length > 0) {
        request.users = selectedUserIds.value
      }

      if (selectedTypes.value.length > 0) {
        request.types = selectedTypes.value
      }

      const response = await apiService.searchInMultiChat(request)

      searchResults.value = response.hits
      totalHits.value = response.estimatedTotalHits
      processingTime.value = response.processingTimeMs
      semanticHitCount.value = response.semanticHitCount
    } catch (error) {
      console.error('Search failed:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 重置搜索
  function resetSearch() {
    searchResults.value = []
    totalHits.value = 0
    currentPage.value = 1
    processingTime.value = 0
    semanticHitCount.value = 0
  }

  // 跳转到指定页面
  async function goToPage(page: number) {
    if (page < 1 || page > totalPages.value) return
    currentPage.value = page
    await search()
  }

  // 设置查询参数
  function setQuery(newQuery: string) {
    query.value = newQuery
    currentPage.value = 1
    resetSearch()
  }

  function setSelectedChatIds(chatIds: number[]) {
    selectedChatIds.value = chatIds
    currentPage.value = 1
  }

  function setSelectedUserIds(userIds: number[]) {
    selectedUserIds.value = userIds
    currentPage.value = 1
  }

  function setSelectedTypes(types: string[]) {
    selectedTypes.value = types
    currentPage.value = 1
  }

  function setPageSize(size: number) {
    pageSize.value = size
    currentPage.value = 1
  }

  return {
    // 状态
    searchResults,
    isLoading,
    totalHits,
    currentPage,
    pageSize,
    processingTime,
    semanticHitCount,

    // 搜索参数
    query,
    selectedChatIds,
    selectedUserIds,
    selectedTypes,

    // 聊天列表
    indexedChats,
    isLoadingChats,

    // 计算属性
    totalPages,
    offset,

    // API Key
    apiKey,
    isApiKeyConfigured,

    // 方法
    setApiKey,
    clearApiKey,
    loadIndexedChats,
    search,
    resetSearch,
    goToPage,
    setQuery,
    setSelectedChatIds,
    setSelectedUserIds,
    setSelectedTypes,
    setPageSize,
  }
})
