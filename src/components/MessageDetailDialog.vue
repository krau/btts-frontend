<template>
  <Dialog :open="isOpen" @update:open="handleUpdateOpen">
    <DialogContent class="sm:max-w-150 h-[80vh] flex flex-col">
      <DialogHeader class="min-w-0 shrink-0">
        <DialogTitle class="flex items-center gap-2 min-w-0">
          <Badge v-if="currentMessage" :variant="getMessageTypeVariant(currentMessage.type)" class="shrink-0">
            {{ formatMessageType(currentMessage?.type || '') }}
          </Badge>
          <span v-if="currentMessage?.user_full_name" class="truncate min-w-0" :title="currentMessage.user_full_name">
            {{ currentMessage.user_full_name }}
          </span>
        </DialogTitle>
      </DialogHeader>

      <div class="flex flex-col gap-2 min-w-0 flex-1 overflow-hidden">
        <div v-if="currentMessage?.chat_title" class="text-sm text-muted-foreground flex items-center min-w-0 shrink-0">
          <MessageCircleIcon class="h-4 w-4 mr-2 shrink-0" />
          <a :href="`https://t.me/c/${currentMessage?.chat_id}/${currentMessage?.id}`" target="_blank"
            class="hover:text-primary transition-colors truncate min-w-0" :title="currentMessage.chat_title">
            {{ currentMessage.chat_title }}
          </a>
        </div>

        <!-- 附近消息列表 -->
        <div ref="scrollContainer" class="space-y-2 pb-2 flex-1 overflow-y-auto" style="scrollbar-gutter: stable"
          @scroll="handleScroll">
          <div v-if="messages.length" class="space-y-1">
              <!-- 上方加载骨架 -->
              <div v-if="isInitialLoad && messages.length === 1" class="space-y-1 animate-pulse">
                <div v-for="i in 3" :key="`skeleton-before-${i}`" class="rounded-md border p-2 bg-muted/20">
                  <div class="flex items-center justify-between text-[11px] mb-1 gap-2">
                    <div class="h-3 bg-muted rounded w-24"></div>
                    <div class="h-3 bg-muted rounded w-20"></div>
                  </div>
                  <div class="h-4 bg-muted rounded w-full mb-1"></div>
                  <div class="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </div>

              <div v-if="isLoadingMoreBefore" class="flex justify-center py-1 text-[11px] text-muted-foreground">
                加载更早的消息...
              </div>

              <div v-for="msg in messages" :key="msg.id" :data-msg-id="msg.id" :ref="(el) =>
                msg.id === currentMessageId && setCurrentMessageEl(el as HTMLElement | null)
                " class="rounded-md border p-2 cursor-pointer transition-colors min-w-0" :class="msg.id === currentMessageId
                  ? 'bg-primary/10 border-primary text-foreground'
                  : 'bg-muted/40 border-transparent text-muted-foreground hover:bg-muted'
                  " @click="handleMessageClick(msg)"
                  @mouseenter="handleMessageMouseEnter($event, msg)"
                  @mouseleave="handleMessageMouseLeave">
                <div class="flex items-center justify-between text-[11px] mb-1 gap-2">
                  <span class="truncate min-w-0 flex-1" :title="msg.user_full_name || `用户 ${msg.user_id}`">
                    {{ msg.user_full_name || `用户 ${msg.user_id}` }}
                  </span>
                  <span class="flex items-center gap-1 shrink-0">
                    <span>{{ formatTimestamp(msg.timestamp) }}</span>
                    <span class="px-1.5 py-0.5 rounded-full bg-background/60 border text-[10px]">
                      {{ formatMessageType(msg.type) }}
                    </span>
                  </span>
                </div>
                <div class="message-content text-sm leading-relaxed wrap-break-word" :class="msg.id === currentMessageId
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground'
                  " v-html="formatMessageContent(msg)"></div>
              </div>

              <!-- 下方加载骨架 -->
              <div v-if="isInitialLoad && messages.length === 1" class="space-y-1 animate-pulse">
                <div v-for="i in 3" :key="`skeleton-after-${i}`" class="rounded-md border p-2 bg-muted/20">
                  <div class="flex items-center justify-between text-[11px] mb-1 gap-2">
                    <div class="h-3 bg-muted rounded w-24"></div>
                    <div class="h-3 bg-muted rounded w-20"></div>
                  </div>
                  <div class="h-4 bg-muted rounded w-full mb-1"></div>
                  <div class="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </div>

              <div v-if="isLoadingMoreAfter" class="flex justify-center py-1 text-[11px] text-muted-foreground">
                加载更晚的消息...
              </div>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
            <LoaderIcon class="h-6 w-6 animate-spin mb-3" />
            <p>正在加载消息...</p>
          </div>
        </div>

        <!-- 输入框 / 操作区（固定在底部区域） -->
        <div v-if="currentMessage" class="shrink-0 mt-auto pt-2 border-t">
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
              requestStatus.text }}</Badge>
          </div>

          <!-- master key：展示完整操作（回复、复读、文件预览等） -->
          <div v-if="isMasterKey" class="flex space-x-2">
            <Input v-model="replyText" placeholder="输入回复内容..." class="flex-1" :disabled="isReplying"
              @keydown.enter="handleReplySubmit" />
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
                  <DropdownMenuItem @click="copyMessage(currentMessage.full_text)">
                    <span>复制全文</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="repeatMessage(currentMessage)" :disabled="isReplying">
                    <span>复读</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button :disabled="currentMessage.type === 'text'" variant="outline" title="查看文件" @click="openFileLink">
              <FileIcon />
            </Button>
            <Button @click="handleReplySubmit" :disabled="!replyText.trim() || isReplying" title="发送">
              <SendIcon v-if="!isReplying" />
              <LoaderIcon v-else class="animate-spin" />
            </Button>
          </div>

          <!-- 非 master key：仅保留复制全文（纯前端功能） -->
          <div v-else class="flex justify-end">
            <Button variant="outline" @click="copyMessage(currentMessage.full_text)">
              <ZapIcon class="mr-1 h-4 w-4" />
              复制全文
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <!-- 图片预览悬浮框 (仅桌面端) -->
  <Teleport to="body">
    <div
      v-if="imagePreview.show && isDesktop"
      class="fixed z-[9999] pointer-events-none"
      :style="{
        left: `${imagePreview.x}px`,
        top: `${imagePreview.y}px`,
        transform: 'translate(10px, -50%)'
      }"
    >
      <div class="bg-popover border rounded-lg shadow-lg p-2 max-w-md">
        <img
          v-if="imagePreview.url"
          :src="imagePreview.url"
          alt="预览"
          class="max-h-96 max-w-full rounded"
          @error="handleImagePreviewError"
        />
        <div v-else class="flex items-center justify-center p-8 text-muted-foreground">
          <LoaderIcon class="h-6 w-6 animate-spin" />
        </div>
      </div>
    </div>
  </Teleport>
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
const isInitialLoad = ref(false) // 标记是否为初始加载阶段
const isAdjustingScroll = ref(false) // 标记程序正在调整滚动位置

// 图片预览状态
const imagePreview = ref({
  show: false,
  url: '',
  x: 0,
  y: 0
})
let hoverTimer: ReturnType<typeof setTimeout> | null = null

// 检测是否为桌面端 (非触摸设备)
const isDesktop = ref(true)
if (typeof window !== 'undefined') {
  isDesktop.value = !('ontouchstart' in window || navigator.maxTouchPoints > 0)
}

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
  isInitialLoad.value = false
  isAdjustingScroll.value = false
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0
  }
}

// 高亮某条消息内容
function formatMessageContent(msg: SearchHit): string {
  return highlightSearchTerms(msg.full_text, props.searchQuery)
}

function setCurrentMessageEl(el: HTMLElement | null) {
  if (el) {
    currentMessageEl.value = el
  }
}

// 滚动到当前消息，确保其可见
function scrollToCurrentMessage() {
  if (currentMessageEl.value && scrollContainer.value) {
    isAdjustingScroll.value = true
    currentMessageEl.value.scrollIntoView({ block: 'center', behavior: 'instant' })
    // 延迟重置标志，给滚动事件处理完成的时间
    requestAnimationFrame(() => {
      isAdjustingScroll.value = false
    })
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

// 检查内容是否不足以滚动，如果是则主动加载更多（仅在初始加载阶段使用）
async function checkAndLoadMoreIfNeeded() {
  // 只在初始加载阶段执行
  if (!isInitialLoad.value) return

  const container = scrollContainer.value
  if (!container) return

  // 如果内容高度不足以产生滚动条，尝试加载更多消息
  if (container.scrollHeight <= container.clientHeight) {
    // 优先加载更晚的消息
    if (hasMoreAfter.value && !isLoadingMoreAfter.value) {
      await loadMoreAfter()
      await nextTick()
      // 递归检查，直到可以滚动或没有更多消息
      if (isInitialLoad.value && container.scrollHeight <= container.clientHeight) {
        await checkAndLoadMoreIfNeeded()
      }
    } else if (hasMoreBefore.value && !isLoadingMoreBefore.value) {
      await loadMoreBefore()
      await nextTick()
      // 递归检查
      if (isInitialLoad.value && container.scrollHeight <= container.clientHeight) {
        await checkAndLoadMoreIfNeeded()
      }
    }
  }
}

async function loadInitialContext(base: SearchHit) {
  // 先重置之前的状态
  replyText.value = ''
  requestStatus.value = null
  messages.value = []
  currentMessageEl.value = null
  isAdjustingScroll.value = false

  // 标记为初始加载阶段
  isInitialLoad.value = true

  // 立即显示当前消息，不阻塞用户交互
  messages.value = [base]
  currentMessageId.value = base.id
  currentChatId.value = base.chat_id
  hasMoreBefore.value = true
  hasMoreAfter.value = true
  lastBeforeAnchorId.value = null
  lastAfterAnchorId.value = null

  // 等待 DOM 渲染当前消息和骨架屏
  await nextTick()
  // 先滚动到当前消息位置（此时有骨架屏占位）
  scrollToCurrentMessage()

  // 异步加载附近消息
  try {
    // 初始加载：以当前消息为起点，加载前后各 10 条，合并为单次请求
    const ids: number[] = []
    for (let i = base.id - 10; i < base.id; i++) {
      if (i > 0) ids.push(i)
    }
    for (let i = base.id + 1; i <= base.id + 10; i++) {
      ids.push(i)
    }

    if (ids.length === 0) return

    const response = await apiService.fetchMessages(base.chat_id, ids).catch(() => ({ hits: [] }))
    const hits = response.hits || []

    // 合并消息
    if (hits.length) {
      mergeMessages(hits)
    }

    // 等待 DOM 更新后滚动到当前消息
    await nextTick()
    scrollToCurrentMessage()

    // 检查是否需要继续加载更多消息以填满容器
    await nextTick()
    await checkAndLoadMoreIfNeeded()

    // 填满后再次确保当前消息可见
    await nextTick()
    scrollToCurrentMessage()

    // 确保初始加载阶段结束
    isInitialLoad.value = false

    // 更新边界状态
    const beforeHits = hits.filter((m) => m.id < base.id)
    const afterHits = hits.filter((m) => m.id > base.id)
    if (beforeHits.length === 0) {
      hasMoreBefore.value = base.id > 1
    }
    if (afterHits.length === 0) {
      hasMoreAfter.value = true // 可能还有更多
    }
  } catch (error) {
    console.error('加载附近消息失败:', error)
  }
}

async function loadMoreBefore() {
  if (isLoadingMoreBefore.value || !hasMoreBefore.value) return
  if (!currentChatId.value || !messages.value.length) return

  const first = messages.value[0]

  // 避免在同一个锚点上重复请求
  if (lastBeforeAnchorId.value === first.id) {
    return
  }

  isLoadingMoreBefore.value = true
  lastBeforeAnchorId.value = first.id

  // 记录当前第一个可见消息的位置信息
  const container = scrollContainer.value
  if (!container) return

  // 找到当前视口中第一个可见的消息元素
  const messageElements = container.querySelectorAll('[data-msg-id]')
  let anchorElement: Element | null = null
  let anchorOffsetTop = 0

  for (const el of messageElements) {
    const rect = el.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    if (rect.top >= containerRect.top) {
      anchorElement = el
      anchorOffsetTop = rect.top - containerRect.top
      break
    }
  }

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

    // 设置滚动调整标志
    isAdjustingScroll.value = true
    mergeMessages(hits)

    // 等待 DOM 更新后恢复锚点元素的位置
    await nextTick()
    await nextTick() // 双重 nextTick 确保 DOM 完全更新

    if (anchorElement && container) {
      const anchorMsgId = anchorElement.getAttribute('data-msg-id')
      if (anchorMsgId) {
        const newAnchorElement = container.querySelector(`[data-msg-id="${anchorMsgId}"]`)
        if (newAnchorElement) {
          const newRect = newAnchorElement.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          const currentOffsetTop = newRect.top - containerRect.top
          const scrollAdjustment = currentOffsetTop - anchorOffsetTop
          container.scrollTop += scrollAdjustment
        }
      }
    }

    // 延迟重置标志
    requestAnimationFrame(() => {
      isAdjustingScroll.value = false
    })
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

  const last = messages.value[messages.value.length - 1]

  // 避免在同一个锚点上重复请求
  if (lastAfterAnchorId.value === last.id) {
    return
  }

  isLoadingMoreAfter.value = true
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
  // 程序调整滚动位置时不触发加载
  if (isAdjustingScroll.value || isInitialLoad.value) return

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
  // 关闭时不立即重置，让动画自然完成
  // 状态会在下次打开时通过 loadInitialContext 重置
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

// 处理图片消息鼠标悬停
function handleMessageMouseEnter(event: MouseEvent, msg: SearchHit) {
  // 仅桌面端且仅图片类型消息才启用预览
  if (!isDesktop.value || msg.type !== 'photo') return

  // 清除之前的定时器
  if (hoverTimer) {
    clearTimeout(hoverTimer)
  }

  // 立即获取元素位置信息，避免定时器回调时 currentTarget 为 null
  const target = event.currentTarget as HTMLElement
  if (!target) return

  const rect = target.getBoundingClientRect()
  const previewX = rect.right
  const previewY = rect.top + rect.height / 2

  // 延迟 500ms 显示预览
  hoverTimer = setTimeout(async () => {
    imagePreview.value.x = previewX
    imagePreview.value.y = previewY
    imagePreview.value.show = true
    imagePreview.value.url = ''

    // 异步加载图片 URL
    try {
      const url = await getFileUrl(msg)
      // 仅在预览仍然显示时更新 URL
      if (imagePreview.value.show) {
        imagePreview.value.url = url
      }
    } catch (error) {
      console.error('加载图片预览失败:', error)
      imagePreview.value.show = false
    }
  }, 500)
}

function handleMessageMouseLeave() {
  // 清除定时器
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  // 隐藏预览
  imagePreview.value.show = false
  imagePreview.value.url = ''
}

function handleImagePreviewError() {
  imagePreview.value.show = false
  imagePreview.value.url = ''
}
</script>
