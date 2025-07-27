import { toast } from 'vue-sonner'

// 格式化时间戳
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 小于1小时
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return minutes < 1 ? '刚刚' : `${minutes}分钟前`
  }

  // 小于1天
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  }

  // 小于7天
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days}天前`
  }

  // 显示具体日期
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 格式化消息类型
export function formatMessageType(type: string): string {
  const typeMap: Record<string, string> = {
    text: '文本',
    photo: '图片',
    video: '视频',
    document: '文档',
    voice: '语音',
    audio: '音频',
    poll: '投票',
    story: '故事',
  }
  return typeMap[type] || type
}

// 获取消息类型的颜色主题
export function getMessageTypeVariant(
  type: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const colorMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    text: 'default',
    photo: 'secondary',
    video: 'destructive',
    document: 'outline',
    voice: 'secondary',
    audio: 'secondary',
    poll: 'default',
    story: 'outline',
  }
  return colorMap[type] || 'default'
}

// 截断文本
export function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// 高亮搜索关键词
export function highlightSearchTerms(text: string, searchQuery: string): string {
  if (!searchQuery.trim()) return text

  const terms = searchQuery.trim().split(/\s+/)
  let highlightedText = text

  terms.forEach((term) => {
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi')
    highlightedText = highlightedText.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>',
    )
  })

  return highlightedText
}

// 转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// 验证 API Key 格式
export function validateApiKey(key: string): boolean {
  // 简单验证：非空且长度大于10
  return key.trim().length > 1
}

// 去重数组
export function uniqueArray<T>(array: T[]): T[] {
  return Array.from(new Set(array))
}

export const openLink = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function copyMessage(message: string, tip: string = '已复制到剪贴板') {
  try {
    await navigator.clipboard.writeText(message)
    toast.success(tip)
  } catch (error) {
    console.error('复制失败:', error)
    toast.error('复制失败，请重试')
  }
}
