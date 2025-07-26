<template>
  <div class="space-y-4" ref="searchResultsContainer">
    <!-- 搜索结果列表 -->
    <div
      v-if="searchResults.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <Card
        v-for="hit in searchResults"
        :key="`${hit.chat_id}-${hit.id}`"
        class="transition-all duration-200 h-full flex flex-col"
      >
        <CardContent class="p-4 flex-1 flex flex-col">
          <div class="space-y-3 flex-1 flex flex-col">
            <!-- 用户和聊天信息 -->
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center space-x-2">
                <Badge :variant="getMessageTypeVariant(hit.type)">
                  {{ formatMessageType(hit.type) }}
                </Badge>
                <UserIcon class="h-4 w-4 text-muted-foreground" />
                <span
                  class="font-medium cursor-pointer"
                  @click="copyMessage(hit.user_id.toString())"
                >
                  {{ hit.user_full_name }}
                </span>
              </div>
              <a
                class="flex items-center space-x-2 text-muted-foreground hover:text-primary"
                :href="`https://t.me/c/${hit.chat_id}/${hit.id}`"
                target="_blank"
              >
                <MessageCircleIcon class="h-4 w-4 text-muted-foreground" />
                <span>
                  {{ hit.chat_title || `Chat ${hit.chat_id}` }}
                </span>
              </a>
            </div>

            <!-- 消息内容 -->
            <div class="space-y-2 flex-1 flex flex-col">
              <div
                class="message-content text-sm leading-relaxed p-3 bg-muted/50 rounded-md break-words flex-1"
                v-html="highlightedMessage(hit)"
              />
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center justify-between pt-2">
              <div class="flex items-center space-x-2 text-sm text-muted-foreground">
                <ClockIcon class="h-3 w-3" />
                <span>{{ formatTimestamp(hit.timestamp) }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <Button variant="outline" size="sm" @click="toggleExpanded(hit.id)">
                  <ArrowDownIcon
                    class="mr-1 h-3 w-3"
                    :class="expandedMessages.has(hit.id) ? 'rotate-180' : ''"
                  />
                  {{ expandedMessages.has(hit.id) ? '收起全文' : '展开全文' }}
                </Button>
                <Button variant="outline" size="sm" @click="copyMessage(hit.message)">
                  <CopyIcon class="mr-1 h-3 w-3" />
                  复制
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!isLoading" class="text-center py-12">
      <SearchXIcon class="mx-auto h-12 w-12 text-muted-foreground/50" />
      <h3 class="mt-4 text-lg font-medium">没有找到相关消息</h3>
      <p class="mt-2 text-sm text-muted-foreground">尝试使用不同的关键词或调整过滤条件</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card v-for="i in 6" :key="i" class="animate-pulse h-full">
        <CardContent class="p-4">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="h-4 w-20 bg-muted rounded" />
              <div class="h-4 w-16 bg-muted rounded" />
            </div>
            <div class="flex items-center justify-between">
              <div class="h-4 w-24 bg-muted rounded" />
              <div class="h-4 w-32 bg-muted rounded" />
            </div>
            <div class="space-y-2">
              <div class="h-4 w-full bg-muted rounded" />
              <div class="h-4 w-3/4 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="flex justify-center mt-6">
      <Pagination
        :total="totalHits"
        :sibling-count="1"
        :default-page="currentPage"
        :items-per-page="pageSize"
        show-edges
        @update:page="handlePageChange"
      >
        <PaginationContent>
          <PaginationFirst @click="goToPage(1)" />
          <PaginationPrevious @click="goToPage(Math.max(1, currentPage - 1))" />
          <PaginationEllipsis v-if="currentPage > 3" />
          <PaginationItem
            v-for="page in visiblePages"
            :key="page"
            :value="page"
            :is-active="page === currentPage"
            @click="goToPage(page)"
          >
            {{ page }}
          </PaginationItem>
          <PaginationEllipsis v-if="currentPage < totalPages - 2" />
          <PaginationNext @click="goToPage(Math.min(totalPages, currentPage + 1))" />
          <PaginationLast @click="goToPage(totalPages)" />
        </PaginationContent>
      </Pagination>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  UserIcon,
  MessageCircleIcon,
  ClockIcon,
  CopyIcon,
  SearchXIcon,
  ArrowDownIcon,
} from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { toast } from 'vue-sonner'

import { useSearchStore } from '@/stores/search'
import {
  formatTimestamp,
  formatMessageType,
  getMessageTypeVariant,
  highlightSearchTerms,
} from '@/utils/helpers'
import type { SearchHit } from '@/types/api'

const searchStore = useSearchStore()
const { searchResults, isLoading, totalHits, totalPages, currentPage, pageSize, query } =
  storeToRefs(searchStore)

// 搜索结果容器引用
const searchResultsContainer = ref<HTMLElement>()

// 展开的消息
const expandedMessages = ref(new Set<number>())

// 计算可见的页码
const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, currentPage.value + 2)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return pages
})

// 切换消息展开状态
function toggleExpanded(messageId: number) {
  if (expandedMessages.value.has(messageId)) {
    expandedMessages.value.delete(messageId)
  } else {
    expandedMessages.value.add(messageId)
  }
}

// 获取高亮的消息内容
function highlightedMessage(hit: SearchHit): string {
  const message = expandedMessages.value.has(hit.id)
    ? hit.message
    : hit._formatted?.message || hit.message

  return highlightSearchTerms(message, query.value)
}

// 复制消息内容
async function copyMessage(message: string) {
  try {
    await navigator.clipboard.writeText(message)
    toast.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    toast.error('复制失败，请重试')
  }
}

// 处理页面变化
function handlePageChange(page: number) {
  goToPage(page)
}

// 跳转到指定页面
function goToPage(page: number) {
  searchStore.goToPage(page)
  // 翻页后滚动到搜索结果容器顶部，提升用户体验
  if (searchResultsContainer.value) {
    searchResultsContainer.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else {
    // 如果容器引用不可用，回退到滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>
