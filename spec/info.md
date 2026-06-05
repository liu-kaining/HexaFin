### 📂 一、 项目文件结构 (Project Structure)

请 AI 按照以下结构生成或组织代码：

```text
HexaFin/
├── .github/
│   └── workflows/
│       └── daily_oracle.yml   # 自动化定时任务，每天执行一次 Python 脚本
├── backend/
│   ├── hexafin_engine.py      # 核心逻辑：获取数据 -> Hash炼化 -> 起卦 -> AI解读
│   ├── i_ching_data.json      # 静态字典：64卦的二进制映射表及卦辞
│   └── requirements.txt       # Python 依赖 (requests, openai, etc.)
└── public/
    ├── index.html             # 极简/终端风格前端入口
    ├── style.css              # 纯黑绿字 Terminal 风格 CSS
    ├── script.js              # 读取 daily_result.json 并渲染滚动特效
    └── daily_result.json      # 由 hexafin_engine.py 每天自动生成的最终结果数据

```

---

### 🧠 二、 核心算法细化：赛博大衍筮法 (The Yarrow Stalk Algorithm in Python)

**【指令给 AI】：** 在 `hexafin_engine.py` 中，请严格按照以下数学逻辑实现起卦算法，不要用任何第三方周易库。

#### 1. Hash Seed 逻辑

* **输入：** `ticker` (如 "TSLA"), `date` (如 "2026-06-05"), `close` (如 175.34), `volume` (如 85432100)。
* **拼接：** `raw_str = f"{ticker}-{date}-{close}-{volume}"`
* **转换：** ```python
import hashlib
import random
hex_hash = hashlib.sha256(raw_str.encode('utf-8')).hexdigest()
seed_int = int(hex_hash, 16)
random.seed(seed_int) # 注入天机
```


```



#### 2. 十有八变推演逻辑 (严格遵循《系辞》)

* **卦的组成：** 一卦有 6 爻（Lines），从下往上（初爻到上爻）生成。每次生成一爻需要“三变”。
* **算法伪代码（请AI照此实现）：**
* 外层循环 6 次（生成 6 个爻）：
* `stalks = 49` (大衍之数五十，其用四十有九)
* 内层循环 3 次（完成三变）：
1. **分而为二：** `left = random.randint(1, stalks - 1)`，`right = stalks - left`
2. **挂一：** `right -= 1` (从右手拿掉一根，挂于小指)
3. **揲之以四，归奇：**
* `left_rem = left % 4` (如果为 0，则当作 4)
* `right_rem = right % 4` (如果为 0，则当作 4)


4. **计算减去的蓍草：** `removed = left_rem + right_rem + 1` (左右余数加上挂一的那根)
5. **更新当前蓍草：** `stalks -= removed`
6. **【关键点】：** 每次（共18次）都要将 `[left, right, left_rem, right_rem, removed]` 存入一个 `log_array` 用于前端展示。


* 三变结束后，计算此爻数值：`line_value = stalks / 4`。
* 结果必定是 `6, 7, 8, 9` 中的一个。存入 `lines_array`。





#### 3. 数值与阴阳动静的映射 (Yin-Yang Mapping)

* `6` -> 老阴 (动爻，变阳) `[⚋x]` -> 二进制位 `0`
* `7` -> 少阳 (静爻) `[⚍]` -> 二进制位 `1`
* `8` -> 少阴 (静爻) `[⚋]` -> 二进制位 `0`
* `9` -> 老阳 (动爻，变阴) `[⚍x]` -> 二进制位 `1`
* **生成卦象：** 通过 6 个二进制位组合（底爻在最右或最左，需统一标准），去 `i_ching_data.json` 查出**本卦**。根据老阴老阳翻转二进制位，查出**之卦**（变卦）。

---

### 📡 三、 最终输出 JSON 格式契约 (`daily_result.json`)

**【指令给 AI】：** 你的 Python 脚本跑完 FMP 数据获取、大衍筮法推演、LLM 接口调用后，必须在 `public` 目录下生成结构完全如下的 `daily_result.json`，供前端消费。

```json
{
  "meta": {
    "date": "2026-06-05",
    "ticker": "TSLA",
    "fmp_data": {
      "close": 175.34,
      "volume": 85432100,
      "rsi": 45.2,
      "macd": "Death Cross"
    },
    "hash_seed": "948573920193..."
  },
  "divination_logs": [
    {
      "line": 1,
      "changes": [
        {"change": 1, "left": 24, "right": 24, "removed": 9, "remaining": 40},
        {"change": 2, "left": 18, "right": 21, "removed": 8, "remaining": 32},
        {"change": 3, "left": 15, "right": 16, "removed": 4, "remaining": 28}
      ],
      "result": 7,
      "nature": "少阳"
    }
    // ... 包含 6 个爻的数据
  ],
  "hexagram": {
    "original": {"name": "雷火丰", "binary": "010100", "meaning": "日中则昃，月盈则食"},
    "moving_lines": [2], 
    "changed": {"name": "雷天大壮", "binary": "011100", "meaning": "利贞"}
  },
  "ai_oracle": {
    "decryption": "丰卦九二，日中见斗...",
    "market_mapping": "对应 TSLA 今日缩量下跌...",
    "action": "Hold",
    "support_level": 168.5,
    "resistance_level": 182.0
  }
}

```

---

### 🖥️ 四、 前端交互逻辑要求 (Frontend Specs)

**【指令给 AI】：** 前端不需要复杂的框架，直接使用 HTML + 原生 JS + CSS。

1. **加载动画：** 页面打开时，读取 `daily_result.json`。
2. **Terminal 打印特效：** 利用 `setInterval` 或 `setTimeout`，将 `divination_logs` 里的 18 变数据，以绿字黑底的形式，**一行一行地**打在屏幕上（模拟推演过程，耗时大约 5 秒）。
3. **结果揭晓：** 日志打完后，闪烁两次，展示最终的卦象符号，并平滑浮现 `ai_oracle` 里的解读文本和买卖建议评级。
