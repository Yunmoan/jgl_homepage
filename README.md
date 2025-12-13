# 河北东方高校联合会主页 - 东方Project

这是河北东方高校联合会（河北东方Project高校同好会联盟）的官方网站，旨在展示联合会的介绍、活动、成员社团、制品等信息。

## 特点

- 响应式设计，适配各种屏幕尺寸
- 基于 Markdown 的静态文档功能
- 现代化的用户界面，美观简洁
- 名人堂、成员社团、留言板等多种功能
- 完整的前后端分离架构，包含独立管理后台

## 技术栈

本项目由三个主要部分构成：前端主页、后端服务和管理面板。

- **前端 (主页)**
  - **框架**: Vue 3
  - **构建工具**: Vite
  - **语言**: TypeScript

- **后端 (API服务)**
  - **环境**: Node.js
  - **框架**: Express
  - **语言**: TypeScript
  - **数据库**: MySQL

- **管理面板**
  - **框架**: Vue 3
  - **构建工具**: Vite
  - **语言**: TypeScript
  - **UI库**: Element Plus
  - **Markdown编辑器**: `@kangc/v-md-editor`

## 项目结构

```
.
├── /dist                   # 前端主页构建产物
├── /public                 # 前端主页静态资源
├── /server                 # 后端服务
│   ├── /admin-panel        # 管理面板项目
│   ├── /sql                # 数据库初始化脚本
│   └── /src                # 后端源码
├── /src                    # 前端主页源码
├── compress_images.py      # 图片压缩脚本
├── generate_members_json.py # 成员数据生成脚本
└── ...
```

## 开发

请确保您的环境中已安装 **Node.js (>= 20.x)** 和 **Python**。

### 1. 前端 (主页)

```sh
# 克隆仓库
git clone https://github.com/Yunmoan/jgl_homepage.git
cd jgl_homepage

# 安装依赖
npm install

# 启动开发服务器 (通常在 http://localhost:5173)
npm run dev
```

### 2. 后端 (API服务)

后端服务为前端和管理面板提供数据接口。

```sh
# 进入后端目录
cd server

# 安装依赖
npm install

# 配置环境变量
# 复制 .env.example 或手动创建 .env 文件
# 并填入数据库连接信息和JWT密钥

# 启动开发服务器 (通常在 http://localhost:3000)
npm run dev
```

### 3. 管理面板

管理面板用于管理网站内容。

```sh
# 进入管理面板目录
cd server/admin-panel

# 安装依赖
npm install

# 启动开发服务器 (通常在 http://localhost:5174)
npm run dev
```

## 构建与部署

本项目前后端分离，需要分别构建和部署。

### 1. 后端部署

```sh
# 1. 进入后端目录
cd server

# 2. 安装生产依赖
npm install --production

# 3. 编译TypeScript
npm run build

# 4. 启动服务 (建议使用PM2等进程管理器)
pm2 start dist/index.js --name jgl-homepage-backend
```

### 2. 前端构建

```sh
# 1. 进入项目根目录
cd jgl_homepage

# 2. (可选) 运行数据处理脚本
python generate_members_json.py

# 3. 构建前端应用
npm run build
```

构建产物将生成在根目录的 `dist` 文件夹中。

### 3. 部署

推荐使用 Nginx 或类似的 Web 服务器进行部署。

1.  **部署后端**: 将后端服务运行在服务器上，确保端口（默认为3000）可访问。
2.  **部署前端**: 将根目录 `dist` 下的所有文件上传到服务器的网站根目录（例如 `/var/www/html`）。
3.  **配置Nginx**: 设置反向代理，将 API 请求（如 `/api` 和 `/uploads`）转发到后端服务。

一个简单的 Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html; # 前端文件目录
    index index.html;

    # 处理前端History模式路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 将API请求代理到后端
    location /api {
        proxy_pass http://localhost:3000; # 后端服务地址
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 代理上传文件目录
    location /uploads {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

## 许可

© 2025 河北东方高校联合会. 保留所有权利。
