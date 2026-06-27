# 宝塔 / Nginx 生产部署指南

本文档用于将本项目部署到生产环境。推荐结构是一个后端 API 服务，加两个宝塔站点：主页站点和管理后台站点。

## 部署结构

- **后端 API**：Node.js + Express，监听 `127.0.0.1:3000`，由 PM2 守护。
- **主页站点**：宝塔站点 A，网站目录指向根目录构建产物 `dist`。
- **管理后台站点**：宝塔站点 B，网站目录指向 `server/admin-panel/dist`。
- **数据库**：MySQL 或兼容 MySQL 的 MariaDB。
- **上传文件**：后端从 `server/uploads` 对外提供 `/uploads` 静态文件。

示例域名：

- 主页：`https://example.com`
- 管理后台：`https://admin.example.com`
- API：不单独暴露域名，由两个站点反向代理 `/api` 和 `/uploads` 到后端。

## 环境要求

- Node.js `>= 20`
- MySQL `>= 8`，或兼容的 MariaDB
- PM2
- 宝塔面板 Nginx

在服务器安装 PM2：

```sh
npm install -g pm2
```

## 代码与依赖

建议将代码放在宝塔网站目录之外或主站目录内，例如：

```sh
cd /www/wwwroot
git clone https://github.com/Yunmoan/jgl_homepage.git
cd jgl_homepage
```

安装三部分依赖：

```sh
# 主页
npm install

# 后端
cd server
npm install

# 管理后台
cd admin-panel
npm install
```

## 后端配置

在 `server/.env` 写入生产环境配置：

```env
DB_HOST=localhost
DB_USER=jgl_homepage
DB_PASSWORD=请替换为强密码
DB_DATABASE=jgl_homepage
PORT=3000
RECAPTCHA_SECRET_KEY=请替换为生产环境密钥
JWT_SECRET=请替换为足够长的随机字符串
```

注意：

- `JWT_SECRET` 必须在生产环境设置为长随机字符串，不要使用示例值。
- 如果暂时不启用 reCAPTCHA，也要确认注册接口的限流仍然开启。
- 不要在生产库运行 `npm run db:seed`，该脚本会写入演示数据，可能覆盖现有内容。

## 构建

在项目根目录构建主页：

```sh
cd /www/wwwroot/jgl_homepage
npm run build
```

构建后端并执行迁移：

```sh
cd /www/wwwroot/jgl_homepage/server
npm run build
npm run db:migrate
```

构建管理后台：

```sh
cd /www/wwwroot/jgl_homepage/server/admin-panel
npm run build
```

## 启动后端

```sh
cd /www/wwwroot/jgl_homepage/server
pm2 start dist/index.js --name jgl-homepage-api
pm2 save
```

确认后端运行：

```sh
pm2 status
curl http://127.0.0.1:3000/api
```

## 宝塔站点配置

### 主页站点

在宝塔创建主页站点，网站目录设置为：

```text
/www/wwwroot/jgl_homepage/dist
```

Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    root /www/wwwroot/jgl_homepage/dist;
    index index.html;
    client_max_body_size 10m;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 管理后台站点

在宝塔创建管理后台站点，网站目录设置为：

```text
/www/wwwroot/jgl_homepage/server/admin-panel/dist
```

Nginx 配置示例：

```nginx
server {
    listen 80;
    server_name admin.example.com;
    root /www/wwwroot/jgl_homepage/server/admin-panel/dist;
    index index.html;
    client_max_body_size 10m;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置完成后，在宝塔中为两个站点分别申请 HTTPS 证书。

## 导入当前成员社团与 History

当前前台静态数据位于：

- 成员社团：`public/data/members_generated.json`
- History：`public/data/history.json`

生产环境推荐使用导入脚本写入数据库：

```sh
cd /www/wwwroot/jgl_homepage/server
npm run db:import-members-history
```

该脚本是幂等的：

- 按 JSON 里的 `id` 新增或更新 `members` 和 `history`。
- 不会清空生产表。
- 不会修改成员社团的 `owner_user_id`，因此不会破坏已经绑定的社团账号。
- 会把旧的 `pictures/...` 或 `history/...` 图片路径规范化为 `/uploads/pictures/...`。

导入前需要同步图片文件：

- 成员社团 Logo：同步到 `server/uploads/member_logos_circular`
- History 图片：同步到 `server/uploads/pictures`

如果服务器没有这些文件，数据库记录虽然能导入，但页面图片会显示失败。

## 更新部署

每次更新代码后按顺序执行：

```sh
cd /www/wwwroot/jgl_homepage
git pull
npm install
npm run build

cd server
npm install
npm run build
npm run db:migrate
pm2 restart jgl-homepage-api

cd admin-panel
npm install
npm run build
```

如果只改了前端或后台界面，可以只重新构建对应部分。

## 备份与回滚

迁移或导入生产数据前，先备份数据库：

```sh
mysqldump -u jgl_homepage -p jgl_homepage > jgl_homepage_backup.sql
```

如果导入后发现数据异常，可以先恢复数据库备份，再回滚代码版本并重新构建。

## 申请 Logo 必填

社团账号申请时必须上传社团 Logo。前台申请页和后台申请资料编辑页都会校验该字段；后端注册和申请资料更新接口也会拒绝缺少 Logo 的提交。
