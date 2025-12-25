<template>
  <div class="min-h-screen bg-background">
    <!-- 顶部导航栏 -->
    <header class="border-b bg-card">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <h1 class="text-2xl font-bold p-2">BTTS</h1>
            <a class="text-sm text-muted-foreground" href="https://github.com/krau/btts"
              >Telegram 消息搜索</a
            >
          </div>

          <div class="flex items-center space-x-2">
            <!-- API Key 配置 -->
            <ApiKeyDialog v-model:open="isApiDialogOpen" @saved="handleApiKeySaved" />

            <!-- 主题切换 -->
            <DarkModeMenu />
          </div>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="container mx-auto px-4 py-6">
      <!-- API Key 未配置提示 -->
      <div v-if="!isApiKeyConfigured" class="mb-6">
        <Card class="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent class="p-6">
            <div class="flex items-center space-x-3">
              <AlertTriangleIcon class="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <h3 class="font-medium text-amber-800 dark:text-amber-200">需要配置 API Key</h3>
                <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  请先配置你的 BTTS API Key 以开始使用搜索功能。
                </p>
              </div>
              <Button variant="outline" size="sm" class="ml-auto" @click="isApiDialogOpen = true">
                立即配置
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 搜索表单 -->
      <div class="mb-6">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center space-x-2">
              <SearchIcon class="h-5 w-5" />
              <span>搜索消息</span>
            </CardTitle>
            <CardDescription> 在 Telegram 消息中搜索内容，支持多种过滤条件 </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchForm />
          </CardContent>
        </Card>
      </div>

      <!-- 搜索结果 -->
      <SearchResults />

      <!-- 错误提示 -->
      <div v-if="error" class="mt-6">
        <Card class="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent class="p-4">
            <div class="flex items-center space-x-3">
              <XCircleIcon class="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <h3 class="font-medium text-red-800 dark:text-red-200">操作失败</h3>
                <p class="text-sm text-red-700 dark:text-red-300 mt-1">
                  {{ error }}
                </p>
              </div>
              <Button variant="ghost" size="sm" @click="error = ''">
                <XIcon class="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { SearchIcon, AlertTriangleIcon, XCircleIcon, XIcon } from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SearchForm from '@/components/SearchForm.vue'
import SearchResults from '@/components/SearchResults.vue'
import ApiKeyDialog from '@/components/ApiKeyDialog.vue'
import DarkModeMenu from '@/components/DarkModeMenu.vue'
import { useSearchStore } from '@/stores/search'
import { validateApiKey } from '@/utils/helpers'

const searchStore = useSearchStore()
const { isApiKeyConfigured, apiKey } = storeToRefs(searchStore)

const route = useRoute()
const router = useRouter()

// 本地状态
const isApiDialogOpen = ref(false)
const error = ref('')

// 处理 API Key 保存
async function handleApiKeySaved() {
  error.value = ''
  try {
    await searchStore.loadIndexedChats()
    // 显示成功通知
    const { toast } = await import('vue-sonner')
    toast.success('API Key 配置成功')
  } catch (err) {
    error.value = '加载聊天列表失败，请检查网络连接和 API Key'
    console.error('Failed to load chats after API key saved:', err)
    const { toast } = await import('vue-sonner')
    toast.error('加载聊天列表失败')
  }
}

// 通过 URL 参数自动配置 API Key，例如 /?key=xxxx
onMounted(async () => {
  const queryKey = route.query.key
  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey

  if (!key || typeof key !== 'string') return
  if (!validateApiKey(key)) {
    // 无效 key，直接移除 URL 参数
    await router.replace({ query: { ...route.query, key: undefined } })
    return
  }

  // 如果当前已经是同一个 key，只做 URL 清理
  if (apiKey.value === key) {
    await router.replace({ query: { ...route.query, key: undefined } })
    return
  }

  try {
    searchStore.setApiKey(key)
    await searchStore.loadIndexedChats()
    const { toast } = await import('vue-sonner')
    toast.success('已根据链接自动配置 API Key')
  } catch (err) {
    console.error('Failed to auto set API key from URL:', err)
    const { toast } = await import('vue-sonner')
    toast.error('配置 API Key 失败')
  } finally {
    // 配置成功或失败都移除 URL 中的 key，避免泄露
    await router.replace({ query: { ...route.query, key: undefined } })
  }
})
</script>
