<template>
  <div class="space-y-4" ref="searchResultsContainer">
    <!-- 搜索结果列表 -->
    <div
      v-if="searchResults.length > 0 && !isLoading"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <Card
        v-for="hit in searchResults"
        :key="`${hit.chat_id}-${hit.id}`"
        class="transition-all duration-200 h-full flex flex-col"
      >
        <CardContent class="flex-1 flex flex-col">
          <div class="space-y-3 flex-1 flex flex-col">
            <!-- 用户和聊天信息 -->
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center space-x-2">
                <Badge :variant="getMessageTypeVariant(hit.type)">
                  {{ formatMessageType(hit.type) }}
                </Badge>
                <UserIcon class="h-4 w-4 text-muted-foreground" />
                <span
                  class="font-medium cursor-pointer text-muted-foreground hover:text-primary"
                  @click="copyMessage(hit.user_id.toString())"
                >
                  {{ hit.user_full_name }}
                </span>
              </div>
              <div
                class="flex items-center space-x-2 text-muted-foreground hover:text-primary cursor-pointer"
                @click="copyMessage(`https://t.me/c/${hit.chat_id}/${hit.id}`, '消息链接已复制')"
              >
                <MessageCircleIcon class="h-4 w-4 text-muted-foreground" />
                <span>
                  {{ hit.chat_title || `${hit.chat_id}` }}
                </span>
              </div>
            </div>

            <!-- 消息内容 -->
            <div class="space-y-2 flex-1 flex flex-col">
              <div
                class="message-content leading-relaxed p-3 bg-muted/50 rounded-md wrap-break-word flex-1"
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
                <Button
                  :as="'a'"
                  :href="`https://t.me/c/${hit.chat_id}/${hit.id}`"
                  target="_blank"
                  variant="outline"
                  title="跳转至消息"
                >
                  <LinkIcon class="h-3 w-3" />
                </Button>
                <Button variant="outline" @click="openMessageDialog(hit)" title="查看详情">
                  <EyeIcon class="h-3 w-3" />
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

    <MessageDetailDialog
      v-model:is-open="isMessageDialogOpen"
      :message="selectedMessage"
      :search-query="query"
      @close="closeMessageDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  UserIcon,
  MessageCircleIcon,
  ClockIcon,
  SearchXIcon,
  EyeIcon,
  LinkIcon,
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

import MessageDetailDialog from '@/components/MessageDetailDialog.vue'

import { useSearchStore } from '@/stores/search'
import {
  formatTimestamp,
  formatMessageType,
  getMessageTypeVariant,
  highlightSearchTerms,
  copyMessage,
} from '@/utils/helpers'
import type { SearchHit } from '@/types/api'

const searchStore = useSearchStore()
const { searchResults, isLoading, totalHits, totalPages, currentPage, pageSize, query } =
  storeToRefs(searchStore)
// 对话框状态
const isMessageDialogOpen = ref(false)
const selectedMessage = ref<SearchHit | null>(null)

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

// 获取高亮的消息内容
function highlightedMessage(hit: SearchHit): string {
  return highlightSearchTerms(hit._formatted?.message || hit.message, query.value)
}

// 打开消息对话框
function openMessageDialog(hit: SearchHit) {
  selectedMessage.value = hit
  isMessageDialogOpen.value = true
}

// 关闭消息对话框
function closeMessageDialog() {
  isMessageDialogOpen.value = false
}

// 处理页面变化
function handlePageChange(page: number) {
  searchStore.goToPage(page)
}

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  searchStore.goToPage(page)
}
</script>
