'use strict';

(() => {
  const DATA = window.BUDGET_DATA.rows.map((r, i) => ({ ...r, id: i, delta: r.y2027 - r.y2026, rate: r.y2026 === 0 ? null : (r.y2027 - r.y2026) / r.y2026 }));
  const COLORS = ['#7864DF', '#4287E9', '#22B6A0', '#E787B5', '#F1A35E', '#6DC1DA', '#AA88DB', '#F17E85', '#97B765', '#6485B8', '#B58F76', '#C2A553', '#538F95', '#A371A7', '#9CA9BF'];
  const SECTORS = ['전력운영', '방위력개선', '병무행정'];
  const ACCOUNTS = ['일반회계', '특별회계·기금', '내부거래·보전지출', '내부거래'];
  const fmt = (v, digits = 0) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const signed = (v, digits = 0) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v), digits)}`;
  const pct = v => v === null || !Number.isFinite(v) ? '—' : `${signed(v * 100, 1)}%`;
  const short = v => Math.abs(v) >= 10000 ? `${fmt(v / 10000, 1)}조` : `${fmt(v)}억`;
  const sum = (rows, key) => rows.reduce((v, r) => v + r[key], 0);
  const name = r => r.program || r.account;
  const truncate = (s, length = 15) => s.length > length ? `${s.slice(0, length - 1)}…` : s;
  const aggregate = (rows, key) => [...new Set(rows.map(r => r[key]))].map(k => ({ key: k, y2026: sum(rows.filter(r => r[key] === k), 'y2026'), y2027: sum(rows.filter(r => r[key] === k), 'y2027') }));
  const filterRows = (sector = '', account = '') => DATA.filter(r => (!sector || r.sector === sector) && (!account || r.account === account));
  const totals = rows => { const a = sum(rows, 'y2026'), b = sum(rows, 'y2027'); return { a, b, delta: b - a, rate: a === 0 ? null : (b - a) / a }; };
  window.BudgetMath = { DATA, filterRows, totals, aggregate };
  if (typeof document === 'undefined') return;

  const $ = id => document.getElementById(id);
  let filtered = DATA;
  let sort = { key: 'id', direction: 1 };
  const tooltip = $('tooltip');
  const empty = message => `<div class="empty-chart"><b>◌</b>${esc(message)}</div>`;
  const text = (x, y, label, attrs = '') => `<text x="${x}" y="${y}" fill="#8994AD" font-size="10" ${attrs}>${esc(label)}</text>`;
  const line = (x1, y1, x2, y2, attrs = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#EDF0F7" ${attrs}/>`;
  const svg = (content, label, height = 260) => `<svg viewBox="0 0 560 ${height}" role="img" aria-label="${esc(label)}">${content}</svg>`;
  const tip = label => `data-tip="${esc(label)}" tabindex="0" aria-label="${esc(label)}"`;
  const rowTip = r => `${name(r)}\n${r.sector} · ${r.account}\n2026년  ${fmt(r.y2026)}억원\n2027년  ${fmt(r.y2027)}억원\n증감  ${signed(r.delta)}억원 (${pct(r.rate)})`;
  const sectorColor = sector => COLORS[SECTORS.indexOf(sector)];

  function renderKpis(rows) {
    const t = totals(rows);
    $('kpi-2026').innerHTML = `${fmt(t.a / 10000, 2)}<small>조원</small>`;
    $('kpi-2027').innerHTML = `${fmt(t.b / 10000, 2)}<small>조원</small>`;
    $('kpi-2026-detail').textContent = `${fmt(t.a)}억원`;
    $('kpi-2027-detail').textContent = `${fmt(t.b)}억원`;
    $('kpi-delta').innerHTML = `${signed(t.delta)}<small>억원</small>`;
    $('kpi-rate').textContent = pct(t.rate);
    $('delta-caption').textContent = t.delta > 0 ? '선택 항목의 순재원이 늘었습니다' : t.delta < 0 ? '선택 항목의 순재원이 줄었습니다' : '선택 항목의 순재원 변동 없음';
  }

  function renderSectors(rows) {
    const groups = aggregate(rows, 'sector');
    if (!groups.length) { $('sector-chart').innerHTML = empty('선택한 조건의 데이터가 없습니다.'); return; }
    const low = Math.min(0, ...groups.flatMap(r => [r.y2026, r.y2027]));
    const high = Math.max(1, ...groups.flatMap(r => [r.y2026, r.y2027]));
    const x = v => 102 + (v - low) / (high - low) * 380;
    let c = '';
    for (let k = 0; k <= 4; k++) { const v = low + (high - low) * k / 4; c += line(x(v), 15, x(v), 225) + text(x(v), 249, short(v), 'text-anchor="middle" font-size="9"'); }
    groups.forEach((g, i) => {
      const y = 28 + i * (188 / Math.max(groups.length, 1));
      c += text(0, y + 24, g.key, 'font-size="12" fill="#52617F"');
      [g.y2026, g.y2027].forEach((v, j) => {
        c += `<rect x="${Math.min(x(0), x(v))}" y="${y + j * 24}" width="${Math.max(1, Math.abs(x(v) - x(0)))}" height="17" rx="4" fill="${j === 0 ? '#CBC8F9' : '#7864DF'}" ${tip(`${g.key} · ${2026 + j}년\n${fmt(v)}억원`)}/>`;
        c += text(x(v) + (v >= 0 ? 7 : -7), y + j * 24 + 12, short(v), `text-anchor="${v >= 0 ? 'start' : 'end'}" font-size="10" fill="${j ? '#6F5BD4' : '#A8A1D2'}"`);
      });
    });
    $('sector-chart').innerHTML = svg(c, '부문별 2026년과 2027년 예산 비교');
    const largest = [...groups].sort((a, b) => b.y2027 - a.y2027)[0];
    $('sector-note').innerHTML = `선택 범위에서 <strong>${esc(largest.key)}</strong>의 2027년 순재원은 <strong>${fmt(largest.y2027)}억원</strong>입니다.`;
  }

  function renderDonut(rows) {
    const groups = aggregate(rows.filter(r => r.y2027 > 0), 'account');
    const total = groups.reduce((s, r) => s + r.y2027, 0);
    if (!total) { $('account-chart').innerHTML = empty('차감 재원만 선택되어 구성비를 표시하지 않습니다.'); $('account-legend').innerHTML = ''; return; }
    let c = `<circle cx="142" cy="135" r="88" fill="none" stroke="#F1F0FA" stroke-width="33"/>`;
    const circumference = 2 * Math.PI * 88;
    let offset = 0;
    groups.forEach((g, i) => {
      const fraction = g.y2027 / total, length = fraction * circumference;
      c += `<circle cx="142" cy="135" r="88" fill="none" stroke="${COLORS[i]}" stroke-width="33" stroke-dasharray="${Math.max(0, length - (groups.length > 1 ? 4 : 0))} ${circumference}" stroke-dashoffset="${-offset}" transform="rotate(-90 142 135)" ${tip(`${g.key}\n${fmt(g.y2027)}억원 · ${fmt(fraction * 100, 1)}%`)}/>`;
      offset += length;
    });
    c += text(142, 124, '양수 재원 합계', 'text-anchor="middle" font-size="11"') + text(142, 153, `${fmt(total / 10000, 2)}조`, 'text-anchor="middle" font-size="25" font-weight="700" fill="#3E4969"');
    $('account-chart').innerHTML = `<svg viewBox="0 0 284 270" role="img" aria-label="2027년 양수 재원의 회계구분별 구성비">${c}</svg>`;
    $('account-legend').innerHTML = groups.map((g, i) => `<div class="legend-item"><span class="legend-dot" style="background:${COLORS[i]}"></span><span>${esc(g.key)}</span><strong>${fmt(g.y2027 / total * 100, 1)}%</strong><small>${fmt(g.y2027)}억원</small></div>`).join('');
  }

  function tile(items, x, y, w, h) {
    if (!items.length) return '';
    if (items.length === 1) {
      const item = items[0], label = item.label, width = Math.max(1, w - 3), height = Math.max(1, h - 3);
      const capacity = Math.floor((width - 18) / 11);
      let s = `<g ${tip(item.tooltip)}><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="${item.color}"/>`;
      if (width > 76 && height > 38) {
        const first = label.slice(0, capacity), second = label.slice(capacity, capacity * 2);
        s += text(x + 10, y + 20, first, 'font-size="11" fill="white" font-weight="600"');
        if (second && height > 65) s += text(x + 10, y + 37, label.length > capacity * 2 ? second.slice(0, -1) + '…' : second, 'font-size="11" fill="white" font-weight="600"');
        if (height > 57) s += text(x + 10, y + height - 12, short(item.value), 'fill="#FFFFFFD9" font-size="10"');
      }
      return s + '</g>';
    }
    const total = items.reduce((s, r) => s + r.value, 0);
    let acc = 0, cut = 1;
    for (let i = 0; i < items.length - 1; i++) { acc += items[i].value; cut = i + 1; if (acc >= total / 2) break; }
    const left = items.slice(0, cut), right = items.slice(cut), ratio = left.reduce((s, r) => s + r.value, 0) / total;
    return w >= h ? tile(left, x, y, w * ratio, h) + tile(right, x + w * ratio, y, w * (1 - ratio), h) : tile(left, x, y, w, h * ratio) + tile(right, x, y + h * ratio, w, h * (1 - ratio));
  }

  function renderTreemap(rows) {
    const positive = rows.filter(r => r.y2027 > 0).sort((a, b) => b.y2027 - a.y2027);
    if (!positive.length) { $('treemap-chart').innerHTML = empty('양수 재원 프로그램이 없습니다.'); return; }
    const items = positive.slice(0, 14).map((r, i) => ({ label: name(r), value: r.y2027, color: COLORS[i], tooltip: rowTip(r) }));
    if (positive.length > 14) items.push({ label: '기타 프로그램', value: sum(positive.slice(14), 'y2027'), color: COLORS[14], tooltip: `기타 ${positive.length - 14}개 프로그램\n${fmt(sum(positive.slice(14), 'y2027'))}억원` });
    $('treemap-chart').innerHTML = svg(tile(items, 0, 0, 560, 258), '2027년 프로그램 예산 트리맵');
  }

  function renderHeatmap(rows) {
    const max = Math.max(1, ...SECTORS.flatMap(s => ACCOUNTS.map(a => Math.abs(sum(rows.filter(r => r.sector === s && r.account === a), 'y2027')))));
    let c = '';
    ACCOUNTS.forEach((a, j) => {
      const x = 106 + j * 112 + 53;
      if (a === '내부거래·보전지출') c += text(x, 21, '내부거래·', 'text-anchor="middle" font-size="10"') + text(x, 36, '보전지출', 'text-anchor="middle" font-size="10"');
      else c += text(x, 29, a, 'text-anchor="middle" font-size="10"');
    });
    SECTORS.forEach((s, i) => {
      const y = 51 + i * 63;
      c += text(0, y + 33, s, 'fill="#596580" font-size="11"');
      ACCOUNTS.forEach((a, j) => {
        const found = rows.filter(r => r.sector === s && r.account === a), value = sum(found, 'y2027');
        const x = 106 + j * 112, intensity = .16 + .82 * Math.sqrt(Math.abs(value) / max);
        c += `<g ${found.length ? tip(`${s} · ${a}\n2027년 ${fmt(value)}억원`) : ''}><rect x="${x}" y="${y}" width="105" height="54" rx="7" fill="${found.length ? value >= 0 ? '#7864DF' : '#EE987B' : '#F5F6FA'}" fill-opacity="${found.length ? intensity : 1}"/>`;
        c += text(x + 52.5, y + 32, found.length ? fmt(value) : '—', `text-anchor="middle" font-size="11" fill="${found.length ? intensity > .5 ? '#FFFFFF' : value < 0 ? '#BC7158' : '#7964BA' : '#CDD3E0'}" font-weight="600"`) + '</g>';
      });
    });
    $('heatmap-chart').innerHTML = svg(c, '부문과 회계구분별 2027년 재원 매트릭스');
  }

  function renderRanking(rows) {
    const top = rows.filter(r => r.y2027 > 0).sort((a, b) => b.y2027 - a.y2027).slice(0, 8);
    if (!top.length) { $('ranking-chart').innerHTML = empty('양수 재원 프로그램이 없습니다.'); return; }
    const max = Math.max(1, ...top.flatMap(r => [r.y2026, r.y2027]));
    const x = v => 152 + v / max * 330;
    let c = '';
    for (let k = 0; k <= 4; k++) c += line(x(max * k / 4), 8, x(max * k / 4), 295) + text(x(max * k / 4), 320, short(max * k / 4), 'text-anchor="middle" font-size="9"');
    top.forEach((r, i) => {
      const y = 23 + i * (268 / Math.max(top.length, 1));
      c += `<g ${tip(rowTip(r))}>` + text(0, y + 4, `${i + 1}. ${truncate(name(r), 12)}`, 'fill="#66728F" font-size="10"');
      c += line(x(r.y2026), y, x(r.y2027), y, 'stroke="#BEB4F2" stroke-width="5" stroke-linecap="round"');
      c += `<circle cx="${x(r.y2026)}" cy="${y}" r="4" fill="#BBB5F4"/><circle cx="${x(r.y2027)}" cy="${y}" r="6" fill="#6D5ADC" stroke="white" stroke-width="2"/>`;
      c += text(Math.max(x(r.y2026), x(r.y2027)) + 11, y + 4, short(r.y2027), 'fill="#8878B8" font-size="9"') + '</g>';
    });
    $('ranking-chart').innerHTML = svg(c, '2027년 예산 상위 프로그램의 연도별 예산 비교', 330);
  }

  function renderDelta(rows) {
    const top = [...rows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 8);
    if (!top.length) { $('delta-chart').innerHTML = empty('선택한 조건의 데이터가 없습니다.'); return; }
    const low = Math.min(0, ...top.map(r => r.delta)), high = Math.max(1, ...top.map(r => r.delta));
    const x = v => 175 + (v - low) / (high - low) * 298;
    let c = '';
    for (let k = 0; k <= 4; k++) { const v = low + (high - low) * k / 4; c += line(x(v), 7, x(v), 295) + text(x(v), 320, short(v), 'text-anchor="middle" font-size="9"'); }
    c += line(x(0), 5, x(0), 295, 'stroke="#C6CEDD"');
    top.forEach((r, i) => {
      const y = 12 + i * (268 / Math.max(top.length, 1));
      c += text(0, y + 15, truncate(name(r), 16), 'font-size="10" fill="#66728F"');
      c += `<rect x="${Math.min(x(0), x(r.delta))}" y="${y}" width="${Math.max(1, Math.abs(x(r.delta) - x(0)))}" height="23" rx="4" fill="${r.delta >= 0 ? '#25B59E' : '#F08089'}" ${tip(rowTip(r))}/>`;
      c += text(555, y + 15, signed(r.delta), 'text-anchor="end" font-size="10" fill="#71809A"');
    });
    $('delta-chart').innerHTML = svg(c, '증감 영향 순위', 330);
  }

  function renderScatter(rows) {
    const positive = rows.filter(r => r.y2026 > 0 && r.y2027 > 0 && r.rate !== null);
    $('scatter-legend').innerHTML = SECTORS.filter(s => positive.some(r => r.sector === s)).map(s => `<span><i style="background:${sectorColor(s)}"></i>${s}</span>`).join('');
    if (!positive.length) { $('scatter-chart').innerHTML = empty('양수 재원 프로그램이 없습니다.'); return; }
    const maxX = Math.max(1, ...positive.map(r => r.y2026)) * 1.12;
    const minY = Math.min(0, ...positive.map(r => r.rate)) - .06;
    const maxY = Math.max(.1, ...positive.map(r => r.rate)) + .09;
    const x = v => 54 + v / maxX * 464, y = v => 219 - (v - minY) / (maxY - minY) * 196;
    let c = '';
    for (let k = 0; k <= 4; k++) { const v = minY + (maxY - minY) * k / 4; c += line(54, y(v), 518, y(v)) + text(44, y(v) + 3, `${fmt(v * 100, 0)}%`, 'text-anchor="end" font-size="9"'); }
    for (let k = 0; k <= 4; k++) { const v = maxX * k / 4; c += text(x(v), 238, short(v), 'text-anchor="middle" font-size="9"'); }
    c += line(54, y(0), 518, y(0), 'stroke="#C9CEDE" stroke-dasharray="4 4"');
    const largest = Math.max(...positive.map(r => r.y2027));
    positive.slice().sort((a, b) => b.y2027 - a.y2027).forEach(r => {
      c += `<circle cx="${x(r.y2026)}" cy="${y(r.rate)}" r="${5 + Math.sqrt(r.y2027 / largest) * 13}" fill="${sectorColor(r.sector)}" fill-opacity=".68" stroke="white" stroke-width="1.5" ${tip(rowTip(r))}/>`;
    });
    const fastest = [...positive].sort((a, b) => b.rate - a.rate)[0];
    if (positive.length > 1) c += text(Math.min(440, x(fastest.y2026) + 13), Math.max(17, y(fastest.rate) - 10), truncate(name(fastest), 14), 'font-size="9" fill="#9F83B7"');
    c += text(520, 258, '2026년 예산 →', 'text-anchor="end" font-size="9"');
    $('scatter-chart').innerHTML = svg(c, '프로그램별 예산 규모와 증감률 산점도');
  }

  function renderWaterfall(rows) {
    if (!rows.length) { $('waterfall-chart').innerHTML = empty('선택한 조건의 데이터가 없습니다.'); return; }
    const t = totals(rows), up = sum(rows.filter(r => r.delta > 0), 'delta'), down = sum(rows.filter(r => r.delta < 0), 'delta');
    const steps = [{ label:'2026년', start:0, end:t.a, value:t.a, color:'#8B7AE3' }, { label:'증가 합계', start:t.a, end:t.a + up, value:up, color:'#25B59E' }, { label:'감소 합계', start:t.a + up, end:t.b, value:down, color:'#F08089' }, { label:'2027년', start:0, end:t.b, value:t.b, color:'#6656D1' }];
    const high = Math.max(1, ...steps.flatMap(s => [s.start, s.end])) * 1.13, low = Math.min(0, ...steps.flatMap(s => [s.start, s.end])) * 1.16;
    const y = v => 219 - (v - low) / (high - low) * 194;
    let c = '';
    for (let k = 0; k <= 4; k++) { const v = low + (high - low) * k / 4; c += line(58, y(v), 546, y(v)) + text(49, y(v) + 3, short(v), 'text-anchor="end" font-size="9"'); }
    c += line(58, y(0), 546, y(0), 'stroke="#C9CEDE"');
    steps.forEach((s, i) => {
      const x = 79 + i * 120, top = Math.min(y(s.start), y(s.end));
      c += `<rect x="${x}" y="${top}" width="69" height="${Math.max(2, Math.abs(y(s.start) - y(s.end)))}" rx="4" fill="${s.color}" ${tip(`${s.label}\n${fmt(s.value)}억원`)}/>`;
      c += text(x + 34.5, top - 9, i === 1 || i === 2 ? signed(s.value) : fmt(s.value), 'text-anchor="middle" font-size="10" fill="#67738E"');
      c += text(x + 34.5, 245, s.label, 'text-anchor="middle" font-size="10"');
      if (i < 3) c += line(x + 69, y(s.end), x + 120, y(s.end), 'stroke="#BDC5D9" stroke-dasharray="3 3"');
    });
    $('waterfall-chart').innerHTML = svg(c, '2026년에서 2027년까지 순재원 증감 워터폴 차트');
  }

  function tableRows() {
    const query = $('search').value.trim().toLocaleLowerCase('ko');
    return filtered.filter(r => !query || [r.sector, r.account, r.category, name(r)].join(' ').toLocaleLowerCase('ko').includes(query)).sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      return sort.direction * (typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''), 'ko'));
    });
  }
  function renderTable() {
    const rows = tableRows();
    $('table-body').innerHTML = rows.map(r => `<tr class="${r.y2027 < 0 ? 'adjustment' : ''}"><td><span class="sector-chip" style="color:${sectorColor(r.sector)};background:${sectorColor(r.sector)}13">${esc(r.sector)}</span></td><td>${esc(r.account)}</td><td>${esc(r.category) || '—'}</td><td>${esc(r.program) || '—'}</td><td class="num">${fmt(r.y2026)}</td><td class="num">${fmt(r.y2027)}</td><td class="num ${r.delta > 0 ? 'delta-up' : r.delta < 0 ? 'delta-down' : ''}">${signed(r.delta)}</td><td class="num ${r.rate > 0 ? 'delta-up' : r.rate < 0 ? 'delta-down' : ''}">${pct(r.rate)}</td></tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:38px">검색 결과가 없습니다.</td></tr>';
    $('table-count').textContent = rows.length;
    $('table-summary').textContent = `선택 항목 ${filtered.length}개 중 ${rows.length}개 표시 · 2027년 표시 합계 ${fmt(sum(rows, 'y2027'))}억원`;
    document.querySelectorAll('th button[data-sort]').forEach(b => {
      const active = b.dataset.sort === sort.key;
      b.parentElement.setAttribute('aria-sort', active ? sort.direction === 1 ? 'ascending' : 'descending' : 'none');
    });
  }

  function refreshAccounts() {
    const current = $('account').value, sector = $('sector').value;
    const available = ACCOUNTS.filter(a => DATA.some(r => (!sector || r.sector === sector) && r.account === a));
    $('account').innerHTML = '<option value="">전체 회계구분</option>' + available.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('');
    $('account').value = available.includes(current) ? current : '';
  }
  function render() {
    tooltip.hidden = true;
    filtered = filterRows($('sector').value, $('account').value);
    $('row-count').textContent = filtered.length;
    $('selection-label').textContent = `${$('sector').value || '전체 부문'} / ${$('account').value || '전체 회계구분'}`;
    renderKpis(filtered); renderSectors(filtered); renderDonut(filtered); renderTreemap(filtered); renderHeatmap(filtered); renderRanking(filtered); renderDelta(filtered); renderScatter(filtered); renderWaterfall(filtered); renderTable();
    window.dashboardState = { sector: $('sector').value, account: $('account').value, count: filtered.length, ...totals(filtered) };
  }
  $('sector').innerHTML += SECTORS.map(s => `<option value="${s}">${s}</option>`).join('');
  refreshAccounts();
  $('sector').addEventListener('change', () => { refreshAccounts(); render(); });
  $('account').addEventListener('change', render);
  $('reset').addEventListener('click', () => { $('sector').value = ''; $('account').value = ''; $('search').value = ''; sort = { key: 'id', direction: 1 }; refreshAccounts(); render(); });
  $('search').addEventListener('input', renderTable);
  document.querySelectorAll('[data-sort]').forEach(b => b.addEventListener('click', () => { sort = { key: b.dataset.sort, direction: sort.key === b.dataset.sort ? -sort.direction : ['y2026', 'y2027', 'delta', 'rate'].includes(b.dataset.sort) ? -1 : 1 }; renderTable(); }));
  $('export').addEventListener('click', () => {
    const clean = v => typeof v === 'string' && /^[=+@\-\t\r]/.test(v) ? `'${v}` : v;
    const csvCell = v => `"${String(clean(v) ?? '').replaceAll('"', '""')}"`;
    const rows = [['부문', '회계구분', '구분', '프로그램명', '2026년(억원)', '2027년(억원)', '증감(억원)', '증감률(%)'], ...tableRows().map(r => [r.sector, r.account, r.category, r.program, r.y2026, r.y2027, r.delta, r.rate === null ? '' : Number((r.rate * 100).toFixed(4))])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = '국방예산_필터결과.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  function showTip(el, x, y) {
    tooltip.textContent = el.dataset.tip; tooltip.hidden = false;
    const rect = tooltip.getBoundingClientRect();
    tooltip.style.left = `${Math.max(8, Math.min(x + 14, innerWidth - rect.width - 12))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(y + 14, innerHeight - rect.height - 12))}px`;
  }
  document.addEventListener('pointermove', e => { const el = e.target.closest('[data-tip]'); if (el) showTip(el, e.clientX, e.clientY); else tooltip.hidden = true; });
  document.addEventListener('pointerout', e => { if (e.target.closest('[data-tip]')) tooltip.hidden = true; });
  document.addEventListener('focusin', e => { if (e.target.dataset.tip) { const r = e.target.getBoundingClientRect(); showTip(e.target, r.x + r.width / 2, r.y + r.height / 2); } });
  document.addEventListener('focusout', () => { tooltip.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') tooltip.hidden = true; });
  document.querySelectorAll('.nav-link').forEach(a => a.addEventListener('click', () => { document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active')); a.classList.add('active'); }));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.hash === '#' + entry.target.id)); }, { rootMargin: '-8% 0px -65% 0px' });
    ['overview', 'structure', 'growth', 'records'].forEach(id => observer.observe($(id)));
  }
  render();
})();
