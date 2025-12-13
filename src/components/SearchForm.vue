<template>
  <div class="space-y-4">
    <!-- 搜索输入框 -->
    <div class="flex flex-col sm:flex-row gap-3 sm:gap-2">
      <!-- 搜索输入框 - 移动端独占一行 -->
      <div class="relative flex-1">
        <SearchIcon
          class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          v-model="localQuery"
          placeholder="搜索消息内容..."
          class="pl-9 pr-4 transition-shadow focus-within:shadow-md"
          @keydown.enter="handleSearch"
        />
      </div>

      <!-- 控制按钮 - 移动端第二行，桌面端右侧 -->
      <div class="flex items-center gap-2 sm:shrink-0">
        <Button
          @click="handleSearch"
          :disabled="isLoading"
          class="flex-1 sm:flex-none shadow hover:shadow-md transition-shadow"
        >
          <SearchIcon v-if="!isLoading" />
          <LoaderIcon v-else class="animate-spin" />
          搜索
        </Button>
        <Select :model-value="pageSize.toString()" @update:model-value="handlePageSizeChange">
          <SelectTrigger class="h-10 w-auto min-w-30 shadow hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between w-full">
              <span>每页 {{ pageSize }} 条</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12">
              <span>12 条</span>
            </SelectItem>
            <SelectItem value="24">
              <span>24 条</span>
            </SelectItem>
            <SelectItem value="48">
              <span>48 条</span>
            </SelectItem>
            <SelectItem value="90">
              <span>90 条</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <!-- 聊天选择 -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium flex items-center">
            <MessageSquareIcon class="h-4 w-4 mr-2 text-primary" />
            选择聊天
          </label>
          <Button
            variant="outline"
            size="icon"
            class="h-7 w-7"
            title="刷新聊天列表"
            @click="handleRefreshChats"
            :disabled="isLoadingChats"
          >
            <RefreshCwIcon class="h-4 w-4" :class="{ 'animate-spin': isLoadingChats }" />
          </Button>
        </div>
        <div class="relative">
          <!-- 搜索聊天输入框 -->
          <div class="relative mb-1.5">
            <SearchIcon
              class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              v-model="chatSearchQuery"
              placeholder="搜索聊天..."
              class="pl-8 pr-3 py-1 h-8 text-sm"
            />
          </div>

          <!-- 聊天列表 -->
          <div class="border rounded-md max-h-32 overflow-y-auto p-1 bg-background">
            <div v-if="isLoadingChats" class="flex items-center justify-center p-4">
              <LoaderIcon class="h-4 w-4 animate-spin mr-2" />
              <span class="text-sm">加载中...</span>
            </div>
            <div
              v-else-if="indexedChats.length === 0"
              class="flex items-center justify-center p-4 text-muted-foreground"
            >
              <span class="text-sm">没有可用的聊天</span>
            </div>
            <div v-else class="space-y-0.5">
              <div
                v-for="chat in filteredChats"
                :key="chat.chat_id"
                class="flex items-center space-x-2 px-1.5 py-1 hover:bg-muted/50 rounded text-sm"
              >
                <Checkbox
                  :id="`chat-${chat.chat_id}`"
                  :checked="selectedChatIds.includes(chat.chat_id)"
                  @update:model-value="
                    (checked: boolean | 'indeterminate') =>
                      handleChatCheckboxChange(chat.chat_id, checked)
                  "
                />
                <label
                  :for="`chat-${chat.chat_id}`"
                  class="flex-1 cursor-pointer truncate"
                  :title="chat.title || String(chat.chat_id)"
                >
                  {{ chat.title || chat.chat_id }}
                </label>
              </div>
            </div>

            <!-- 没有搜索结果 -->
            <div
              v-if="!isLoadingChats && indexedChats.length > 0 && filteredChats.length === 0"
              class="flex items-center justify-center p-3 text-muted-foreground"
            >
              <span class="text-sm">没有匹配的聊天</span>
            </div>
          </div>
        </div>
        <p class="text-xs text-muted-foreground mt-1">
          {{
            selectedChatIds.length === 0
              ? '搜索所有聊天'
              : `已选择 ${selectedChatIds.length} 个聊天`
          }}
        </p>
      </div>

      <!-- 消息类型 -->
      <div class="space-y-2">
        <label class="text-sm font-medium flex items-center">
          <LayersIcon class="h-4 w-4 mr-2 text-primary" />
          消息类型
        </label>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div
            v-for="type in MESSAGE_TYPES"
            :key="type"
            class="flex items-center p-2 rounded-md cursor-pointer transition-all"
            :class="
              selectedTypes.includes(type)
                ? 'bg-primary/10 border border-primary/30'
                : 'bg-muted/30 border border-muted hover:bg-muted'
            "
          >
            <Checkbox
              :id="type"
              :checked="selectedTypes.length === 0 || selectedTypes.includes(type)"
              class="mr-2"
              @update:model-value="(checked) => handleTypeChange(type, checked)"
            />
            <label :for="type" class="text-sm cursor-pointer flex items-center w-full">
              <component :is="getMessageTypeIcon(type)" class="h-3.5 w-3.5 mr-1.5" />
              {{ formatMessageType(type) }}
            </label>
          </div>
        </div>
      </div>

      <!-- 用户id -->
      <div class="space-y-2">
        <label class="text-sm font-medium flex items-center">
          <UserIcon class="h-4 w-4 mr-2 text-primary" />
          用户ID
        </label>
        <TagsInput v-model="userIdInputs">
          <TagsInputItem v-for="user in userIdInputs" :key="user" :value="user">
            <TagsInputItemText />
            <TagsInputItemDelete />
          </TagsInputItem>

          <TagsInputInput placeholder="输入用户ID（仅限数字）..." />
        </TagsInput>
      </div>
    </div>
  </div>

  <!-- 搜索统计 -->
  <div v-if="totalHits > 0" class="flex items-center justify-between p-3 bg-muted/30 text-sm mt-4">
    <div class="flex items-center">
      <InfoIcon class="h-4 w-4 mr-2 text-primary" />
      <span>
        找到 <strong class="text-foreground">{{ totalHits.toLocaleString() }}</strong> 条结果
        <span v-if="semanticHitCount > 0" class="ml-1">
          （其中
          <Badge variant="secondary" class="px-1.5">{{ semanticHitCount }}</Badge> 条语义匹配）
        </span>
      </span>
    </div>
    <Badge variant="outline" class="flex items-center">
      <span>用时 {{ processingTime }}ms</span>
    </Badge>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  SearchIcon,
  UserIcon,
  LoaderIcon,
  MessageSquareIcon,
  ImageIcon,
  FileIcon,
  VideoIcon,
  MicIcon,
  BarChartIcon,
  BookIcon,
  LayersIcon,
  RefreshCwIcon,
  InfoIcon,
} from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useSearchStore } from '@/stores/search'
import { MESSAGE_TYPES } from '@/types/api'
import { formatMessageType } from '@/utils/helpers'
import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
} from '@/components/ui/tags-input'

const searchStore = useSearchStore()
const {
  query,
  selectedTypes,
  pageSize,
  isLoading,
  totalHits,
  processingTime,
  semanticHitCount,
  indexedChats,
  selectedChatIds,
  isLoadingChats,
} = storeToRefs(searchStore)

// 本地状态
const localQuery = ref(query.value)
const chatSearchQuery = ref('')
const userIdInputs = ref<string[]>([])

// 获取消息类型对应的图标
function getMessageTypeIcon(type: string) {
  switch (type) {
    case 'text':
      return MessageSquareIcon
    case 'photo':
      return ImageIcon
    case 'video':
      return VideoIcon
    case 'document':
      return FileIcon
    case 'voice':
    case 'audio':
      return MicIcon
    case 'poll':
      return BarChartIcon
    case 'story':
      return BookIcon
    default:
      return LayersIcon
  }
}

// 计算属性：过滤后的聊天列表
const filteredChats = computed(() => {
  const searchTerm = chatSearchQuery.value.trim().toLowerCase()
  if (!searchTerm) return indexedChats.value

  return indexedChats.value.filter((chat) => {
    const title = (chat.title || String(chat.chat_id)).toLowerCase()
    return title.includes(searchTerm)
  })
})
// 监听 query 变化
watch(query, (newQuery) => {
  localQuery.value = newQuery
})

// 监听 userIdInputs 变化
watch(userIdInputs, (newUserIds) => {
  const validUserIds = newUserIds.map((id) => id.trim()).filter((id) => /^\d+$/.test(id)) // 仅保留数字ID
  searchStore.setSelectedUserIds(validUserIds.map(Number))
})

// 处理搜索
function handleSearch() {
  searchStore.setQuery(localQuery.value)
  searchStore.search()
}

// 处理消息类型变化
function handleTypeChange(type: string, checked: boolean | 'indeterminate') {
  if (checked === 'indeterminate') return
  const types = [...selectedTypes.value]
  if (checked) {
    if (!types.includes(type)) {
      types.push(type)
    }
  } else {
    const index = types.indexOf(type)
    if (index > -1) {
      types.splice(index, 1)
    }
  }
  searchStore.setSelectedTypes(types)
}

// 处理每页数量变化
function handlePageSizeChange(value: unknown) {
  if (value === null || value === undefined) return
  searchStore.setPageSize(parseInt(String(value)))
}

// 处理聊天勾选变化
function handleChatCheckboxChange(chatId: number, checked: boolean | 'indeterminate') {
  if (checked === 'indeterminate') return
  const chatIds = [...selectedChatIds.value]
  if (checked) {
    if (!chatIds.includes(chatId)) {
      chatIds.push(chatId)
    }
  } else {
    const index = chatIds.indexOf(chatId)
    if (index > -1) {
      chatIds.splice(index, 1)
    }
  }
  searchStore.setSelectedChatIds(chatIds)
}

// 刷新聊天列表
async function handleRefreshChats() {
  try {
    await searchStore.loadIndexedChats()
  } catch (error) {
    console.error('无法刷新聊天列表:', error)
  }
}

// 在组件挂载时加载聊天列表
onMounted(async () => {
  try {
    await searchStore.loadIndexedChats()
  } catch (error) {
    console.error('无法加载聊天列表:', error)
  }
})
</script>
