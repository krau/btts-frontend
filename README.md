# BTTS Frontend - Better Telegram Search

一个现代化的 Telegram 消息搜索前端界面，基于 Vue 3 和 shadcn-vue 构建。

## 功能特性

- ✅ 现代化 UI 设计，基于 shadcn-vue
- ✅ 响应式布局，支持移动端
- ✅ 深色模式支持
- ✅ API Key 安全存储
- ✅ 多聊天搜索
- ✅ 消息类型过滤
- ✅ 分页支持
- ✅ 搜索结果高亮
- ✅ 消息内容复制
- ✅ 实时搜索统计

## 快速开始

1. 安装依赖：
```bash
pnpm install
```

2. 启动开发服务器：
```bash
pnpm dev
```

3. 访问 http://localhost:5173

## 环境变量配置

创建 `.env.local` 文件来覆盖默认配置：

```
# API 服务器地址
VITE_API_BASE_URL=http://your-api-server:8080/api
```

## 技术栈

- Vue 3 + TypeScript
- Tailwind CSS 4
- shadcn-vue 组件库
- Pinia 状态管理
- Vue Router 路由
- ky HTTP 客户端
- Lucide Vue 图标

## 项目结构

```
src/
├── components/          # 组件
│   ├── ui/             # shadcn-vue 组件
│   ├── SearchForm.vue  # 搜索表单
│   ├── SearchResults.vue # 搜索结果
│   └── ApiKeyDialog.vue # API Key 配置
├── stores/             # Pinia 状态管理
├── services/           # API 服务
├── types/              # TypeScript 类型定义
├── utils/              # 工具函数
└── views/              # 页面组件
```

## 部署

构建生产版本：

```bash
pnpm build
```

构建产物位于 `dist/` 目录，可以部署到任何静态文件服务器。

## License

MIT
