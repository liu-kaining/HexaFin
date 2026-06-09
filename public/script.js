/**
 * HexaFin 前端交互
 */
(function () {
  'use strict';

  const VALID_ACTIONS = new Set(['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell']);
  const YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

  let allData = [];
  let currentIndex = -1;
  let animationTimer = null;

  const $ = (id) => document.getElementById(id);

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupDisclaimer();
    loadData();
  }

  /* ---- 免责 ---- */
  function setupDisclaimer() {
    const overlay = $('disclaimer');
    if (localStorage.getItem('hexafin_disclaimer_accepted')) {
      overlay.classList.add('hidden');
      return;
    }
    $('disclaimer-btn').addEventListener('click', () => {
      localStorage.setItem('hexafin_disclaimer_accepted', '1');
      overlay.classList.add('hidden');
    });
  }

  /* ---- 数据加载 ---- */
  async function loadData() {
    try {
      const resp = await fetch('daily_result.json?_=' + Date.now());
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      if (!Array.isArray(data) || data.length === 0) {
        showError('暂无卦象数据');
        return;
      }
      allData = data;
      renderTickerSelector();
      switchTicker(0);
    } catch (err) {
      showError('数据加载失败: ' + err.message);
    }
  }

  function showError(msg) {
    const ph = $('terminal-placeholder');
    if (ph) ph.remove();
    $('terminal-output').innerHTML =
      '<div class="terminal-line visible" style="color:var(--text-red);">[ERROR] ' + esc(msg) + '</div>';
    $('cursor').classList.add('hidden');
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /* ---- Ticker 切换 ---- */
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
    if (idx < 0 || idx >= allData.length) return;
    if (idx === currentIndex && animationTimer) return;

    currentIndex = idx;
    stopAnimation();

    document.querySelectorAll('.ticker-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === idx);
    });

    const data = allData[idx];
    if (!validateData(data)) {
      showError('数据结构异常: ' + data.ticker);
      return;
    }

    renderFinancialData(data);
    resetPanels();
    startDivinationAnimation(data);
  }

  function stopAnimation() {
    if (animationTimer) {
      clearInterval(animationTimer);
      animationTimer = null;
    }
  }

  function resetPanels() {
    const output = $('terminal-output');
    output.innerHTML = '';
    $('cursor').classList.remove('hidden');

    $('oracle-placeholder').hidden = false;
    $('hexagram-display').hidden = true;
    $('oracle-section').hidden = true;
    $('oracle-section').classList.remove('fade-in');
  }

  function validateData(data) {
    return data
      && data.ticker
      && data.fmp_data
      && data.divination
      && Array.isArray(data.divination.lines)
      && Array.isArray(data.divination.logs)
      && data.hexagram
      && data.hexagram.original
      && data.oracle;
  }

  /* ---- 左栏 ---- */
  function renderFinancialData(data) {
    const fmp = data.fmp_data;
    const isPlaceholder = fmp.close === 0 && fmp.volume === 0;

    $('val-ticker').textContent = data.ticker;
    $('val-date').textContent = data.date || '—';

    const closeEl = $('val-close');
    if (isPlaceholder) {
      closeEl.textContent = '— (无行情)';
      closeEl.classList.add('placeholder-hint');
    } else {
      closeEl.textContent = '$' + formatPrice(fmp.close);
      closeEl.classList.remove('placeholder-hint');
    }

    $('val-volume').textContent = isPlaceholder ? '—' : formatVolume(fmp.volume);

    const rsiEl = $('val-rsi');
    const rsi = Number(fmp.rsi);
    rsiEl.textContent = isNaN(rsi) ? '—' : rsi.toFixed(2);
    rsiEl.classList.remove('rsi-overbought', 'rsi-oversold');
    if (!isNaN(rsi)) {
      if (rsi >= 70) rsiEl.classList.add('rsi-overbought');
      else if (rsi <= 30) rsiEl.classList.add('rsi-oversold');
    }

    $('val-macd').textContent = fmp.macd || '—';
    $('val-seed').textContent = data.seed_hex ? '0x' + data.seed_hex : '—';
  }

  function formatPrice(n) {
    return Number(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatVolume(vol) {
    if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
    if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K';
    return String(vol);
  }

  function formatLevel(val) {
    if (val === null || val === undefined || val === 'N/A') return '—';
    const n = Number(val);
    return isNaN(n) ? String(val) : '$' + formatPrice(n);
  }

  /* ---- 推演动画 ---- */
  function startDivinationAnimation(data) {
    const logs = data.divination.logs;
    const output = $('terminal-output');
    const scrollEl = $('panel-terminal').querySelector('.terminal-body');
    let lineIdx = 0;
    let lastYao = 0;

    $('oracle-placeholder').hidden = true;

    appendLine(output, '<span style="color:var(--text-gold);">[INIT]</span> 大衍之数五十，其用四十有九……', true);

    animationTimer = setInterval(() => {
      if (lineIdx >= logs.length) {
        stopAnimation();
        $('cursor').classList.add('hidden');
        setTimeout(() => revealHexagram(data), 500);
        return;
      }

      const log = logs[lineIdx];

      if (log.yao !== lastYao) {
        if (lastYao > 0) {
          const sep = document.createElement('div');
          sep.className = 'terminal-line visible yao-separator';
          sep.textContent = '— ' + YAO_NAMES[log.yao - 1] + ' —';
          output.appendChild(sep);
        }
        lastYao = log.yao;
      }

      appendLine(output, formatLogLine(log), true);
      scrollEl.scrollTop = scrollEl.scrollHeight;
      lineIdx++;
    }, 260);
  }

  function appendLine(container, html, visible) {
    const line = document.createElement('div');
    line.className = 'terminal-line' + (visible ? ' visible' : '');
    line.innerHTML = html;
    container.appendChild(line);
    return line;
  }

  function formatLogLine(log) {
    return (
      '<span class="yao-label">[' + YAO_NAMES[(log.yao || 1) - 1] + '</span>' +
      '<span class="change-label"> · 变' + log.change + ']</span> ' +
      '<span class="value">左' + pad(log.left) + ' 右' + pad(log.right) + ' · ' +
      '余' + log.left_rem + '/' + log.right_rem + ' · ' +
      '移' + pad(log.removed) + ' · 剩' + pad(log.remaining) + '</span>'
    );
  }

  function pad(n) {
    return String(n).padStart(2, '\u00a0');
  }

  /* ---- 卦象揭晓 ---- */
  function revealHexagram(data) {
    const display = $('hexagram-display');
    const hex = data.hexagram;

    display.hidden = false;
    display.classList.add('flash');
    setTimeout(() => display.classList.remove('flash'), 700);

    $('hex-symbol').textContent = hex.original.symbol || '☷';
    $('hex-name').textContent = hex.original.name || '未知卦';
    $('hex-meaning').textContent = hex.original.meaning || '';

    const moving = hex.moving_lines || [];
    const badge = $('moving-badge');
    if (moving.length > 0) {
      badge.hidden = false;
      badge.textContent = '动爻 · 第 ' + moving.join('、') + ' 爻';
    } else {
      badge.hidden = true;
    }

    renderYaoLines(data.divination.lines, moving);

    const changedEl = $('changed-hex');
    if (hex.changed) {
      changedEl.hidden = false;
      $('changed-name').textContent =
        (hex.changed.name || '') + ' ' + (hex.changed.symbol || '');
    } else {
      changedEl.hidden = true;
    }

    setTimeout(() => revealOracle(data.oracle), 600);
  }

  function renderYaoLines(lines, movingLines) {
    const container = $('yao-lines');
    container.innerHTML = '';

    lines.forEach((val, idx) => {
      const yaoEl = document.createElement('div');
      const isYang = val === 7 || val === 9;
      const isMoving = movingLines.includes(idx + 1);

      yaoEl.className = 'yao-line ' + (isYang ? 'yang' : 'yin') + (isMoving ? ' moving' : '');
      yaoEl.textContent = isYang ? '██████████' : '████  ████';
      yaoEl.title = YAO_NAMES[idx] + (isMoving ? ' [动]' : '') + ' 值=' + val;
      container.appendChild(yaoEl);
    });
  }

  /* ---- 神谕 ---- */
  function revealOracle(oracle) {
    const section = $('oracle-section');
    section.hidden = false;
    section.classList.remove('fade-in');
    void section.offsetWidth;
    section.classList.add('fade-in');

    $('oracle-decryption').textContent = oracle.decryption || '';
    $('oracle-mapping').textContent = oracle.market_mapping || '';

    const action = VALID_ACTIONS.has(oracle.action) ? oracle.action : 'Hold';
    const actionClass = action.toLowerCase().replace(/\s+/g, '-');
    $('oracle-action-wrap').innerHTML =
      '<span class="oracle-action ' + esc(actionClass) + '">' + esc(action) + '</span>';

    $('oracle-support').textContent = formatLevel(oracle.support_level);
    $('oracle-resistance').textContent = formatLevel(oracle.resistance_level);
  }
})();
