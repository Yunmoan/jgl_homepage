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

## 展会日历更新

首次部署或更新展会日历时，先在 `server` 中运行 `npm run db:migrate-exhibitions`，再部署新的 API。
该专用迁移创建缺失的 `exhibitions` 和 `exhibition_settings` 表；对于已安装的展会表，
仅在缺少 `participation_notes` 时新增可空的参展备注字段。可以重复执行，
不会运行其他表的迁移、清空或改写已有业务记录，也不会写入演示展会。
连接数据库失败时迁移会返回非零退出码，修复连接后可重新执行。

同时重新构建主站和管理后台；后台新增了 `vue-tsc` 开发依赖，构建前需安装完整依赖。
日历组件由主站与后台共用，因此构建后台时应保留完整仓库目录。

- 主站：首页默认仅显示当月；`/exhibitions` 独立页面保留全年日历，支持年份、参展状态、日期筛选及列表分页。
- 后台：管理员在“内容 → 展会日历”（`/admin/exhibitions`）维护展会和高联参展绑定；数据源、缓存与首页显示范围集中在“系统 → 系统设置”（`/admin/system-settings`）。这两个页面及对应写接口都仅限 `admin` 角色访问。
- 详情：月视图日期格展示展会名称；悬停、聚焦或点击展会日期，可查看完整时间、地点、摊位、参展计划、参展信息、简介和详情链接。
- 权限：只有 `admin` 可以修改；`editor`、`member` 和 `viewer` 无编辑权限，后端独立校验。
- 日期：按日期保存（`YYYY-MM-DD`），首尾日期均包含，可跨月、跨年，不进行时区偏移。
- 参展计划：“参展待定”“高联参展”“不参展”均对外公开，地点、摊位、说明和链接可选。
- 参展信息：管理员可单独填写多行备注（最多 2000 字），例如参与社团、出展内容和参展安排；首页与独立页面的列表、日历详情均公开展示，留空则隐藏。

### 展会数据源与缓存

默认数据源为 `thonly.cc` 的公开东方活动表格，主站与管理后台会合并展示来源活动和本站手工维护的活动。
来源数据由服务器自动维护，通常不需要管理员手动操作：

- **自动同步表格列表**：服务器会定期读取 `https://thonly.cc/calendar/` 内嵌的公开表格地址，
  自动发现 thonly 新发布的年度表格；页面自身带浏览器挑战，服务器读取失败时会通过只读渲染服务
  `r.jina.ai` 获取同一公开页面，仍失败则继续使用上次成功发现的列表和内置地址。
- **多线路读取**：拉取活动数据时优先直连 Google Sheets 公开接口（`sheets.googleapis.com`）；
  失败后再尝试 thonly.cc 的公开代理；两者都被拦截时，最后通过只读渲染镜像 `r.jina.ai`
  读取同一公开 JSON 接口。所有线路都不可用时回退到最近一次成功缓存或内置种子。
- **后台定时刷新**：默认缓存方式为“定时缓存”，服务器每分钟检查一次配置，缓存过期后在后台刷新，
  即使没有访客也会保持数据更新；表格列表最多每 6 小时重新发现一次。
- **缓存位置**：`server/data/exhibition-cache/`，需确保运行后端的用户有写权限。
  仓库内置 `thonly.seed.json` 离线种子（生成时的公开数据），首次部署无法联网时仍能展示活动；
  成功联网拉取后会自动改用实时缓存，不会覆盖种子文件。
- **仅离线 / 不缓存**：后台可切换“仅离线（不联网）”“定时缓存，失败回退旧缓存”“不缓存（每次实时读取）”，
  缓存时长支持秒、分钟、小时、天。仅离线模式不会发起任何外部请求，也不会自动发现表格。
- **来源标注**：启用外部数据源后，主站日历会显示“数据源来自 thonly.cc”；来源活动卡片也会标注数据源。
  高联参展状态、摊位和备注单独保存在 `exhibition_bindings`，来源刷新不会覆盖。
- **网络受限时**：若生产服务器无法访问 Google 或 thonly.cc，可在能够访问来源的网络中打开管理后台，
  点击“立即更新缓存”生成快照；之后服务器会使用该缓存，直到网络恢复。

自动检查可在 `server` 中运行 `npm test`。测试替换数据库访问，仅使用内存数据，
覆盖接口鉴权、增删改、输入校验、跨年筛选、日历日期计算、thonly 表格列表解析、缓存回退和离线种子，
不会访问真实数据库。
如需本地界面验收，可在后端编译后运行 `node tests/helpers/exhibitions-fixture.cjs`，
该临时 API 仅监听本机，端口由 `EXHIBITION_QA_PORT` 设置（默认 3000）；已运行真实服务时请勿占用同一端口。
测试管理员为 `test_admin0`，密码为 `local-fixture`。
此脚本仅供本地测试，数据在退出时丢弃；生产服务仍使用 `npm start`。

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
