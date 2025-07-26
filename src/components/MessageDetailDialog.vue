<template>
  <Dialog :open="isOpen" @update:open="handleUpdateOpen">
    <DialogContent class="sm:max-w-[600px] max-h-[80vh]">
      <DialogHeader>
        <DialogTitle class="flex items-center space-x-2">
          <Badge v-if="message" :variant="getMessageTypeVariant(message.type)" class="mr-2">
            {{ formatMessageType(message?.type || '') }}
          </Badge>
          <span v-if="message?.user_full_name">{{ message.user_full_name }}</span>
        </DialogTitle>
      </DialogHeader>

      <div class="mt-2 overflow-y-auto" style="max-height: 50vh">
        <div
          v-if="message?.chat_title"
          class="mb-4 text-sm text-muted-foreground flex items-center"
        >
          <MessageCircleIcon class="h-4 w-4 mr-2" />
          <a
            :href="`https://t.me/c/${message?.chat_id}/${message?.id}`"
            target="_blank"
            class="hover:text-primary transition-colors"
          >
            {{ message.chat_title }}
          </a>
        </div>

        <div
          v-if="message"
          class="message-content text-sm leading-relaxed p-4 bg-muted/50 rounded-md break-words"
          v-html="highlightedContent"
        ></div>
      </div>

      <DialogFooter class="mt-4">
        <Button variant="outline" @click="copyMessage" class="mr-2">
          <CopyIcon class="mr-1 h-4 w-4" />
          复制全文
        </Button>
        <Button @click="close">关闭</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MessageCircleIcon, CopyIcon } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import { formatMessageType, getMessageTypeVariant, highlightSearchTerms } from '@/utils/helpers'
import type { SearchHit } from '@/types/api'

// 组件属性定义
const props = defineProps<{
  isOpen: boolean
  message: SearchHit | null
  searchQuery: string
}>()

// 事件
const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  close: []
}>()

// 计算属性：高亮的消息内容
const highlightedContent = computed(() => {
  if (!props.message) return ''
  return highlightSearchTerms(props.message.message, props.searchQuery)
})

// 处理对话框打开状态变化
function handleUpdateOpen(value: boolean) {
  emit('update:isOpen', value)
}

// 关闭对话框
function close() {
  emit('update:isOpen', false)
  emit('close')
}

// 复制消息内容
async function copyMessage() {
  if (!props.message) return

  try {
    await navigator.clipboard.writeText(props.message.message)
    toast.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    toast.error('复制失败，请重试')
  }
}
</script>
