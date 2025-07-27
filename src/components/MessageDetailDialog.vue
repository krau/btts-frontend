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

        <!-- 输入框 -->
        <div v-if="message" class="m-2">
          <div class="flex items-center justify-between mb-2">
            <div class="text-sm font-medium flex items-center">
              <ReplyIcon class="h-4 w-4 mr-1.5 text-primary" />
              对此消息进行操作
            </div>
            <Badge v-if="requestStatus" :variant="requestStatus.variant">{{
              requestStatus.text
            }}</Badge>
          </div>
          <div class="flex space-x-2">
            <Input
              v-model="replyText"
              placeholder="输入回复内容..."
              class="flex-1"
              :disabled="isReplying"
              @keydown.enter="handleReplySubmit"
            />
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline" title="快捷功能">
                  <ZapIcon class="mr-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel class="font-semibold">快捷功能</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem @click="copyMessage(message.message)">
                    <span>复制全文</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="repeatMessage(message)" :disabled="isReplying">
                    <span>复读</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button :disabled="isReplying" variant="outline" title="添加媒体">
              <FileIcon />
            </Button>
            <Button
              @click="handleReplySubmit"
              :disabled="!replyText.trim() || isReplying"
              title="发送"
            >
              <SendIcon v-if="!isReplying" />
              <LoaderIcon v-else class="animate-spin" />
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  MessageCircleIcon,
  ReplyIcon,
  SendIcon,
  LoaderIcon,
  FileIcon,
  ZapIcon,
} from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import { apiService } from '@/services/api'
import { formatMessageType, getMessageTypeVariant, highlightSearchTerms } from '@/utils/helpers'
import type { SearchHit } from '@/types/api'
import { copyMessage } from '@/utils/helpers'

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
const requestStatus = ref<{
  text: string
  variant: 'default' | 'secondary' | 'destructive'
} | null>(null)

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
    requestStatus.value = null
  }
}

// 提交回复
async function handleReplySubmit() {
  if (!props.message || !replyText.value.trim() || isReplying.value) return

  isReplying.value = true
  requestStatus.value = null

  try {
    const response = await apiService.replyMessage({
      chat_id: props.message.chat_id,
      message_id: props.message.id,
      text: replyText.value.trim(),
    })

    if (response.status === 'success') {
      requestStatus.value = { text: '回复成功', variant: 'default' }
      replyText.value = ''
      toast.success('回复已发送')
    } else {
      requestStatus.value = { text: '回复失败', variant: 'destructive' }
      toast.error(`回复失败: ${response.message}`)
    }
  } catch (error) {
    console.error('回复失败:', error)
    requestStatus.value = { text: '回复失败', variant: 'destructive' }
    toast.error('回复发送失败，请稍后重试')
  } finally {
    isReplying.value = false
  }
}

const repeatMessage = async (message: SearchHit) => {
  if (isReplying.value) return
  isReplying.value = true
  requestStatus.value = null

  try {
    const response = await apiService.repeatMessage(message.chat_id, message.id)

    if (response.status === 'success') {
      requestStatus.value = { text: '复读成功', variant: 'default' }
      toast.success('复读已发送')
    } else {
      requestStatus.value = { text: '复读失败', variant: 'destructive' }
      toast.error(`复读失败: ${response.message}`)
    }
  } catch (error) {
    console.error('复读失败:', error)
    requestStatus.value = { text: '复读失败', variant: 'destructive' }
    toast.error('复读发送失败，请稍后重试')
  } finally {
    isReplying.value = false
  }
}
</script>
