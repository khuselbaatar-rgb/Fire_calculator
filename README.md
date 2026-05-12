# Reinforced-Concrete Column Fire-Resistance Calculator

> **Backend:** C++17 · **Frontend / Web server:** Python 3 (Flask) · **UI:** HTML + Chart.js

The original single-file HTML calculator (`OnlineCalculatorJBK.html`) has been split
into a proper web application:

| Layer | Tech | Responsibility |
|---|---|---|
| **Backend** | C++17 | All physics & math (erf, γ-steel, φ-λ, time-series, FRL) |
| **Web server / Frontend** | Python 3 + Flask | HTTP routing, template rendering, calls C++ binary |
| **UI** | HTML + Chart.js | Form input, table & chart rendering, RU / EN / MN i18n |

```
[ Browser ] ──HTTP──► [ Flask app.py ] ──stdin/stdout──► [ C++ ./calculator ]
            ◄──HTML──             ◄────── JSON ──────
```

---

## 📁 Project layout

```
jbk-calc/
├── app.py                 ← Flask web server (Python frontend)
├── requirements.txt
├── backend/
│   ├── calculator.cpp     ← C++ computational backend
│   └── Makefile
├── templates/
│   └── index.html         ← Jinja2 template
└── static/
    ├── style.css
    ├── i18n.js            ← RU / EN / MN translations
    └── app.js             ← AJAX + DOM rendering only (NO math)
```

---

## 🚀 Quick start

### 1. Build the C++ backend

```bash
cd backend
make
cd ..
```

Requires `g++` with C++17 support (any modern compiler). Produces `backend/calculator`.

### 2. Install Python deps

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run the server

```bash
python3 app.py
```

Open <http://localhost:5000> in your browser.

---

## 🔌 API

`POST /api/calculate` — JSON body with all numeric fields:

```json
{
  "b": 300, "h": 300, "H0": 4000, "kL": 0.8,
  "c1": 50, "c2": 150,
  "Rbn": 22, "Rsn": 400, "rho": 2300, "W": 2, "tb": 450, "t0": 20,
  "As1": 5027, "As2": 2513, "Np": 2354,
  "step": 30, "tmax": 180,
  "phiManual": null
}
```

Response (truncated):

```json
{
  "lambdaTem": 0.8925, "cTem": 1088, "aRed": 0.3266, "kbS": 21.26,
  "l0": 3200, "lambda": 10.67, "phi": 0.969, "phiManual": false,
  "N0": 4843.34, "Np": 2354, "N0pass": true,
  "rows": [ { "tau": 0, "Nu": 4843.34, "ok": true }, ... ],
  "verdict": "more",     // "more" | "approx" | "zero"
  "tExact": -1,          // intersection time when verdict == "approx"
  "tauLast": 180
}
```

`GET /api/health` — confirms the C++ binary is built and reachable.

---

## 🔍 Test the C++ binary directly

```bash
printf 'b=300\nh=300\nH0=4000\nkL=0.8\nc1=50\nc2=150\nRbn=22\nRsn=400\nrho=2300\nW=2\ntb=450\nt0=20\nAs1=5027\nAs2=2513\nNp=2354\nstep=30\ntmax=180\n' \
  | ./backend/calculator
```

---

## 🌍 Languages

UI ships with three: **🇷🇺 Русский · 🇬🇧 English · 🇲🇳 Монгол**. Click the flag in
the header. Choice persists via `localStorage`.

## ⚖️ Numerical parity

The C++ port reproduces the original JS results to ~10 significant digits — the
erf approximation, γ-steel and φ-λ interpolation tables, and the
`Np,tem(τ)` formula are byte-identical algorithmically.
