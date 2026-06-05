#!/usr/bin/env python3
"""
HexaFin Engine - 赛博玄学金融预测系统核心引擎
数据获取 → 哈希炼化 → 大衍筮法起卦 → AI解读
"""

import hashlib
import json
import os
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

# ============================================================
# 4.1 FMP 数据获取模块
# ============================================================

def fetch_fmp_data(ticker: str, api_key: str) -> dict:
    """
    调用 FMP API 获取收盘价、成交量、RSI、MACD
    返回: {"close": float, "volume": int, "rsi": float, "macd": str}
    """
    base_url = "https://financialmodelingprep.com/api/v3"

    # 获取最近一天的收盘价和成交量
    quote_url = f"{base_url}/quote/{ticker}?apikey={api_key}"
    quote_resp = requests.get(quote_url, timeout=15)
    quote_resp.raise_for_status()
    quote_data = quote_resp.json()

    if not quote_data:
        raise ValueError(f"No quote data returned for {ticker}")

    close_price = quote_data[0].get("price", 0.0) or 0.0
    volume = int(quote_data[0].get("volume") or 0)

    # 获取 RSI (14 日)
    rsi_url = f"{base_url}/technical_indicator/daily/{ticker}?period=14&type=rsi&apikey={api_key}"
    rsi_resp = requests.get(rsi_url, timeout=15)
    rsi_resp.raise_for_status()
    rsi_data = rsi_resp.json()
    rsi_value = rsi_data[0].get("rsi", 50.0) if rsi_data else 50.0

    # 获取 MACD
    macd_url = f"{base_url}/technical_indicator/daily/{ticker}?period=12&type=macd&apikey={api_key}"
    macd_resp = requests.get(macd_url, timeout=15)
    macd_resp.raise_for_status()
    macd_data = macd_resp.json()

    if macd_data:
        macd_val = macd_data[0].get("macd", 0.0)
        signal_val = macd_data[0].get("macd_signal", 0.0)
        macd_str = f"MACD={macd_val:.4f}, Signal={signal_val:.4f}"
    else:
        macd_str = "MACD=N/A"

    return {
        "close": round(close_price, 2),
        "volume": int(volume),
        "rsi": round(rsi_value, 2),
        "macd": macd_str,
    }


# ============================================================
# 4.2 哈希种子生成模块
# ============================================================

def generate_seed(ticker: str, date: str, close: float, volume: int) -> int:
    """
    拼接字符串 → SHA-256 哈希 → 转整数 → 注入 random.seed()
    返回种子值供 JSON 记录
    """
    seed_string = f"{ticker}-{date}-{close}-{volume}"
    hash_hex = hashlib.sha256(seed_string.encode("utf-8")).hexdigest()
    seed_int = int(hash_hex, 16)
    random.seed(seed_int)
    return seed_int


# ============================================================
# 4.3 大衍筮法推演模块
# ============================================================

def perform_divination() -> tuple:
    """
    执行大衍筮法，生成 6 爻。
    返回: (lines_array, divination_logs)
      - lines_array: [6, 7, 8, 9, ...] 共 6 个爻值
      - divination_logs: 详细推演日志（18 条记录）
    """
    lines = []
    logs = []

    for yao_idx in range(6):  # 6 爻，从初爻到上爻
        stalks = 49  # 大衍之数五十，其用四十有九

        for change_idx in range(3):  # 每爻三变
            # 分而为二（象两）
            left = random.randint(1, stalks - 1)
            right = stalks - left

            # 挂一（象三）
            right -= 1

            # 揲四归奇（象四）
            left_rem = left % 4 if left % 4 != 0 else 4
            right_rem = right % 4 if right % 4 != 0 else 4

            # 计算移除数
            removed = left_rem + right_rem + 1

            # 更新剩余策数
            stalks -= removed

            # 记录日志
            logs.append({
                "yao": yao_idx + 1,
                "change": change_idx + 1,
                "left": left,
                "right": right,  # 挂一后的右堆
                "left_rem": left_rem,
                "right_rem": right_rem,
                "removed": removed,
                "remaining": stalks,
            })

        # 三变结束，计算爻值
        line_value = stalks // 4  # 结果为 6/7/8/9
        lines.append(line_value)

    return lines, logs


# ============================================================
# 4.4 卦象查询模块
# ============================================================

def lookup_hexagram(lines: list) -> dict:
    """
    根据 6 爻值查询卦象。
    爻值映射: 6→0(老阴), 7→1(少阳), 8→0(少阴), 9→1(老阳)
    返回: {original, moving_lines, changed}
    """
    # 加载 64 卦数据
    data_path = Path(__file__).parent / "i_ching_data.json"
    with open(data_path, "r", encoding="utf-8") as f:
        hexagram_data = json.load(f)

    # 爻值映射二进制（本卦）
    value_to_binary = {6: "0", 7: "1", 8: "0", 9: "1"}
    binary_str = "".join(value_to_binary[line] for line in lines)

    # 查本卦
    original = hexagram_data.get(binary_str, {
        "name": "未知卦",
        "symbol": "?",
        "meaning": "数据缺失",
    })

    # 找出动爻（值为 6 或 9）
    moving_lines = [i + 1 for i, v in enumerate(lines) if v in (6, 9)]

    # 计算之卦（翻转动爻）
    changed = None
    if moving_lines:
        flip = {"0": "1", "1": "0"}
        changed_bits = list(binary_str)
        for i, v in enumerate(lines):
            if v in (6, 9):
                changed_bits[i] = flip[changed_bits[i]]
        changed_binary = "".join(changed_bits)
        changed = hexagram_data.get(changed_binary, {
            "name": "未知卦",
            "symbol": "?",
            "meaning": "数据缺失",
        })

    return {
        "lines": lines,
        "binary": binary_str,
        "original": original,
        "moving_lines": moving_lines,
        "changed": changed,
    }


# ============================================================
# 4.5 AI 解卦模块（支持 OpenAI / Anthropic 双引擎）
# ============================================================

SYSTEM_PROMPT = """你是「赛博玄学金融大宗师」，精通周易六十四卦与现代量化金融。
你的风格融合古典易学智慧与赛博朋克美学，使用武侠/玄幻风格的语言解读卦象，
同时结合真实的技术指标数据给出金融市场分析。

请严格按照以下 JSON 格式返回解读结果，不要添加任何其他文字：
{
  "decryption": "象辞破译（赛博武侠风，100字内）",
  "market_mapping": "盘面映射（结合 RSI/MACD 技术指标分析，150字内）",
  "action": "操作评级（仅限: Strong Buy / Buy / Hold / Sell / Strong Sell）",
  "support_level": "支撑位（数字）",
  "resistance_level": "阻力位（数字）"
}"""


def get_ai_oracle(hexagram_data: dict, fmp_data: dict, ticker: str) -> dict:
    """
    调用 LLM 解读卦象，支持 OpenAI 和 Anthropic 双引擎。
    """
    provider = os.environ.get("LLM_PROVIDER", "openai").lower()
    api_key = os.environ.get("LLM_API_KEY", "")

    if not api_key:
        return _fallback_oracle(hexagram_data, ticker)

    # 构建用户消息
    user_message = f"""请解读以下卦象与金融数据的对应关系：

标的: {ticker}
收盘价: {fmp_data['close']}
成交量: {fmp_data['volume']}
RSI(14): {fmp_data['rsi']}
MACD: {fmp_data['macd']}

本卦: {hexagram_data['original']['name']} {hexagram_data['original']['symbol']}
卦辞: {hexagram_data['original']['meaning']}
动爻: {hexagram_data['moving_lines'] if hexagram_data['moving_lines'] else '无动爻'}
之卦: {hexagram_data['changed']['name'] if hexagram_data['changed'] else '无变卦'}

请给出赛博玄学解读。"""

    try:
        if provider == "anthropic":
            return _call_anthropic(api_key, user_message)
        else:
            return _call_openai(api_key, user_message)
    except Exception as e:
        print(f"[WARNING] AI oracle failed for {ticker}: {e}", file=sys.stderr)
        return _fallback_oracle(hexagram_data, ticker)


def _call_openai(api_key: str, user_message: str) -> dict:
    """调用 OpenAI API"""
    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.7,
        max_tokens=500,
    )
    content = response.choices[0].message.content.strip()
    # 尝试提取 JSON
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    return json.loads(content)


def _call_anthropic(api_key: str, user_message: str) -> dict:
    """调用 Anthropic API"""
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": user_message},
        ],
    )
    content = response.content[0].text.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    return json.loads(content)


def _fallback_oracle(hexagram_data: dict, ticker: str) -> dict:
    """AI 不可用时的本地兜底解读"""
    name = hexagram_data["original"]["name"]
    meaning = hexagram_data["original"]["meaning"]

    # 基于卦象的简单规则引擎
    positive_keywords = ["亨", "吉", "利"]
    negative_keywords = ["凶", "咎", "厉", "悔"]

    positive_score = sum(1 for kw in positive_keywords if kw in meaning)
    negative_score = sum(1 for kw in negative_keywords if kw in meaning)

    if positive_score > negative_score + 1:
        action = "Buy"
    elif positive_score > negative_score:
        action = "Hold"
    elif negative_score > positive_score + 1:
        action = "Sell"
    elif negative_score > positive_score:
        action = "Hold"
    else:
        action = "Hold"

    return {
        "decryption": f"天机显示「{name}」之象，{meaning[:30]}……卦气流转，数据共振于链上。",
        "market_mapping": f"{ticker} 当前卦象映射盘面，阴阳交替间暗藏玄机。技术面需结合量能验证趋势方向。",
        "action": action,
        "support_level": "N/A",
        "resistance_level": "N/A",
    }


# ============================================================
# 4.6 主执行流程
# ============================================================

def main():
    """主流程：读取标的 → 遍历执行 → 输出 JSON"""
    # 环境变量
    fmp_api_key = os.environ.get("FMP_API_KEY", "")
    today = os.environ.get("ORACLE_DATE") or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 读取标的列表
    tickers_path = Path(os.environ.get("TICKERS_FILE", "")) if os.environ.get("TICKERS_FILE") else Path(__file__).parent / "tickers.txt"
    with open(tickers_path, "r", encoding="utf-8") as f:
        tickers = [line.strip() for line in f if line.strip()]

    if not tickers:
        print("[ERROR] No tickers found in tickers.txt", file=sys.stderr)
        sys.exit(1)

    results = []

    for ticker in tickers:
        print(f"[INFO] Processing {ticker}...")

        # Step 1: 获取 FMP 数据
        if fmp_api_key:
            try:
                fmp_data = fetch_fmp_data(ticker, fmp_api_key)
            except Exception as e:
                print(f"[WARNING] FMP fetch failed for {ticker}: {e}", file=sys.stderr)
                fmp_data = {"close": 0.0, "volume": 0, "rsi": 50.0, "macd": "N/A"}
        else:
            print(f"[WARNING] No FMP_API_KEY, using placeholder data for {ticker}")
            fmp_data = {"close": 0.0, "volume": 0, "rsi": 50.0, "macd": "N/A"}

        # Step 2: 生成哈希种子
        seed = generate_seed(ticker, today, fmp_data["close"], fmp_data["volume"])

        # Step 3: 大衍筮法推演
        lines, div_logs = perform_divination()

        # Step 4: 查询卦象
        hexagram = lookup_hexagram(lines)

        # Step 5: AI 解卦
        oracle = get_ai_oracle(hexagram, fmp_data, ticker)

        # 组装结果
        result = {
            "ticker": ticker,
            "date": today,
            "seed_hex": hashlib.sha256(
                f"{ticker}-{today}-{fmp_data['close']}-{fmp_data['volume']}".encode()
            ).hexdigest()[:16],
            "fmp_data": fmp_data,
            "divination": {
                "lines": hexagram["lines"],
                "binary": hexagram["binary"],
                "logs": div_logs,
            },
            "hexagram": {
                "original": hexagram["original"],
                "moving_lines": hexagram["moving_lines"],
                "changed": hexagram["changed"],
            },
            "oracle": oracle,
        }
        results.append(result)
        print(f"[INFO] {ticker} -> {hexagram['original']['name']}")

    # 输出 JSON（可通过 OUTPUT_PATH 覆盖）
    output_path = Path(os.environ.get("OUTPUT_PATH", "")) if os.environ.get("OUTPUT_PATH") else Path(__file__).parent.parent / "public" / "daily_result.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"[DONE] Results written to {output_path}")


if __name__ == "__main__":
    main()
