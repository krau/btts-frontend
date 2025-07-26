<template>
  <div class="space-y-4">
    <!-- 搜索输入框 -->
    <div class="relative">
      <SearchIcon class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        v-model="localQuery"
        placeholder="搜索消息内容..."
        class="pl-9 pr-4"
        @keydown.enter="handleSearch"
      />
    </div>

    <!-- 过滤器 -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- 聊天选择 -->
      <div class="space-y-2">
        <label class="text-sm font-medium">选择聊天</label>
        <Select
          v-model="selectedChatIds"
          multiple
          @update:model-value="handleSelectedChatIdsChange"
        >
          <SelectTrigger>
            <SelectValue :placeholder="selectedChatIdsPlaceholder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="chat in indexedChats" :key="chat.chat_id" :value="chat.chat_id">
              {{ chat.title }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- 消息类型 -->
      <div class="space-y-2">
        <label class="text-sm font-medium">消息类型</label>
        <div class="flex flex-wrap gap-2">
          <div v-for="type in MESSAGE_TYPES" :key="type" class="flex items-center space-x-2">
            <Checkbox
              :id="type"
              :checked="selectedTypes.includes(type)"
              @update:model-value="
                (checked: boolean | 'indeterminate') => handleTypeChange(type, checked)
              "
            />
            <label
              :for="type"
              class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {{ formatMessageType(type) }}
            </label>
          </div>
        </div>
      </div>

      <!-- 每页数量 -->
      <div class="space-y-2">
        <label class="text-sm font-medium">每页显示</label>
        <Select :model-value="pageSize.toString()" @update:model-value="handlePageSizeChange">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 条</SelectItem>
            <SelectItem value="20">20 条</SelectItem>
            <SelectItem value="50">50 条</SelectItem>
            <SelectItem value="100">100 条</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- 搜索按钮 -->
      <div class="flex items-end">
        <Button @click="handleSearch" :disabled="!localQuery.trim() || isLoading" class="w-full">
          <SearchIcon v-if="!isLoading" class="mr-2 h-4 w-4" />
          <LoaderIcon v-else class="mr-2 h-4 w-4 animate-spin" />
          {{ isLoading ? '搜索中...' : '搜索' }}
        </Button>
      </div>
    </div>

    <!-- 搜索统计 -->
    <div
      v-if="totalHits > 0"
      class="flex items-center justify-between text-sm text-muted-foreground"
    >
      <span>
        找到 {{ totalHits.toLocaleString() }} 条结果
        <span v-if="semanticHitCount > 0"> （其中 {{ semanticHitCount }} 条语义匹配） </span>
      </span>
      <span>用时 {{ processingTime }}ms</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { SearchIcon, LoaderIcon } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
