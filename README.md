# HexaFin

赛博玄学金融预测系统：FMP 市场数据 → SHA-256 种子化大衍筮法 → LLM 解卦 → 终端风格前端展示。

## 本地 Docker 运行

### 1. 准备配置

```bash
cp .env.example .env
# 编辑 .env，填入 FMP_API_KEY / LLM_API_KEY（可选，留空也能跑）
```

编辑 `backend/tickers.txt` 可增删股票标的（每行一个 ticker）。

### 2. 一键启动

```bash
# 生成卦象数据 + 启动前端
make run
```

浏览器打开 http://localhost:8080

### 3. 分步运行

```bash
make build    # 构建 engine 镜像
make divine   # 仅运行引擎，写入 public/daily_result.json
make up       # 仅启动前端（使用已有 daily_result.json）
```

也可直接用 docker compose：

```bash
docker compose --profile engine run --rm engine   # 生成数据
docker compose up web                               # 启动前端
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `WEB_PORT` | 前端端口 | `8080` |
| `FMP_API_KEY` | FMP API Key | 空（占位数据） |
| `LLM_API_KEY` | OpenAI / Anthropic Key | 空（本地兜底） |
| `LLM_PROVIDER` | `openai` 或 `anthropic` | `openai` |
| `ORACLE_DATE` | 起卦日期 `YYYY-MM-DD` | 当天 UTC |
| `OUTPUT_PATH` | 输出 JSON 路径 | `public/daily_result.json` |
| `TICKERS_FILE` | 标的列表路径 | `backend/tickers.txt` |

## 生产部署（GitHub Actions + Cloudflare Pages）

1. 在 GitHub Secrets 配置 `FMP_API_KEY`、`LLM_API_KEY`、`LLM_PROVIDER`
2. Actions 工作流 `daily_oracle.yml` 每日自动生成 `public/daily_result.json` 并 push
3. Cloudflare Pages 连接仓库，Build output directory 设为 `public`，无需构建命令
