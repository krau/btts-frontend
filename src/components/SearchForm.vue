<template>
  <div class="space-y-4">
    <!-- 搜索输入框 -->
    <div class="relative flex items-center space-x-4">
      <SearchIcon class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        v-model="localQuery"
        placeholder="搜索消息内容..."
        class="pl-9 pr-4 transition-shadow focus-within:shadow-md"
        @keydown.enter="handleSearch"
      />
      <Button
        @click="handleSearch"
        :disabled="!localQuery.trim() || isLoading"
        class="shadow hover:shadow-md transition-shadow"
      >
        <SearchIcon v-if="!isLoading" class="mr-2 h-4 w-4" />
        <LoaderIcon v-else class="mr-2 h-4 w-4 animate-spin" />
        {{ isLoading ? '搜索中...' : '搜索' }}
      </Button>
    </div>

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <!-- 聊天选择 -->
      <div class="space-y-2">
        <label class="text-sm font-medium flex items-center">
          <MessageSquareIcon class="h-4 w-4 mr-2 text-primary" />
          选择聊天
        </label>
        <Select
          v-model="selectedChatIds"
          multiple
          @update:model-value="handleSelectedChatIdsChange"
        >
          <SelectTrigger
            class="transition-all hover:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <div class="flex items-center">
              <SelectValue :placeholder="selectedChatIdsPlaceholder" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="chat in indexedChats" :key="chat.chat_id" :value="chat.chat_id">
              {{ chat.title }}
            </SelectItem>
          </SelectContent>
        </Select>
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

      <!-- 每页数量 -->
      <div class="space-y-2">
        <label class="text-sm font-medium flex items-center">
          <BookIcon class="h-4 w-4 mr-2 text-primary" />
          每页显示
        </label>
        <Select :model-value="pageSize.toString()" @update:model-value="handlePageSizeChange">
          <SelectTrigger
            class="transition-all hover:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <div class="flex items-center justify-between w-full">
              <span>{{ pageSize }} 条</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">
              <span>5 条</span>
            </SelectItem>
            <SelectItem value="10">
              <span>10 条</span>
            </SelectItem>
            <SelectItem value="20">
              <span>20 条</span>
            </SelectItem>
            <SelectItem value="50">
              <span>50 条</span>
            </SelectItem>
            <SelectItem value="100">
              <span>100 条</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>

  <!-- 搜索统计 -->
  <div v-if="totalHits > 0" class="flex items-center justify-between p-3 bg-muted/30 text-sm mt-4">
    <div class="flex items-center">
      <SearchIcon class="h-4 w-4 mr-2 text-primary" />
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
import { ref, watch, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
  SearchIcon,
  LoaderIcon,
  MessageSquareIcon,
  ImageIcon,
  FileIcon,
  VideoIcon,
  MicIcon,
  BarChartIcon,
  BookIcon,
  LayersIcon,
} from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useSearchStore } from '@/stores/search'
import { MESSAGE_TYPES } from '@/types/api'
import { formatMessageType } from '@/utils/helpers'

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
} = storeToRefs(searchStore)

// 本地状态
const localQuery = ref(query.value)

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

// 计算属性
const selectedChatIdsPlaceholder = computed(() => {
  if (selectedChatIds.value.length === 0) {
    return '所有聊天'
  } else if (selectedChatIds.value.length === 1) {
    const chat = indexedChats.value.find((c) => c.chat_id === selectedChatIds.value[0])
    return chat ? chat.title : '1个聊天'
  } else {
    return `${selectedChatIds.value.length}个聊天`
  }
})

// 监听 query 变化
watch(query, (newQuery) => {
  localQuery.value = newQuery
})

// 处理搜索
function handleSearch() {
  if (!localQuery.value.trim()) return

  searchStore.setQuery(localQuery.value)
  searchStore.search()
}

// 处理消息类型变化
function handleTypeChange(type: string, checked: boolean | 'indeterminate') {
  console.error('handleTypeChange called with:', type, checked)
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

// 处理选中聊天变化
function handleSelectedChatIdsChange(value: unknown) {
  searchStore.setSelectedChatIds(value as number[])
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
