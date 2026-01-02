<template>
  <div class="space-y-3 h-full flex flex-col">
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

    <div class="relative flex-1 flex flex-col">
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

      <div
        class="border rounded-md max-h-32 overflow-y-auto p-1 bg-background lg:max-h-none lg:flex-1"
      >
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
        selectedChatIds.length === 0 ? '搜索所有聊天' : `已选择 ${selectedChatIds.length} 个聊天`
      }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { MessageSquareIcon, RefreshCwIcon, SearchIcon, LoaderIcon } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useSearchStore } from '@/stores/search'

const searchStore = useSearchStore()
const { indexedChats, selectedChatIds, isLoadingChats } = storeToRefs(searchStore)

const chatSearchQuery = ref('')

const filteredChats = computed(() => {
  const searchTerm = chatSearchQuery.value.trim().toLowerCase()
  if (!searchTerm) return indexedChats.value

  return indexedChats.value.filter((chat) => {
    const title = (chat.title || String(chat.chat_id)).toLowerCase()
    return title.includes(searchTerm)
  })
})

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

async function handleRefreshChats() {
  try {
    await searchStore.loadIndexedChats()
  } catch (error) {
    console.error('无法刷新聊天列表:', error)
  }
}
</script>
