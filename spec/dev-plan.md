# HexaFin 完整开发计划

## 项目概述

构建完整的 HexaFin "赛博玄学"金融预测系统：Python 后端（FMP 数据获取 + SHA-256 种子化周易大衍筮法 + LLM 解卦）、静态前端（终端风格三栏布局）、GitHub Actions 自动化流水线。

---

## 最终文件结构

```
HexaFin/
├── .github/workflows/daily_oracle.yml    # GitHub Actions 定时任务
├── backend/
│   ├── hexafin_engine.py                 # 核心引擎：数据获取→哈希炼化→起卦→AI解读
│   ├── i_ching_data.json                 # 64卦静态字典（二进制映射 + 卦辞）
│   ├── requirements.txt                  # Python 依赖
│   └── tickers.txt                       # 标的列表，一行一个 ticker
├── public/
│   ├── index.html                        # 三栏终端风格前端
│   ├── style.css                         # 黑底绿字赛博朋克样式
│   ├── script.js                         # 读取 JSON 并渲染动画
│   └── daily_result.json                 # 每日自动生成的结果（含示例数据）
```

---

## 开发步骤

### 第一步：创建 `backend/i_ching_data.json`（64卦数据字典）

创建完整的 64 卦静态数据。每个卦包含：
- `binary`：6 位二进制字符串（初爻在最右位）
- `name`：卦名（如"乾为天"）
- `symbol`：Unicode 卦象符号
- `meaning`：卦辞摘要

以二进制字符串作为 key 进行查找（如 `"111111"` -> 乾为天）。

---

### 第二步：创建 `backend/tickers.txt`（标的列表文件）

纯文本文件，每行一个 ticker 代码：
```
TSLA
QQQ
NVDA
```

用户可自行编辑此文件增删标的。

---

### 第三步：创建 `backend/requirements.txt`（Python 依赖）

```
requests>=2.28.0
openai>=1.0.0
anthropic>=0.18.0
```

---

### 第四步：创建 `backend/hexafin_engine.py`（核心引擎）

主脚本包含以下模块：

#### 4.1 FMP 数据获取模块
- 函数：`fetch_fmp_data(ticker, api_key) -> dict`
- 调用 FMP API 获取收盘价、成交量、RSI、MACD
- 返回：`{"close": float, "volume": int, "rsi": float, "macd": str}`

#### 4.2 哈希种子生成模块
- 函数：`generate_seed(ticker, date, close, volume) -> int`
- 拼接字符串：`f"{ticker}-{date}-{close}-{volume}"`
- SHA-256 哈希 → 转整数 → 注入 `random.seed()`
- 返回种子值供 JSON 记录

#### 4.3 大衍筮法推演模块（核心算法）
- 函数：`perform_divination() -> (lines_array, divination_logs)`
- 外层循环 6 次（生成 6 爻，从初爻到上爻）
- 每爻内层循环 3 次（三变），起始 `stalks = 49`：
  1. 分而为二：`left = random.randint(1, stalks-1)`, `right = stalks - left`
  2. 挂一：`right -= 1`
  3. 揲四归奇：`left_rem = left % 4 or 4`, `right_rem = right % 4 or 4`
  4. 计算移除：`removed = left_rem + right_rem + 1`
  5. 更新：`stalks -= removed`
  6. 记录日志：`{change, left, right, left_rem, right_rem, removed, remaining}`
- 三变结束：`line_value = stalks // 4`（结果为 6/7/8/9）

#### 4.4 卦象查询模块
- 函数：`lookup_hexagram(lines) -> dict`
- 爻值映射二进制：6→0, 7→1, 8→0, 9→1
- 组合二进制字符串查 `i_ching_data.json` 得本卦
- 找出动爻（值为 6 或 9），翻转对应位得之卦
- 返回：`{original, moving_lines, changed}`

#### 4.5 AI 解卦模块（支持 OpenAI / Anthropic 双引擎）
- 函数：`get_ai_oracle(hexagram_data, fmp_data, ticker) -> dict`
- 通过环境变量 `LLM_PROVIDER` 选择引擎（"openai" 或 "anthropic"）
- System Prompt：玄学金融大宗师人设（来自 PRD 规范）
- 要求 LLM 返回结构化 JSON：
  - `decryption`：象辞破译（赛博武侠风，100字内）
  - `market_mapping`：盘面映射（结合 RSI/MACD，150字内）
  - `action`：操作评级（Strong Buy / Buy / Hold / Sell / Strong Sell）
  - `support_level`：支撑位
  - `resistance_level`：阻力位

#### 4.6 主执行流程
- 读取 `tickers.txt` 获取标的列表
- 遍历每个 ticker 执行完整流水线
- 输出 `public/daily_result.json`（数组格式，每个 ticker 一个结果对象）
- 环境变量：`FMP_API_KEY`, `LLM_API_KEY`, `LLM_PROVIDER`

---

### 第五步：创建 `public/daily_result.json`（示例数据）

提供一份符合规范的完整示例数据，便于前端独立开发和测试，包含完整的 18 变日志、卦象信息和 AI 解读。

---

### 第六步：创建 `public/style.css`（赛博朋克样式）

- 背景色：纯黑 `#000000`
- 主文字：终端荧光绿 `#00FF00`
- 警告/动爻：红色 `#FF0000`
- 卦象点缀：暗金色 `#FFD700`
- 字体：等宽字体（Courier New / Source Code Pro）
- 三栏 CSS Grid 布局
- CRT 扫描线效果（微妙的 CSS 动画）
- 闪烁动画关键帧
- 响应式断点（移动端改为竖向堆叠）

---

### 第七步：创建 `public/index.html`（前端主页）

- 免责声明弹窗（首次访问必须点击确认）
- 三栏结构：
  - 左栏：金融数据面板（Ticker、收盘价、成交量、RSI、MACD）
  - 中栏：终端推演日志流
  - 右栏：六爻卦象 ASCII 图 + AI 神谕报告
- Ticker 选择器（多标的切换）
- 引入 style.css 和 script.js

---

### 第八步：创建 `public/script.js`（前端交互逻辑）

- 页面加载时 fetch `daily_result.json`
- 免责弹窗逻辑：首次显示，localStorage 记录已确认状态
- Terminal 打字机动画：
  - 每 ~280ms 打印一行推演日志（18 行共约 5 秒）
  - 格式：`[爻 X | 变 Y] 左: XX | 右: XX | 移除: X | 剩余: XX`
- 结果揭晓动画：
  - 日志打完后闪烁两次
  - 显示卦象 ASCII（`██████` 阳爻，`██  ██` 阴爻，动爻用红色标记）
  - 平滑淡入 AI 解读文本
- 左栏数据填充
- Ticker 切换逻辑

---

### 第九步：创建 `.github/workflows/daily_oracle.yml`（自动化流水线）

- 定时触发：`cron: '0 22 * * 1-5'`（UTC 22:00 = 美东 17:00，工作日执行）
- 手动触发：`workflow_dispatch`
- 执行步骤：
  1. Checkout 代码
  2. 配置 Python 3.11
  3. 安装依赖
  4. 运行 `hexafin_engine.py`（注入 Secrets 环境变量）
  5. 自动 commit 并 push `daily_result.json`

---

## 实现顺序

| 序号 | 文件 | 说明 |
|------|------|------|
| 1 | `backend/i_ching_data.json` | 基础数据，无依赖 |
| 2 | `backend/tickers.txt` | 标的配置 |
| 3 | `backend/requirements.txt` | 依赖声明 |
| 4 | `backend/hexafin_engine.py` | 核心逻辑（依赖 1、2、3）|
| 5 | `public/daily_result.json` | 示例数据供前端使用 |
| 6 | `public/style.css` | 样式（无依赖）|
| 7 | `public/index.html` | 页面结构 |
| 8 | `public/script.js` | 前端逻辑（依赖 5、6、7）|
| 9 | `.github/workflows/daily_oracle.yml` | CI/CD（最后完成）|

---

## 验证方案

1. **后端功能验证**：本地设置环境变量后运行 `python backend/hexafin_engine.py`，检查 `public/daily_result.json` 是否正确生成且符合 schema
2. **确定性验证**：相同输入数据多次运行应产生完全相同的卦象结果（种子固定）
3. **前端验证**：浏览器打开 `public/index.html`，确认：
   - 免责弹窗正常弹出且可关闭
   - 三栏布局渲染正确
   - 推演动画播放约 5 秒
   - 卦象和 AI 解读正确显示
4. **JSON 格式验证**：输出完全符合 spec 中定义的 JSON 契约
5. **Actions 验证**：通过 `workflow_dispatch` 手动触发验证流水线可用
