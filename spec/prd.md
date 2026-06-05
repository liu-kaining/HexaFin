# 📜 Project HexaFin : 核心 PRD 与技术设计白皮书

## 一、 产品需求文档 (PRD)

### 1. 产品定位

**HexaFin** 是一个高度自动化的“赛博玄学”金融预测实验项目。它剥离了传统金融分析的枯燥，将华尔街真实的量化数据作为“随机种子”，利用古老的《周易》大衍筮法推演股票走势，最后通过大语言模型（LLM）将“卦辞”与“盘面”融合，输出极具东方赛博朋克风格的操作建议。

### 2. 核心功能模块

* **神谕引擎 (The Oracle Engine)：** 每天收盘后定时抓取指定美股标的（如 TSLA, QQQ, NVDA）的 FMP 核心交易数据。
* **炼丹炉算法 (Hash-Seed Divination)：** 强行将不可预测的市场数据（收盘价、成交量等）哈希化，生成不可篡改的唯一随机种子。
* **十有八变全景日志 (18-Step Divination Log)：** 摒弃黑盒，将大衍筮法的 18 次“分而为二、挂一、揲四、归奇”过程在前端以 Terminal 绿字滚动的方式全量展示，自证清白。
* **硅基解卦 (AI Interpretation)：** LLM 根据卦象（本卦、变爻、之卦）结合 FMP 提供的基础技术指标（MACD, RSI 等），输出结构化的预测报告与操作建议。
* **免责结界 (The Shield)：** 极具黑色幽默的赛博风免责声明，用户需点击确认才能查看预测。

### 3. 前端 UI/UX 设计规范

* **整体风格：** 极简、暗黑模式 (Dark Mode)、终端命令行风格 (Terminal/Console) 结合东方赛博朋克。
* **配色方案：** 纯黑背景 (`#000000`)，终端荧光绿 (`#00FF00`)，预警/动爻红色 (`#FF0000`)，以及少量暗金色点缀（用于八卦图）。
* **核心布局：**
* **左侧区块：** 当日金融标的数据面板（Ticker, 收盘价，成交量，K线简图）。
* **中间区块（灵魂）：** 终端代码框，展示 18 变推演过程的日志流。
* **右侧区块：** 最终生成的六爻卦象（使用 ASCII 字符，如 `██████` 和 `██  ██`），以及 AI 生成的玄学金融报告。



---

## 二、 技术设计白皮书 (Technical Architecture)

### 1. 系统架构选型

* **数据源：** FMP (Financial Modeling Prep) Pro API
* **核心脚本语言：** Python 3.10+
* **AI 大模型接口：** OpenAI API / Claude API (或任意兼容的大模型 API)
* **自动化流水线：** GitHub Actions (Cron Job 定时触发)
* **前端渲染与托管：** Python 脚本直接生成静态 HTML/JSON 文件 -> Push 至 GitHub -> 自动部署至 Cloudflare Pages。
* **域名绑定：** 自定义域名绑定至 Cloudflare Pages。

### 2. 数据处理与“起卦”流 (Data to Hexagram Pipeline)

这是给写代码 AI 的核心逻辑，必须严格遵循：

#### 步骤 2.1: 获取 FMP 数据

调用 FMP API 获取目标股票（例：TSLA）T 日的数据：`Date`, `Close`, `Volume`, `RSI`, `MACD`。

#### 步骤 2.2: Hash 炼化种子 (Seed Generation)

将客观数据拼接成明文 String：
`Raw_String = "{Ticker}-{YYYYMMDD}-{Close_Price}-{Volume}"`
使用 SHA-256 对 `Raw_String` 进行加密，提取加密结果中的纯数字部分，转为整数 `Int_Seed`。
将 `Int_Seed` 传入 Python 的 `random.seed(Int_Seed)`。

#### 步骤 2.3: 重写大衍筮法算法 (The 49-Yarrow Algorithm)

完全自定义 Python 函数，不再依赖第三方库，模拟物理的“五十去一，四十九用”。

* **初始状态：** `total_stalks = 49`
* **推演逻辑：** 循环 6 次（得出 6 个爻），每次包含 3 变（共 18 变）。
* **一变：** 随机将 49 根分为左右两撮（模拟 `random.randint` 分割，受前面 Seed 控制）。
* **挂一、揲四、归奇：** 左手拿掉一根；左右两撮分别对 4 取余；计算拿掉的总数。
* **二变/三变：** 用剩余的蓍草重复上述动作。


* **记录状态：** 必须在代码中创建一个 `Log_Array`，将这 18 次的中间变量（左手几根、右手几根、余数几根）全部存入 JSON，供前端展示。
* **输出：** 根据最终剩余蓍草的数量（36, 32, 28, 24）除以 4，得出单爻结果（9老阳, 8少阴, 7少阳, 6老阴），最终组合成本卦和之卦。

### 3. AI 神棍解卦链路 (Prompt Engineering)

在 Python 脚本中组装以下系统提示词（System Prompt），调用 LLM API 获取解读：

> **[System Prompt]**
> 你是 HexaFin 系统的核心 AI，一位精通中国《周易》大衍筮法与华尔街量化交易的玄学金融大宗师。
> **[Input Data]**
> * 标的：{Ticker}
> * T日数据：收盘价 {Close}，成交量 {Volume}，RSI {RSI}，MACD状态 {MACD}
> * 算卦结果：本卦【{Original_Hexagram}】，动爻在【{Moving_Lines}】，之卦【{Changed_Hexagram}】
> 
> 
> **[Output Structure] (必须返回严格的 JSON 或 Markdown 格式)**
> 1. **象辞破译 (The Oracle's Decryption):** 用赛博武侠风格的大白话解释此卦象与动爻的含义（限 100 字）。
> 2. **盘面映射 (Market Mapping):** 将卦象的吉凶硬核映射到当下的 RSI、MACD 和成交量上，逻辑要看似严密，实则玄学（限 150 字）。
> 3. **操作神谕 (Actionable Oracle):** 给出一个明确的评级 (Strong Buy / Buy / Hold / Sell / Strong Sell)，以及明日的支撑/阻力位预测。
> 
> 

### 4. 自动化构建部署流 (GitHub Actions)

配置 `.github/workflows/daily_oracle.yml`：

* **Cron Job:** 设定为美东时间交易日 17:00 (即收盘后 1 小时) 运行。
* **Environment Variables:** 配置 `FMP_API_KEY` 和 `LLM_API_KEY` 在 GitHub Secrets 中。
* **执行步骤:**
1. Check out repository.
2. Setup Python environment.
3. Run `hexafin_engine.py` (生成包含数据的 `public/data.json` 或直接生成 `public/index.html`)。
4. Commit and push 变更。


* **Cloudflare:** 检测到 GitHub 仓库更新，自动拉取 `public` 文件夹进行边缘节点部署。

---

## 三、 免责声明文本示例 (Copywriting)

必须在首页居中、用红色字体展示：

> **[⚠️ HexaFin 赛博神谕免责结界]**
> 本系统（HexaFin）所输出之任何买卖建议、点位预测及吉凶断言，皆由客观金融数据触发哈希算法，辅以传统《周易》大衍筮法，并交由硅基大语言模型生成。
> 本项目为纯粹的“东方神秘学 x 量化代码”之行为艺术与技术实验。
> **THIS IS NOT FINANCIAL ADVICE.**
> 信卦者，盈亏自负；逆势者，造化弄人。若您依据本站神谕进行真实交易并导致爆仓，切勿顺着网线寻仇。

