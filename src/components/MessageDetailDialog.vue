<template>
  <Dialog :open="isOpen" @update:open="handleUpdateOpen">
    <DialogContent class="sm:max-w-150 max-h-[80vh]">
      <DialogHeader>
        <DialogTitle class="flex items-center space-x-2">
          <Badge v-if="currentMessage" :variant="getMessageTypeVariant(currentMessage.type)">
            {{ formatMessageType(currentMessage?.type || '') }}
          </Badge>
          <span v-if="currentMessage?.user_full_name">{{ currentMessage.user_full_name }}</span>
        </DialogTitle>
      </DialogHeader>

      <div class="mt-2 flex flex-col gap-2" style="max-height: 50vh">
        <div
          v-if="currentMessage?.chat_title"
          class="text-sm text-muted-foreground flex items-center"
        >
          <MessageCircleIcon class="h-4 w-4 mr-2" />
          <a
            :href="`https://t.me/c/${currentMessage?.chat_id}/${currentMessage?.id}`"
            target="_blank"
            class="hover:text-primary transition-colors"
          >
            {{ currentMessage.chat_title }}
          </a>
        </div>

        <!-- 附近消息列表 -->
        <div
          ref="scrollContainer"
          class="space-y-2 pb-2 flex-1 overflow-y-auto"
          @scroll="handleScroll"
        >
          <div
            v-if="isLoadingInitial"
            class="flex justify-center py-6 text-sm text-muted-foreground"
          >
            <LoaderIcon class="h-4 w-4 animate-spin mr-2" />
            正在加载附近消息...
          </div>

          <div v-else>
            <div v-if="messages.length" class="space-y-1">
              <div
                v-if="isLoadingMoreBefore"
                class="flex justify-center py-1 text-[11px] text-muted-foreground"
              >
                加载更早的消息...
              </div>

              <div
                v-for="msg in messages"
                :key="msg.id"
                :ref="
                  (el) =>
                    msg.id === currentMessageId && setCurrentMessageEl(el as HTMLElement | null)
                "
                class="rounded-md border p-2 cursor-pointer transition-colors"
                :class="
                  msg.id === currentMessageId
                    ? 'bg-primary/10 border-primary text-foreground'
                    : 'bg-muted/40 border-transparent text-muted-foreground hover:bg-muted'
                "
                @click="handleMessageClick(msg)"
              >
                <div class="flex items-center justify-between text-[11px] mb-1">
                  <span class="truncate">
                    {{ msg.user_full_name || `用户 ${msg.user_id}` }}
                  </span>
                  <span class="flex items-center gap-1 shrink-0">
                    <span>{{ formatTimestamp(msg.timestamp) }}</span>
                    <span class="px-1.5 py-0.5 rounded-full bg-background/60 border text-[10px]">
                      {{ formatMessageType(msg.type) }}
                    </span>
                  </span>
                </div>
                <div
                  class="message-content text-sm leading-relaxed wrap-break-word"
                  :class="
                    msg.id === currentMessageId
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground'
                  "
                  v-html="formatMessageContent(msg)"
                ></div>
              </div>

              <div
                v-if="isLoadingMoreAfter"
                class="flex justify-center py-1 text-[11px] text-muted-foreground"
              >
                加载更晚的消息...
              </div>
            </div>

            <div v-else class="flex justify-center py-6 text-sm text-muted-foreground">
              暂无更多消息
            </div>
          </div>
        </div>

        <!-- 输入框 / 操作区（固定在底部区域） -->
        <div v-if="currentMessage" class="mt-2">
          <div class="flex items-center justify-between mb-2">
            <div class="text-sm font-medium flex items-center" v-if="isMasterKey">
              <ReplyIcon class="h-4 w-4 text-primary" />
              对此消息进行操作
            </div>
            <div class="text-sm font-medium flex items-center" v-else>
              <ReplyIcon class="h-4 w-4 text-primary" />
              快捷操作
            </div>
            <Badge v-if="requestStatus && isMasterKey" :variant="requestStatus.variant">{{
              requestStatus.text
            }}</Badge>
          </div>

          <!-- master key：展示完整操作（回复、复读、文件预览等） -->
          <div v-if="isMasterKey" class="flex space-x-2">
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
                  <ZapIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel class="font-semibold">快捷功能</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem @click="copyMessage(currentMessage.message)">
                    <span>复制全文</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="repeatMessage(currentMessage)" :disabled="isReplying">
                    <span>复读</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              :disabled="currentMessage.type === 'text'"
              variant="outline"
              title="查看文件"
              @click="openFileLink"
            >
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

          <!-- 非 master key：仅保留复制全文（纯前端功能） -->
          <div v-else class="flex justify-end">
            <Button variant="outline" @click="copyMessage(currentMessage.message)">
              <ZapIcon class="mr-1 h-4 w-4" />
              复制全文
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
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
import {
  formatMessageType,
  getMessageTypeVariant,
  highlightSearchTerms,
  openLink,
  formatTimestamp,
} from '@/utils/helpers'
import type { SearchHit } from '@/types/api'
import { copyMessage } from '@/utils/helpers'
import { useSearchStore } from '@/stores/search'
import { storeToRefs } from 'pinia'

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

// 全局状态：当前 API Key 是否为 master key
const searchStore = useSearchStore()
const { isMasterKey } = storeToRefs(searchStore)

// 消息上下文状态
const messages = ref<SearchHit[]>([])
const currentMessageId = ref<number | null>(null)
const currentChatId = ref<number | null>(null)
const isLoadingInitial = ref(false)
const isLoadingMoreBefore = ref(false)
const isLoadingMoreAfter = ref(false)
const hasMoreBefore = ref(true)
const hasMoreAfter = ref(true)
const lastBeforeAnchorId = ref<number | null>(null)
const lastAfterAnchorId = ref<number | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)
const currentMessageEl = ref<HTMLElement | null>(null)

const currentMessage = computed<SearchHit | null>(() => {
  if (currentMessageId.value == null) return props.message
  const found = messages.value.find((m) => m.id === currentMessageId.value) || null
  return found || props.message
})

function resetContext() {
  messages.value = []
  currentMessageId.value = null
  currentChatId.value = null
  isLoadingInitial.value = false
  isLoadingMoreBefore.value = false
  isLoadingMoreAfter.value = false
  hasMoreBefore.value = true
  hasMoreAfter.value = true
  lastBeforeAnchorId.value = null
  lastAfterAnchorId.value = null
  currentMessageEl.value = null
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0
  }
}

// 高亮某条消息内容
function formatMessageContent(msg: SearchHit): string {
  return highlightSearchTerms(msg.message, props.searchQuery)
}

function setCurrentMessageEl(el: HTMLElement | null) {
  if (el) {
    currentMessageEl.value = el
  }
}

function mergeMessages(newHits: SearchHit[]) {
  if (!newHits.length) return
  const map = new Map<number, SearchHit>()
  for (const m of messages.value) {
    map.set(m.id, m)
  }
  for (const m of newHits) {
    map.set(m.id, m)
  }
  messages.value = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp)
}

async function loadInitialContext(base: SearchHit) {
  isLoadingInitial.value = true
  hasMoreBefore.value = true
  hasMoreAfter.value = true
  messages.value = []
  lastBeforeAnchorId.value = null
  lastAfterAnchorId.value = null

  try {
    // 初始加载：以当前消息为起点，优先展示当前消息和其后的若干条
    const ids: number[] = []
    for (let i = base.id; i <= base.id + 10; i++) {
      if (i > 0) ids.push(i)
    }

    const response = await apiService.fetchMessages(base.chat_id, ids)
    const hits = response.hits || []

    // 将当前消息放在列表开头，其余消息按时间排序追加在后
    const others = hits.filter((m) => m.id !== base.id)
    others.sort((a, b) => a.timestamp - b.timestamp)

    messages.value = [base, ...others]
    currentMessageId.value = base.id
    currentChatId.value = base.chat_id
  } catch (error) {
    console.error('加载附近消息失败:', error)
  } finally {
    isLoadingInitial.value = false
  }
}

async function loadMoreBefore() {
  if (isLoadingMoreBefore.value || !hasMoreBefore.value) return
  if (!currentChatId.value || !messages.value.length) return

  isLoadingMoreBefore.value = true
  const first = messages.value[0]

  // 避免在同一个锚点上重复请求
  if (lastBeforeAnchorId.value === first.id) {
    isLoadingMoreBefore.value = false
    return
  }
  lastBeforeAnchorId.value = first.id

  try {
    // 向上滚动到底：加载更早的 20 条
    const ids: number[] = []
    for (let i = first.id - 20; i < first.id; i++) {
      if (i > 0) ids.push(i)
    }

    if (!ids.length) {
      hasMoreBefore.value = false
      return
    }

    const response = await apiService.fetchMessages(currentChatId.value, ids)
    const hits = response.hits || []
    if (!hits.length) {
      hasMoreBefore.value = false
      return
    }
    mergeMessages(hits)
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      hasMoreBefore.value = false
    } else {
      console.error('加载更早消息失败:', error)
      // 防止异常情况下重复打请求
      hasMoreBefore.value = false
    }
  } finally {
    isLoadingMoreBefore.value = false
  }
}

async function loadMoreAfter() {
  if (isLoadingMoreAfter.value || !hasMoreAfter.value) return
  if (!currentChatId.value || !messages.value.length) return

  isLoadingMoreAfter.value = true
  const last = messages.value[messages.value.length - 1]

  // 避免在同一个锚点上重复请求
  if (lastAfterAnchorId.value === last.id) {
    isLoadingMoreAfter.value = false
    return
  }
  lastAfterAnchorId.value = last.id

  try {
    // 向下滚动到底：加载更晚的 20 条
    const ids: number[] = []
    for (let i = last.id + 1; i <= last.id + 20; i++) {
      if (i > 0) ids.push(i)
    }

    if (!ids.length) {
      hasMoreAfter.value = false
      return
    }

    const response = await apiService.fetchMessages(currentChatId.value, ids)
    const hits = response.hits || []
    if (!hits.length) {
      hasMoreAfter.value = false
      return
    }
    mergeMessages(hits)
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      hasMoreAfter.value = false
    } else {
      console.error('加载更晚消息失败:', error)
      // 防止异常情况下重复打请求
      hasMoreAfter.value = false
    }
  } finally {
    isLoadingMoreAfter.value = false
  }
}

function handleScroll(event: Event) {
  const el = event.target as HTMLElement
  const threshold = 40

  if (el.scrollTop < threshold) {
    loadMoreBefore()
  }

  const bottomDistance = el.scrollHeight - el.scrollTop - el.clientHeight
  if (bottomDistance < threshold) {
    loadMoreAfter()
  }
}

function handleMessageClick(msg: SearchHit) {
  currentMessageId.value = msg.id
}

// 处理对话框打开状态变化
function handleUpdateOpen(value: boolean) {
  emit('update:isOpen', value)
  if (!value) {
    // 关闭对话框时重置状态
    replyText.value = ''
    requestStatus.value = null
    resetContext()
  }
}

// 打开对话框时初始化附近消息
watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen && props.message) {
      // 等待对话框及滚动容器渲染完成后再加载上下文，确保滚动定位生效
      await nextTick()
      await loadInitialContext(props.message)
    }
  },
)

onBeforeUnmount(() => {
  resetContext()
})

// 提交回复
async function handleReplySubmit() {
  if (!currentMessage.value || !replyText.value.trim() || isReplying.value) return

  isReplying.value = true
  requestStatus.value = null

  try {
    const response = await apiService.replyMessage({
      chat_id: currentMessage.value.chat_id,
      message_id: currentMessage.value.id,
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

const getFileUrl = async (message: SearchHit) => {
  const token = await apiService.buildReqToken(message.chat_id.toString(), message.id.toString())
  return `/api/client/filestream?chat_id=${message.chat_id}&message_id=${message.id}&reqtoken=${token}`
}

const openFileLink = async () => {
  if (!currentMessage.value || currentMessage.value.type === 'text') return
  const fileUrl = await getFileUrl(currentMessage.value)
  if (fileUrl) {
    openLink(fileUrl)
  } else {
    toast.error('无法获取文件链接')
  }
}
</script>
