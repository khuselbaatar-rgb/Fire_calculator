function fmt(x, n = 2) {
  return Number.isFinite(x) ? x.toFixed(n) : '—';
}
function getNum(id) {
  const el = document.getElementById(id);
  return el ? +el.value : NaN;
}

function tempColor(t) {
  if (t < 100)  return '#5aa9ff';
  if (t < 300)  return '#3ddc84';
  if (t < 500)  return '#ffd166';
  if (t < 700)  return '#ff9957';
  return '#ff5c5c';
}

let chartObj = null;
window._lastResult = null;
window._lastInputs = null;
window._currentTau = 0;

async function calc() {
  const inputs = {
    b:    getNum('b'),    h:    getNum('h'),    H0:   getNum('H0'),
    kL:   getNum('kL'),   c1:   getNum('c1'),   c2:   getNum('c2'),
    Rbn:  getNum('Rbn'),  Rsn:  getNum('Rsn'),  rho:  getNum('rho'),
    W:    getNum('W'),    tb:   getNum('tb'),   t0:   getNum('t0'),
    As1:  getNum('As1'),  As2:  getNum('As2'),  Np:   getNum('Np'),
    step: getNum('step'), tmax: getNum('tmax'),
  };
  const phiManualVal = document.getElementById('phiManual').value.trim();
  if (phiManualVal !== '') inputs.phiManual = +phiManualVal;

  const required = ['b','h','H0','Rbn','Rsn','rho','Np'];
  const bad = required.filter(k => !inputs[k] || inputs[k] <= 0);
  if (bad.length) { alert(t('alertCheck') + bad.join(', ')); return; }

  let result;
  try {
    const res = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs),
    });
    result = await res.json();
    if (!res.ok || result.error) {
      alert(t('errBackend') + (result.error || res.status));
      return;
    }
  } catch (e) {
    alert(t('errBackend') + e.message);
    return;
  }

  window._lastResult  = result;
  window._lastInputs  = inputs;
  window._currentTau  = 0;


  const slider = document.getElementById('tauSlider');
  slider.disabled = false;
  slider.min   = 0;
  slider.max   = result.chartRows.length ? result.chartRows[result.chartRows.length - 1].tau : 0;
  slider.step  = 1;
  slider.value = 0;

  window._renderLastResult();
}


function drawCrossSection(b, h, c1, c2, As1, As2, delta, ts1, ts2, tau) {
  const W = 460;
  const padding = 70;
  const drawW   = W - 2 * padding;
  const scale   = drawW / Math.max(b, h);
  const bs = b * scale, hs = h * scale;
  const ox = (W - bs) / 2;
  const oy = (W - hs) / 2;
  const ds = Math.min(delta * scale, Math.min(bs, hs) / 2 - 1);

  
  const r1 = Math.max(5, Math.min(28, Math.sqrt(Math.max(As1, 0) / 4 / Math.PI) * scale));
  const r2 = Math.max(4, Math.min(22, Math.sqrt(Math.max(As2, 0) / 4 / Math.PI) * scale));

  const c1s = c1 * scale;
  const c2s = c2 * scale;
  
  // Булгийн өнцөгт 4 арматур (As1)
  const as1Pos = [
    [ox + c1s,       oy + c1s      ],  // дээр зүүн
    [ox + bs - c1s,  oy + c1s      ],  // дээр баруун
    [ox + c1s,       oy + hs - c1s ],  // доор зүүн
    [ox + bs - c1s,  oy + hs - c1s ],  // доор баруун
  ];
  
  // Дээр доорын голуудаас тус бүр 1 арматур (As2 = 2)
  const as2Pos = [
    [ox + bs/2,      oy + c2s      ],  // дээр гол дунд
    [ox + bs/2,      oy + hs - c2s ],  // доор гол дунд
  ];

  const col1 = tempColor(ts1);
  const col2 = tempColor(ts2);

  let svg = `<svg viewBox="0 0 ${W} ${W}" xmlns="http://www.w3.org/2000/svg" aria-label="cross-section">`;

  
  svg += `<defs>
    <pattern id="burnt" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
      <rect width="8" height="8" fill="#ff7a1a"/>
      <rect width="4" height="8" fill="#5a2a08"/>
    </pattern>
  </defs>`;

  
  svg += `<rect x="${ox}" y="${oy}" width="${bs}" height="${hs}" fill="url(#burnt)" stroke="#999" stroke-width="1.2"/>`;

  
  const innerW = bs - 2 * ds;
  const innerH = hs - 2 * ds;
  if (innerW > 0 && innerH > 0) {
    svg += `<rect x="${ox + ds}" y="${oy + ds}" width="${innerW}" height="${innerH}" fill="#3a3a3a" stroke="#555" stroke-width="1"/>`;
  }


  if (delta > 0.5) {
    svg += `<line x1="${ox}" y1="${oy - 8}" x2="${ox + ds}" y2="${oy - 8}" stroke="#ff7a1a" stroke-width="2"/>`;
    svg += `<text x="${ox + ds/2}" y="${oy - 12}" text-anchor="middle" fill="#ff9957" font-size="11" font-family="Consolas,monospace">δ=${fmt(delta,1)}</text>`;
  }

 
  for (const [x, y] of as1Pos) {
    svg += `<circle cx="${x}" cy="${y}" r="${r1}" fill="${col1}" stroke="#0b0f14" stroke-width="1.2"/>`;
  }
  for (const [x, y] of as2Pos) {
    svg += `<circle cx="${x}" cy="${y}" r="${r2}" fill="${col2}" stroke="#0b0f14" stroke-width="1.2"/>`;
  }

 
  svg += `<text x="${ox + bs/2}" y="${oy + hs + 22}" text-anchor="middle" fill="#9aa7b5" font-size="13" font-family="Consolas,monospace">b = ${b} mm</text>`;
  svg += `<text x="${ox - 18}" y="${oy + hs/2}" text-anchor="middle" fill="#9aa7b5" font-size="13" font-family="Consolas,monospace" transform="rotate(-90 ${ox - 18} ${oy + hs/2})">h = ${h} mm</text>`;

  
  svg += `<g font-family="Consolas,monospace">`;
  svg += `<text x="14" y="22" fill="#ff9957" font-size="14" font-weight="700">τ = ${tau} ${t('lblMin').trim()}</text>`;
  svg += `<text x="14" y="40" fill="#cbd6e2" font-size="11">A<tspan baseline-shift="sub" font-size="9">s1</tspan> · ts1 = ${fmt(ts1, 0)} °C</text>`;
  svg += `<text x="14" y="55" fill="#cbd6e2" font-size="11">A<tspan baseline-shift="sub" font-size="9">s2</tspan> · ts2 = ${fmt(ts2, 0)} °C</text>`;
  svg += `</g>`;

  svg += `</svg>`;
  return svg;
}

/* ---------- Find the chartRow nearest to a given tau ---------- */
function chartRowAt(tau) {
  const r = window._lastResult;
  if (!r || !r.chartRows || !r.chartRows.length) return null;
  const idx = Math.max(0, Math.min(r.chartRows.length - 1, Math.round(tau)));
  return r.chartRows[idx];
}

/* ---------- Re-draw the section for the slider's current τ ---------- */
function refreshSection() {
  const r = window._lastResult;
  const inp = window._lastInputs;
  if (!r || !inp) return;
  const cr = chartRowAt(window._currentTau);
  if (!cr) return;

  document.getElementById('tauReadout').textContent =
      `τ = ${cr.tau} ${t('lblMin').trim()}`;

  document.getElementById('sectionSvg').innerHTML = drawCrossSection(
    inp.b, inp.h, inp.c1, inp.c2, inp.As1, inp.As2,
    cr.delta, cr.ts1, cr.ts2, cr.tau,
  );
}

window._renderLastResult = function () {
  const r = window._lastResult;
  if (!r) return;
  const inputs = window._lastInputs || {};

  // Thermal parameters
  document.getElementById('paramRows').innerHTML =
    `<tr><th>${t('rowLambdaT')}</th><td>${fmt(r.lambdaTem,4)} ${t('uWmC')}</td></tr>`+
    `<tr><th>${t('rowCT')}</th><td>${fmt(r.cTem,0)} ${t('uJkgC')}</td></tr>`+
    `<tr><th>${t('rowARed')}</th><td>${fmt(r.aRed,4)} ${t('uMm2s')}</td></tr>`+
    `<tr><th>${t('rowKb')}</th><td>${fmt(r.kbS,1)} ${t('uMm')}</td></tr>`;

  // τ = 0 static check
  const phiNote = r.phiManual ? t('phiManualNote') : t('phiAutoNote');
  document.getElementById('zeroRows').innerHTML =
    `<tr><th>${t('rowL0')}</th><td>${fmt(r.l0,0)} ${t('uMm')}</td></tr>`+
    `<tr><th>${t('rowLambda')}</th><td>${fmt(r.lambda,2)}</td></tr>`+
    `<tr><th>${t('rowPhi')}</th><td>${fmt(r.phi,3)} ${phiNote}</td></tr>`+
    `<tr><th>${t('rowN0')}</th><td>${fmt(r.N0,0)} ${t('uKn')}</td></tr>`+
    `<tr><th>${t('rowCheck')}</th><td class="${r.N0pass?'ok':'bad'}">${r.N0pass?t('okMsg'):t('badMsg')}</td></tr>`;

  // Coarse table (user step)
  const rows = r.rows || [];
  document.getElementById('timeRows').innerHTML = rows.map(row =>
    `<tr><td>${row.tau}</td>`+
    `<td>${row.root?fmt(row.root,0):'—'}</td>`+
    `<td>${fmt(row.ts1,0)}</td>`+
    `<td>${fmt(row.ts2,0)}</td>`+
    `<td>${fmt(row.g1,3)}</td>`+
    `<td>${fmt(row.g2,3)}</td>`+
    `<td>${fmt(row.delta,1)}</td>`+
    `<td class="${row.ok?'ok':'bad'}">${fmt(row.Nu,0)}</td>`+
    `<td class="${row.ok?'ok':'bad'}">${row.ok?t('okShort'):t('badShort')}</td></tr>`
  ).join('');

  // Verdict
  let pfText = '', status = '';
  if (r.verdict === 'more') {
    pfText = t('pfMore').replace('{0}', r.tauLast);
    status = t('statOk');
  } else if (r.verdict === 'zero') {
    pfText = t('pfZero');
    status = t('statBad');
  } else {
    pfText = t('pfApprox').replace('{0}', fmt(r.tExact, 0));
    status = t('statApprox').replace('{0}', fmt(r.tExact, 0));
  }
  document.getElementById('pf').textContent       = pfText;
  document.getElementById('pfMini').textContent   = pfText;
  document.getElementById('n0Mini').textContent   = fmt(r.N0, 0) + ' ' + t('uKn');
  document.getElementById('loadMini').textContent = fmt(r.Np, 0) + ' ' + t('uKn');
  document.getElementById('statusMini').textContent = status;

  document.getElementById('conclusion').innerHTML =
    t('conclTpl')
      .replace('{Np}', fmt(r.Np, 0))
      .replace('{pf}', pfText)
      .replace('{extra}', r.verdict === 'more' ? t('conclPass') : t('conclFail'));

  // Chart at 1-minute resolution (from chartRows)
  const cr     = r.chartRows || [];
  const labels = cr.map(x => x.tau);
  const capData  = cr.map(x => +x.Nu.toFixed(1));
  const loadData = cr.map(()  => r.Np);

  if (chartObj) chartObj.destroy();
  chartObj = new Chart(document.getElementById('chart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: t('chartCap'), data: capData,
          borderColor: '#ff7a1a',
          backgroundColor: 'rgba(255,122,26,.16)',
          fill: true, tension: .25, pointRadius: 0, borderWidth: 2,
        },
        {
          label: t('chartLoad'), data: loadData,
          borderColor: '#5aa9ff', borderDash: [8, 5],
          fill: false, pointRadius: 0, borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend:  { labels: { color: '#e7edf5' } },
        tooltip: { callbacks: {
          title: items => items[0].label + ' ' + t('lblMin').trim(),
          label: ctx => ctx.dataset.label + ': ' + ctx.parsed.y + ' ' + t('uKn'),
        }},
      },
      scales: {
        x: {
          ticks: { color:'#9aa7b5', maxTicksLimit: 12, callback: function(v){
            const tau = labels[v]; return (tau % 10 === 0) ? tau + t('lblMin') : '';
          }},
          grid:  { color:'rgba(255,255,255,.06)' },
          title: { display:true, text:t('axisTime'), color:'#9aa7b5' },
        },
        y: {
          ticks: { color:'#9aa7b5' },
          grid:  { color:'rgba(255,255,255,.06)' },
          title: { display:true, text:t('axisKn'),  color:'#9aa7b5' },
        },
      },
    },
  });

  // Cross-section using current slider tau
  refreshSection();
};

function loadExample() {
  const vals = { b:300, h:300, H0:4000, kL:0.8, c1:50, c2:150,
                 Rbn:22, Rsn:400, rho:2300, W:2, tb:450, t0:20,
                 As1:5027, As2:2513, Np:2354, tmax:180 };
  Object.entries(vals).forEach(([id, v]) => {
    const el = document.getElementById(id);
    if (el) el.value = v;
  });
  document.getElementById('step').value = '30';
  document.getElementById('phiManual').value = '';
  calc();
}

/* ---------- Slider wiring ---------- */
document.getElementById('tauSlider').addEventListener('input', (e) => {
  window._currentTau = +e.target.value;
  refreshSection();
});

window.calc = calc;
window.loadExample = loadExample;

document.getElementById('year').textContent = new Date().getFullYear();

(function initLang(){
  let saved = 'ru';
  try { saved = localStorage.getItem('siteLang') || 'ru'; } catch(e){}
  setLang(saved);
})();


(function initSection(){
  const inp = {
    b:  getNum('b'),  h:  getNum('h'),
    c1: getNum('c1'), c2: getNum('c2'),
    As1:getNum('As1'),As2:getNum('As2'),
  };
  document.getElementById('sectionSvg').innerHTML = drawCrossSection(
    inp.b||300, inp.h||300, inp.c1||50, inp.c2||150,
    inp.As1||5027, inp.As2||2513, 0, 20, 20, 0,
  );
})();
