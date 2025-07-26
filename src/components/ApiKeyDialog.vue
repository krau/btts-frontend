<template>
  <Dialog :open="open" @update:open="updateOpen">
    <DialogTrigger as-child>
      <Button variant="outline" size="sm">
        <KeyIcon class="mr-2 h-4 w-4" />
        {{ isApiKeyConfigured ? '更新' : '配置' }} API Key
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>配置 API Key</DialogTitle>
        <DialogDescription>
          请输入你的 BTTS API Key 以访问搜索功能。API Key 将安全地存储在本地浏览器中。
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="space-y-2">
          <label for="api-key" class="text-sm font-medium"> API Key </label>
          <div class="relative">
            <Input
              id="api-key"
              v-model="apiKeyInput"
              :type="showKey ? 'text' : 'password'"
              placeholder="输入你的 API Key"
              class="pr-10"
              @keydown.enter="handleSave"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              @click="showKey = !showKey"
            >
              <EyeIcon v-if="!showKey" class="h-4 w-4" />
              <EyeOffIcon v-else class="h-4 w-4" />
            </Button>
          </div>
          <p v-if="error" class="text-sm text-destructive">
            {{ error }}
          </p>
        </div>

        <!-- 测试连接状态 -->
        <div v-if="isTestingConnection" class="flex items-center space-x-2 text-sm">
          <LoaderIcon class="h-4 w-4 animate-spin" />
          <span>正在测试连接...</span>
        </div>

        <div v-if="connectionStatus" class="flex items-center space-x-2 text-sm">
          <CheckCircleIcon v-if="connectionStatus === 'success'" class="h-4 w-4 text-green-600" />
          <XCircleIcon v-else class="h-4 w-4 text-red-600" />
          <span :class="connectionStatus === 'success' ? 'text-green-600' : 'text-red-600'">
            {{ connectionStatus === 'success' ? '连接成功！' : '连接失败，请检查 API Key' }}
          </span>
        </div>
      </div>

      <DialogFooter class="flex-col space-y-2 sm:flex-row sm:space-y-0">
        <div class="flex space-x-2 sm:ml-auto">
          <Button v-if="isApiKeyConfigured" variant="outline" @click="handleClear"> 清除 </Button>
          <Button
            variant="outline"
            @click="handleTest"
            :disabled="!apiKeyInput.trim() || isTestingConnection"
          >
            <TestTubeIcon class="mr-2 h-4 w-4" />
            测试连接
          </Button>
          <Button @click="handleSave" :disabled="!apiKeyInput.trim() || isTestingConnection">
            <SaveIcon class="mr-2 h-4 w-4" />
            保存
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  KeyIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderIcon,
  CheckCircleIcon,
  XCircleIcon,
  TestTubeIcon,
  SaveIcon,
} from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSearchStore } from '@/stores/search'
import { apiService } from '@/services/api'
import { validateApiKey } from '@/utils/helpers'

interface Props {
  open?: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'saved'): void
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
})

const emit = defineEmits<Emits>()

const searchStore = useSearchStore()
const { apiKey, isApiKeyConfigured } = storeToRefs(searchStore)

// 本地状态
const apiKeyInput = ref('')
const showKey = ref(false)
const error = ref('')
const isTestingConnection = ref(false)
const connectionStatus = ref<'success' | 'error' | null>(null)

// 监听 open 变化，初始化输入框
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      apiKeyInput.value = apiKey.value || ''
      error.value = ''
      connectionStatus.value = null
    }
  },
)

// 更新 open 状态
function updateOpen(value: boolean) {
  emit('update:open', value)
}

// 测试连接
async function handleTest() {
  if (!apiKeyInput.value.trim()) {
    error.value = 'API Key 不能为空'
    return
  }

  if (!validateApiKey(apiKeyInput.value)) {
    error.value = 'API Key 格式无效'
    return
  }

  isTestingConnection.value = true
  connectionStatus.value = null
  error.value = ''

  try {
    // 临时设置 API Key 进行测试
    const originalKey = apiService.getApiKey()
    apiService.setApiKey(apiKeyInput.value)

    // 尝试获取聊天列表
    await apiService.getIndexedChats()

    connectionStatus.value = 'success'

    // 恢复原来的 API Key
    if (originalKey) {
      apiService.setApiKey(originalKey)
    } else {
      apiService.clearApiKey()
    }
  } catch (err) {
    connectionStatus.value = 'error'
    console.error('API Key test failed:', err)

    // 恢复原来的 API Key
    const originalKey = searchStore.apiKey
    if (originalKey) {
      apiService.setApiKey(originalKey)
    } else {
      apiService.clearApiKey()
    }
  } finally {
    isTestingConnection.value = false
  }
}

// 保存 API Key
async function handleSave() {
  if (!apiKeyInput.value.trim()) {
    error.value = 'API Key 不能为空'
    return
  }

  if (!validateApiKey(apiKeyInput.value)) {
    error.value = 'API Key 格式无效'
    return
  }

  try {
    searchStore.setApiKey(apiKeyInput.value)
    emit('saved')
    updateOpen(false)

    // 重新加载聊天列表
    await searchStore.loadIndexedChats()
  } catch (err) {
    error.value = '保存失败，请重试'
    console.error('Failed to save API key:', err)
  }
}

// 清除 API Key
function handleClear() {
  searchStore.clearApiKey()
  apiKeyInput.value = ''
  connectionStatus.value = null
  emit('saved')
  updateOpen(false)
}
</script>
