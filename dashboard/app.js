// Token Launch Radar (radar-2): the dashboard. One sealed snapshot, rendered as a board.
//
// window.RADAR is data.js, written by main.ts from the same board as board.json, so
// this page and the submitted board always agree. The farm plans are generated here
// from the same rule as lib/model.ts — category, chains, TVL and age — so the detail
// view's plan is the board's plan, word for word.
(function () {
  'use strict';
  var DATA = window.RADAR;
  if (!DATA) return;

  var $ = function (id) { return document.getElementById(id); };
  var PAGE_SIZE = 50;
  var state = {
    tab: 'board', q: '', category: '', chain: '', watchlistOnly: false,
    sort: 'implied_value_usd', dir: 'desc', page: 1,
    gw: DATA.model.growth_weight, mh: DATA.model.maturity_days, mc: DATA.model.multiple_cap,
  };
  var sandboxDefault = function () {
    return state.gw === DATA.model.growth_weight && state.mh === DATA.model.maturity_days && state.mc === DATA.model.multiple_cap;
  };

  // ---------- formatting ----------
  function money(n) {
    if (n === null || n === undefined) return '—';
    var abs = Math.abs(n);
    if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n;
  }
  function pct(n) {
    if (n === null || n === undefined) return '—';
    return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------- the farm plan, the same rule as lib/model.ts ----------
  function chainOf(row) { return row.chains.length > 0 ? row.chains[0] : 'its main chain'; }
  function capitalFor(row) {
    if (row.tvl_usd >= 5e9) return 250;
    if (row.tvl_usd >= 1e9) return 150;
    if (row.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function holdDaysFor(age) {
    if (age === null) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(row, capital, chain) {
    var c = (row.category || '').toLowerCase();
    var name = row.name;
    if (c.indexOf('uncollateralized') >= 0 || c.indexOf('lending') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and borrow a small amount against it, then repay.';
    if (c.indexOf('cdp') >= 0) return 'Lock $' + capital + ' of collateral in ' + name + ' on ' + chain + ' and mint its stable asset against it.';
    if (c.indexOf('dex') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + '\'s main pool on ' + chain + ' and keep the position open.';
    if (c.indexOf('yield aggregator') >= 0) return 'Deposit $' + capital + ' of USDC into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('yield') >= 0 || c.indexOf('farm') >= 0 || c.indexOf('leveraged') >= 0) return 'Deposit $' + capital + ' into ' + name + '\'s highest-TVL pool on ' + chain + ' and keep the position open.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' curated vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('derivative') >= 0 || c.indexOf('perpetual') >= 0 || c.indexOf('basis') >= 0 || c.indexOf('interest rate') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedged position.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('rwa') >= 0) return 'Mint $' + capital + ' of the protocol\'s yield-bearing asset on ' + chain + ' and hold it.';
    if (c.indexOf('stablecoin') >= 0 || c.indexOf('dual-token') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('staking pool') >= 0 || c.indexOf('restaking') >= 0) return 'Stake $' + capital + ' through ' + name + ' on ' + chain + ' and keep the receipt.';
    if (c === 'chain') return 'Bridge $' + capital + ' of USDC to ' + name + ' and use one of its apps for a week.';
    if (c.indexOf('anchor btc') >= 0 || c.indexOf('decentralized btc') >= 0) return 'Mint $' + capital + ' of the BTC-backed asset through ' + name + ' on ' + chain + ' and hold it.';
    if (c.indexOf('cedefi') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('liquidity manager') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' managed liquidity vault on ' + chain + '.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function farmSteps(row) {
    var chain = chainOf(row);
    var capital = capitalFor(row);
    var hold = holdDaysFor(row.age_days);
    var gas = capital >= 150 ? 8 : 4;
    var steps = [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(row, capital, chain), cost: '$' + capital + ' of capital and about $' + gas + ' of gas', time: '15 minutes to set up' },
      { text: 'Do one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: 'Open the protocol\'s own points or rewards page once a week and claim only from the link it publishes.', cost: 'no fee to check, and never pay to claim', time: '10 minutes a week' },
      { text: 'Watch for the launch signal: a token proposal, a governance vote or a points snapshot announcement. Keep the position open through the snapshot window.', cost: 'nothing but attention', time: '5 minutes a week' },
      { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' },
    ];
    return steps.map(function (s) {
      var t = s.text + ' Cost: ' + s.cost + '. Time: ' + s.time + '.';
      if (t.length > 600) t = t.slice(0, 596) + '...';
      if (t.length < 20) t = t + ' Hold the position and check the protocol\'s own page.';
      return t;
    });
  }

  // ---------- the sandbox: re-score every row under the slider weights ----------
  function sandboxedImplied(row) {
    var age = row.age_days === null ? DATA.model.unknown_age_days : row.age_days;
    var growthPct = Math.min(DATA.model.growth_cap, Math.max(DATA.model.growth_floor, row.change_7d === null ? 0 : row.change_7d));
    var growthMult = 1 + (growthPct / 100) * state.gw;
    var maturityMult = DATA.model.maturity_floor + (1 - DATA.model.maturity_floor) * (1 - Math.exp(-Math.max(age, 0) / state.mh));
    var multiple = Math.min(row.multiple, state.mc);
    return Math.max(1, Math.round(row.tvl_usd * multiple * growthMult * maturityMult));
  }
  function viewRows() {
    if (state.tab === 'live') {
      return DATA.live.map(function (r) {
        return { rank: null, slug: r.slug, name: r.name, category: r.category, chains: r.chains, tvl_usd: r.tvl_usd, change_7d: r.change_7d, mcap_usd: r.mcap_usd, implied_value_usd: r.mcap_usd || 0, multiple: null, watchlist: false, age_days: null };
      });
    }
    return DATA.rows.map(function (r) {
      var copy = {};
      for (var k in r) copy[k] = r[k];
      if (!sandboxDefault()) copy.implied_value_usd = sandboxedImplied(r);
      return copy;
    });
  }

  // ---------- filtering, sorting, paging ----------
  function filtered() {
    var rows = viewRows();
    var q = state.q.trim().toLowerCase();
    if (q) rows = rows.filter(function (r) { return r.name.toLowerCase().indexOf(q) >= 0 || r.slug.toLowerCase().indexOf(q) >= 0; });
    if (state.category) rows = rows.filter(function (r) { return r.category === state.category; });
    if (state.chain) rows = rows.filter(function (r) { return r.chains.indexOf(state.chain) >= 0; });
    if (state.watchlistOnly) rows = rows.filter(function (r) { return r.watchlist; });
    var key = state.sort;
    var dir = state.dir === 'asc' ? 1 : -1;
    rows.sort(function (a, b) {
      var av = a[key], bv = b[key];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
    if (key === 'implied_value_usd' && state.dir === 'desc') rows.sort(function (a, b) { return b.implied_value_usd - a.implied_value_usd; });
    return rows;
  }

  function signalChip(row) {
    if (row.watchlist) return '<span class="chip watch">Watchlist</span>';
    if (state.tab === 'board') return '<span class="chip early">Early find</span>';
    return '';
  }
  function hotChip(row) {
    if (row.change_7d !== null && row.change_7d >= 20) return '<span class="chip hot">Surging ' + pct(row.change_7d) + '</span>';
    return '';
  }

  function render() {
    var rows = filtered();
    var total = rows.length;
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    var pageRows = rows.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    var maxImplied = 1;
    DATA.rows.forEach(function (r) { if (r.implied_value_usd > maxImplied) maxImplied = r.implied_value_usd; });
    var html = pageRows.map(function (r) {
      var changeCls = r.change_7d === null ? '' : (r.change_7d >= 0 ? 'pos' : 'neg');
      var share = Math.max(0, Math.min(100, (r.implied_value_usd / maxImplied) * 100));
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td class="rank">' + (r.rank === null ? '—' : '#' + r.rank) + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span>' + signalChip(r) + hotChip(r) + '<br><span class="sub">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num ' + changeCls + '">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + (r.multiple === null ? '—' : r.multiple.toFixed(2) + '×') + '</td>' +
        '<td class="num"><strong>' + money(r.implied_value_usd) + '</strong></td>' +
        '<td><span class="bar"><i style="width:' + share.toFixed(1) + '%"></i></span></td>' +
        '</tr>';
    }).join('');
    $('rows').innerHTML = html;
    $('empty').hidden = total > 0;
    $('sandbox-note').hidden = sandboxDefault() || state.tab === 'live';
    $('count').textContent = state.tab === 'live'
      ? total + ' live-token protocol' + (total === 1 ? '' : 's') + ' · market cap, not a model'
      : total + ' of ' + DATA.board_size + ' pre-token protocols';
    $('page-label').textContent = 'Page ' + state.page + ' of ' + pages;
    $('prev-page').disabled = state.page <= 1;
    $('next-page').disabled = state.page >= pages;
    document.querySelectorAll('#board th button').forEach(function (b) {
      if (!b.dataset.label) b.dataset.label = b.textContent;
      var arrow = b.dataset.sort === state.sort ? (state.dir === 'asc' ? ' ↑' : ' ↓') : '';
      b.textContent = b.dataset.label + arrow;
    });
    $('tab-board').setAttribute('aria-pressed', state.tab === 'board' ? 'true' : 'false');
    $('tab-live').setAttribute('aria-pressed', state.tab === 'live' ? 'true' : 'false');
    writeHash();
  }

  // ---------- header, lede, multiples ----------
  function renderStatic() {
    var top = DATA.rows[0];
    var medianImplied = DATA.rows[Math.floor(DATA.rows.length / 2)].implied_value_usd;
    var watchInTop = DATA.rows.slice(0, 100).filter(function (r) { return r.watchlist; }).length;
    $('top-meta').innerHTML = '<span>Snapshot <b>' + esc(DATA.as_of) + '</b></span><span>Source <b>' + esc(DATA.source) + '</b></span><span>Floor <b>' + money(DATA.floor_usd) + '</b></span><span>Model <b>' + esc(DATA.model_version) + '</b></span>';
    $('lede-text').textContent = 'The snapshot carries ' + DATA.watchlist_size + ' watchlist protocols at or above a ' + money(DATA.floor_usd) +
      ' TVL floor. The radar adds the ' + DATA.early_size + ' early finds the watchlist leaves out — pre-token protocols the watchlist misses, some of them above the floor — and ranks all ' +
      DATA.board_size + ' by implied token value, read off the market caps of the tokens that already trade in the same category. ' +
      top.name + ' leads at ' + money(top.implied_value_usd) + '; the median row is worth ' + money(medianImplied) + '.';
    $('facts').innerHTML =
      '<div><dt>Top implied value</dt><dd>' + money(top.implied_value_usd) + ' <small>' + esc(top.name) + '</small></dd></div>' +
      '<div><dt>Median implied value</dt><dd>' + money(medianImplied) + '</dd></div>' +
      '<div><dt>Watchlist in the top 100</dt><dd>' + watchInTop + ' <small>of 40</small></dd></div>' +
      '<div><dt>Live tokens set aside</dt><dd>' + DATA.live_size + '</dd></div>';
    var cats = {};
    DATA.rows.forEach(function (r) { var k = r.category || 'Other'; cats[k] = (cats[k] || 0) + 1; });
    var multRows = Object.keys(DATA.multiples.by_category).sort().map(function (k) {
      return '<tr><td>' + esc(k) + '</td><td>' + (cats[k] || '—') + '</td><td>' + DATA.multiples.by_category[k].toFixed(2) + '×</td></tr>';
    }).join('');
    document.querySelector('#multiples tbody').innerHTML = multRows;
    $('multiples-note').textContent = 'Overall median multiple ' + DATA.multiples.overall.toFixed(2) + '× across the snapshot\'s live-token protocols. A category with few live members is shrunk toward it.';
    $('data-note').textContent = 'Snapshot ' + DATA.as_of + ' from ' + DATA.source + ', ' + DATA.watchlist_size + ' watchlist protocols at a ' + money(DATA.floor_usd) +
      ' floor, ' + DATA.rows.length + ' pre-token protocols ranked. Prices are never fetched and no network is used: every figure on this page comes from the snapshot. ' +
      'A protocol is pre-token when its record carries no market cap, no CoinGecko id and no symbol. Wrapped, staked and bridged products, exchanges and versioned pools are excluded from the board. ' +
      'The page is a dashboard, not advice: an implied value is a model\'s read of the snapshot, not a price, and a launch is never guaranteed.';
    var catSel = $('category');
    Object.keys(cats).sort().forEach(function (c) {
      var o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o);
    });
    var chainSet = {};
    DATA.rows.forEach(function (r) { r.chains.forEach(function (c) { chainSet[c] = true; }); });
    var chainSel = $('chain');
    Object.keys(chainSet).sort().forEach(function (c) {
      var o = document.createElement('option'); o.value = c; o.textContent = c; chainSel.appendChild(o);
    });
  }

  // ---------- detail ----------
  function openDetail(slug) {
    var row = null;
    DATA.rows.forEach(function (r) { if (r.slug === slug) row = r; });
    var body = $('detail-body');
    if (!row) { body.innerHTML = '<p>No protocol with that slug on this board.</p>'; }
    else {
      var steps = farmSteps(row);
      var age = row.age_days === null ? DATA.model.unknown_age_days : row.age_days;
      var growthPct = Math.min(DATA.model.growth_cap, Math.max(DATA.model.growth_floor, row.change_7d === null ? 0 : row.change_7d));
      var base = row.tvl_usd * row.multiple;
      var noGrowth = Math.max(1, Math.round(row.tvl_usd * row.multiple * row.maturity_multiplier));
      var overall = Math.max(1, Math.round(row.tvl_usd * DATA.multiples.overall * row.growth_multiplier * row.maturity_multiplier));
      var maxTvl = 1;
      DATA.rows.forEach(function (r) { if (r.tvl_usd > maxTvl) maxTvl = r.tvl_usd; });
      var factorRow = function (label, barPct, value) {
        return '<div class="factor"><span>' + label + '</span><span class="fbar"><i style="width:' + Math.max(1, Math.min(100, barPct)).toFixed(1) + '%"></i></span><span class="fval">' + value + '</span></div>';
      };
      var chainList = row.chains.length > 5 ? row.chains.slice(0, 5).join(', ') + ' +' + (row.chains.length - 5) + ' more' : row.chains.join(', ');
      body.innerHTML =
        '<h2>' + esc(row.name) + '</h2>' +
        '<p class="meta">Rank #' + row.rank + ' · ' + esc(row.category || '—') + ' · ' + esc(chainList) + ' · ' + (row.watchlist ? 'Watchlist' : 'Early find') + ' · TVL ' + money(row.tvl_usd) + ' · 7d ' + pct(row.change_7d) + ' · listed ' + (row.listed_at || 'unknown') + '</p>' +
        '<div class="factors">' +
        factorRow('TVL', (row.tvl_usd / maxTvl) * 100, money(row.tvl_usd)) +
        factorRow('Category multiple', (row.multiple / 1.5) * 100, row.multiple.toFixed(2) + '×') +
        factorRow('Growth factor', (row.growth_multiplier / 2.2) * 100, row.growth_multiplier.toFixed(2) + '×') +
        factorRow('Maturity factor', row.maturity_multiplier * 100, row.maturity_multiplier.toFixed(2) + '×') +
        '<div class="factor total"><span>Implied value</span><span class="fbar"><i style="width:100%"></i></span><span class="fval">' + money(row.implied_value_usd) + '</span></div>' +
        '</div>' +
        '<h3>Farm plan — 7 steps</h3>' +
        '<ol class="steps">' + steps.map(function (s) {
          var m = s.match(/^(.*?) Cost: (.*)\. Time: (.*)\.$/);
          return '<li>' + esc(m ? m[1] : s) + '<span class="step-meta">Cost: ' + esc(m ? m[2] : '') + ' · Time: ' + esc(m ? m[3] : '') + '</span></li>';
        }).join('') + '</ol>' +
        '<p class="whatif"><strong>What would change the rank:</strong> with no 7-day growth (' + pct(growthPct) + ' → 0%) the implied value would be ' + money(noGrowth) +
        '; at the overall median multiple (' + DATA.multiples.overall.toFixed(2) + '×) instead of its category multiple it would be ' + money(overall) +
        '. The base value before growth and maturity is ' + money(Math.round(base)) + '.</p>';
    }
    var d = $('detail');
    if (!d.open) d.showModal();
  }
  function closeDetail() {
    var d = $('detail');
    if (d.open) d.close();
  }

  // ---------- hash routing ----------
  function readHash() {
    var p = new URLSearchParams(location.hash.slice(1));
    state.q = p.get('q') || '';
    state.category = p.get('category') || '';
    state.chain = p.get('chain') || '';
    state.watchlistOnly = p.get('watchlist') === '1';
    state.tab = p.get('tab') === 'live' ? 'live' : 'board';
    state.sort = p.get('sort') || 'implied_value_usd';
    state.dir = p.get('dir') === 'asc' ? 'asc' : 'desc';
    state.page = Math.max(1, parseInt(p.get('page') || '1', 10) || 1);
    $('q').value = state.q;
    $('category').value = state.category;
    $('chain').value = state.chain;
    $('watchlist-only').checked = state.watchlistOnly;
    var slug = p.get('p');
    if (slug) openDetail(slug); else closeDetail();
  }
  function writeHash() {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.category) p.set('category', state.category);
    if (state.chain) p.set('chain', state.chain);
    if (state.watchlistOnly) p.set('watchlist', '1');
    if (state.tab === 'live') p.set('tab', 'live');
    if (state.sort !== 'implied_value_usd' || state.dir !== 'desc') { p.set('sort', state.sort); p.set('dir', state.dir); }
    if (state.page > 1) p.set('page', String(state.page));
    var cur = new URLSearchParams(location.hash.slice(1));
    if (cur.get('p')) p.set('p', cur.get('p'));
    var h = p.toString();
    history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
  }

  // ---------- events ----------
  $('q').addEventListener('input', function (e) { state.q = e.target.value; state.page = 1; render(); });
  $('category').addEventListener('change', function (e) { state.category = e.target.value; state.page = 1; render(); });
  $('chain').addEventListener('change', function (e) { state.chain = e.target.value; state.page = 1; render(); });
  $('watchlist-only').addEventListener('change', function (e) { state.watchlistOnly = e.target.checked; state.page = 1; render(); });
  $('tab-board').addEventListener('click', function () { state.tab = 'board'; state.page = 1; render(); });
  $('tab-live').addEventListener('click', function () { state.tab = 'live'; state.page = 1; render(); });
  $('prev-page').addEventListener('click', function () { if (state.page > 1) { state.page--; render(); } });
  $('next-page').addEventListener('click', function () { state.page++; render(); });
  document.querySelectorAll('#board th button').forEach(function (b) {
    b.addEventListener('click', function () {
      var key = b.dataset.sort;
      if (state.sort === key) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
      else { state.sort = key; state.dir = key === 'name' || key === 'category' ? 'asc' : 'desc'; }
      state.page = 1;
      render();
    });
  });
  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (!tr) return;
    var p = new URLSearchParams(location.hash.slice(1));
    p.set('p', tr.dataset.slug);
    history.replaceState(null, '', '#' + p.toString());
    openDetail(tr.dataset.slug);
  });
  $('detail').addEventListener('close', function () {
    var p = new URLSearchParams(location.hash.slice(1));
    p.delete('p');
    var h = p.toString();
    history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
  });
  window.addEventListener('hashchange', readHash);

  // Sandbox sliders.
  var gw = $('gw'), mh = $('mh'), mc = $('mc');
  gw.addEventListener('input', function () { state.gw = parseFloat(gw.value); $('gw-value').textContent = state.gw.toFixed(2); state.page = 1; render(); });
  mh.addEventListener('input', function () { state.mh = parseInt(mh.value, 10); $('mh-value').textContent = String(state.mh); state.page = 1; render(); });
  mc.addEventListener('input', function () { state.mc = parseFloat(mc.value); $('mc-value').textContent = state.mc.toFixed(2); state.page = 1; render(); });
  $('reset-model').addEventListener('click', function () {
    state.gw = DATA.model.growth_weight; state.mh = DATA.model.maturity_days; state.mc = DATA.model.multiple_cap;
    gw.value = String(state.gw); mh.value = String(state.mh); mc.value = String(state.mc);
    $('gw-value').textContent = state.gw.toFixed(2);
    $('mh-value').textContent = String(state.mh);
    $('mc-value').textContent = state.mc.toFixed(2);
    state.page = 1; render();
  });

  renderStatic();
  readHash();
  render();
})();
