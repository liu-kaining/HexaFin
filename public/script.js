/**
 * HexaFin 前端交互逻辑
 * - 免责弹窗
 * - 数据加载与 Ticker 切换
 * - 推演日志打字机动画
 * - 卦象揭晓与 AI 神谕渲染
 */

(function () {
  'use strict';

  // ============ 全局状态 ============
  let allData = [];
  let currentIndex = 0;
  let animationTimer = null;

  // ============ DOM 缓存 ============
  const $ = (id) => document.getElementById(id);

  // ============ 初始化 ============
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupDisclaimer();
    loadData();
  }

  // ============ 免责声明弹窗 ============
  function setupDisclaimer() {
    const overlay = $('disclaimer');
    const btn = $('disclaimer-btn');

    if (localStorage.getItem('hexafin_disclaimer_accepted')) {
      overlay.classList.add('hidden');
      return;
    }

    btn.addEventListener('click', () => {
      localStorage.setItem('hexafin_disclaimer_accepted', '1');
      overlay.classList.add('hidden');
    });
  }

  // ============ 数据加载 ============
  async function loadData() {
    try {
      const resp = await fetch('daily_result.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      allData = await resp.json();

      if (allData.length === 0) {
        showError('No data available');
        return;
      }

      renderTickerSelector();
      switchTicker(0);
    } catch (err) {
      showError(`Failed to load data: ${err.message}`);
    }
  }

  function showError(msg) {
    $('terminal-output').innerHTML =
      `<div class="terminal-line visible" style="color:var(--text-red);">[ERROR] ${msg}</div>`;
  }

  // ============ Ticker 选择器 ============
  function renderTickerSelector() {
    const container = $('ticker-selector');
    container.innerHTML = '';

    allData.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.className = 'ticker-btn' + (idx === 0 ? ' active' : '');
      btn.textContent = item.ticker;
      btn.addEventListener('click', () => switchTicker(idx));
      container.appendChild(btn);
    });
  }

  function switchTicker(idx) {
    if (idx === currentIndex && animationTimer) return;

    currentIndex = idx;

    // 更新按钮状态
    document.querySelectorAll('.ticker-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === idx);
    });

    // 清除动画定时器
    if (animationTimer) {
      clearInterval(animationTimer);
      animationTimer = null;
    }

    const data = allData[idx];

    // 填充左栏
    renderFinancialData(data);

    // 重置中栏和右栏
    $('terminal-output').innerHTML = '';
    $('hexagram-display').style.display = 'none';
    $('oracle-section').style.display = 'none';

    // 启动推演动画
    startDivinationAnimation(data);
  }

  // ============ 左栏：金融数据填充 ============
  function renderFinancialData(data) {
    $('val-ticker').textContent = data.ticker;
    $('val-date').textContent = data.date;
    $('val-close').textContent = `$${data.fmp_data.close.toLocaleString()}`;
    $('val-volume').textContent = formatVolume(data.fmp_data.volume);
    $('val-rsi').textContent = data.fmp_data.rsi.toFixed(2);
    $('val-macd').textContent = data.fmp_data.macd;
    $('val-seed').textContent = `0x${data.seed_hex}...`;
  }

  function formatVolume(vol) {
    if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
    if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K';
    return vol.toString();
  }

  // ============ 中栏：推演日志打字机动画 ============
  function startDivinationAnimation(data) {
    const logs = data.divination.logs;
    const output = $('terminal-output');
    const cursor = $('cursor');
    let lineIdx = 0;

    // 初始提示
    const initLine = document.createElement('div');
    initLine.className = 'terminal-line visible';
    initLine.innerHTML = `<span style="color:var(--text-gold);">[INIT]</span> 大衍之数五十，其用四十有九...`;
    output.appendChild(initLine);

    animationTimer = setInterval(() => {
      if (lineIdx >= logs.length) {
        clearInterval(animationTimer);
        animationTimer = null;

        // 动画完成，闪烁后揭晓卦象
        cursor.style.display = 'none';
        setTimeout(() => revealHexagram(data), 600);
        return;
      }

      const log = logs[lineIdx];
      const line = document.createElement('div');
      line.className = 'terminal-line visible';
      line.innerHTML = formatLogLine(log);
      output.appendChild(line);

      // 自动滚动
      output.scrollTop = output.scrollHeight;
      lineIdx++;
    }, 280);
  }

  function formatLogLine(log) {
    return (
      `<span class="yao-label">[爻${log.yao}</span>` +
      `<span class="change-label">|变${log.change}]</span> ` +
      `<span class="value">左:${pad(log.left)} | 右:${pad(log.right)} | ` +
      `余左:${log.left_rem} | 余右:${log.right_rem} | ` +
      `移除:${pad(log.removed)} | 剩余:${pad(log.remaining)}</span>`
    );
  }

  function pad(n) {
    return String(n).padStart(2, ' ');
  }

  // ============ 右栏：卦象揭晓 ============
  function revealHexagram(data) {
    const display = $('hexagram-display');
    const hexData = data.hexagram;

    // 闪烁效果
    display.style.display = 'block';
    display.classList.add('flash');
    setTimeout(() => display.classList.remove('flash'), 600);

    // 填充卦象信息
    $('hex-symbol').textContent = hexData.original.symbol;
    $('hex-name').textContent = hexData.original.name;
    $('hex-meaning').textContent = hexData.original.meaning;

    // 绘制六爻 ASCII
    renderYaoLines(data.divination.lines, hexData.moving_lines);

    // 变卦
    if (hexData.changed) {
      const changedEl = $('changed-hex');
      changedEl.style.display = 'block';
      $('changed-name').textContent =
        `${hexData.changed.name} ${hexData.changed.symbol}`;
    } else {
      $('changed-hex').style.display = 'none';
    }

    // 延迟显示 AI 神谕
    setTimeout(() => revealOracle(data.oracle), 800);
  }

  function renderYaoLines(lines, movingLines) {
    const container = $('yao-lines');
    container.innerHTML = '';

    // lines[0] 是初爻（底部），需要从下往上渲染
    // flex-direction: column-reverse 已处理翻转
    lines.forEach((val, idx) => {
      const yaoEl = document.createElement('div');
      const isYang = val === 7 || val === 9;
      const isMoving = movingLines.includes(idx + 1);

      yaoEl.className = 'yao-line ' + (isYang ? 'yang' : 'yin') + (isMoving ? ' moving' : '');

      if (isYang) {
        yaoEl.textContent = '██████████';  // 阳爻：一条实线
      } else {
        yaoEl.textContent = '████  ████';  // 阴爻：中间断开
      }

      // 动爻标注
      if (isMoving) {
        yaoEl.title = `第${idx + 1}爻 [动] 值=${val}`;
      } else {
        yaoEl.title = `第${idx + 1}爻 值=${val}`;
      }

      container.appendChild(yaoEl);
    });
  }

  // ============ AI 神谕渲染 ============
  function revealOracle(oracle) {
    const section = $('oracle-section');
    section.style.display = 'block';
    section.classList.add('fade-in');

    $('oracle-decryption').textContent = oracle.decryption;
    $('oracle-mapping').textContent = oracle.market_mapping;

    // 操作评级
    const actionWrap = $('oracle-action-wrap');
    const action = oracle.action;
    const actionClass = action.toLowerCase().replace(' ', '-');
    actionWrap.innerHTML = `<span class="oracle-action ${actionClass}">${action}</span>`;

    // 支撑/阻力
    $('oracle-support').textContent = oracle.support_level;
    $('oracle-resistance').textContent = oracle.resistance_level;
  }
})();
