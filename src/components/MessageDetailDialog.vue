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

        <!-- 回复消息 -->
        <div v-if="message" class="m-2">
          <div class="flex items-center justify-between mb-2">
            <div class="text-sm font-medium flex items-center">
              <ReplyIcon class="h-4 w-4 mr-1.5 text-primary" />
              回复此消息
            </div>
            <Badge v-if="replyStatus" :variant="replyStatus.variant">{{ replyStatus.text }}</Badge>
          </div>
          <div class="flex space-x-2">
            <Input
              v-model="replyText"
              placeholder="输入回复内容..."
              class="flex-1"
              :disabled="isReplying"
              @keydown.enter="handleReplySubmit"
            />
            <Button @click="handleReplySubmit" :disabled="!replyText.trim() || isReplying">
              <SendIcon v-if="!isReplying" class="mr-1.5 h-4 w-4" />
              <LoaderIcon v-else class="mr-1.5 h-4 w-4 animate-spin" />
              {{ isReplying ? '发送中...' : '发送' }}
            </Button>
          </div>
        </div>
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
import { computed, ref } from 'vue'
import { MessageCircleIcon, CopyIcon, ReplyIcon, SendIcon, LoaderIcon } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import { apiService } from '@/services/api'
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

// 状态
const replyText = ref('')
const isReplying = ref(false)
const replyStatus = ref<{ text: string; variant: 'default' | 'secondary' | 'destructive' } | null>(
  null,
)

// 计算属性：高亮的消息内容
const highlightedContent = computed(() => {
  if (!props.message) return ''
  return highlightSearchTerms(props.message.message, props.searchQuery)
})

// 处理对话框打开状态变化
function handleUpdateOpen(value: boolean) {
  emit('update:isOpen', value)
  if (!value) {
    // 关闭对话框时重置状态
    replyText.value = ''
    replyStatus.value = null
  }
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

// 提交回复
async function handleReplySubmit() {
  if (!props.message || !replyText.value.trim() || isReplying.value) return

  isReplying.value = true
  replyStatus.value = null

  try {
    const response = await apiService.replyMessage({
      chat_id: props.message.chat_id,
      message_id: props.message.id,
      text: replyText.value.trim(),
    })

    if (response.status === 'success') {
      replyStatus.value = { text: '回复成功', variant: 'default' }
      replyText.value = ''
      toast.success('回复已发送')
    } else {
      replyStatus.value = { text: '回复失败', variant: 'destructive' }
      toast.error(`回复失败: ${response.message}`)
    }
  } catch (error) {
    console.error('回复失败:', error)
    replyStatus.value = { text: '回复失败', variant: 'destructive' }
    toast.error('回复发送失败，请稍后重试')
  } finally {
    isReplying.value = false
  }
}
</script>
