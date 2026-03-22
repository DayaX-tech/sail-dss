# 🚂 SAIL Bokaro Steel Plant — AI-Driven Railway Rake Formation DSS

**Steel Authority of India Limited (SAIL) | Bokaro Steel Plant**  
*Decision Support System for Optimized Railway Rake Formation*

---

## 🏭 Project Overview

This is a **production-grade, enterprise-class Decision Support System (DSS)** that enables Bokaro Steel Plant logistics officers to plan and optimize daily railway rake dispatch operations using AI-driven recommendations — without manual calculations.

The system simulates Bokaro Steel Plant operations at scale:
- **20,000 Orders** across 800 customers
- **2,500 Wagons** across 6 types
- **150 Rakes**, **5 Stockyards**, **6 Loading Sidings**
- **7 Product types** with engineering compatibility constraints

---

## 🎯 Industrial Use Case

Bokaro Steel Plant dispatches steel products (Hot Rolled Coils, Plates, Billets, etc.) via Indian Railways freight wagons. Each day, logistics officers must:

1. Check which wagons are available
2. Match products to compatible wagon types (engineering constraints)
3. Form optimal rakes (train compositions) minimizing cost and penalty risk
4. Prioritize high-urgency, high-penalty orders
5. Ensure wagon capacity is maximally utilized

This system automates the **intelligence layer** while keeping the **decision** with the human officer.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (Port 3000)            │
│  Dashboard → Orders → Wagons → Rake Planner → Analytics │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/Axios
┌───────────────────────▼─────────────────────────────────┐
│               FastAPI Backend (Port 8000)                │
│  /dashboard, /orders, /wagons, /generate-plan, etc.      │
└────────────────┬──────────────────────────┬─────────────┘
                 │                          │
    ┌────────────▼────────────┐  ┌─────────▼────────────┐
    │   Preprocessing Engine  │  │  Optimization Engine  │
    │  urgency_score          │  │  Greedy Heuristic     │
    │  risk_score             │  │  MILP (OR-Tools)      │
    │  wagon_match_score      │  │  Algorithm Comparison │
    │  loading_feasibility    │  │  Explanation Engine   │
    └─────────────────────────┘  └──────────────────────┘
                 │
    ┌────────────▼────────────┐
    │   Data Generator Layer  │
    │  Orders, Wagons, Rakes  │
    │  Inventory, Routes, LP  │
    └─────────────────────────┘
```

---

## 🔧 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend UI | React 18 + Vite | SPA with multi-page navigation |
| Styling | Tailwind CSS | Industrial design system |
| Charts | Recharts | Analytics visualization |
| Animation | Framer Motion | UI animations |
| Icons | Lucide React | Industrial icons |
| Routing | React Router v6 | Multi-page SPA routing |
| HTTP Client | Axios | API communication |
| Backend | FastAPI (Python 3.11) | REST API gateway |
| Data Processing | Pandas + NumPy | Data wrangling & feature engineering |
| Optimization | OR-Tools + custom MILP | Rake formation optimization |
| Validation | Pydantic v2 | Data contracts |
| Server | Uvicorn | ASGI production server |

---

## 📊 Dataset Description

### Orders (20,000 records)
`order_id, customer_id, product_type, quantity_tons, destination, deadline, penalty_cost, customer_priority, status`

### Wagons (2,500 records)  
`wagon_id, wagon_type, capacity_tons, availability_status, location, condition_score, age_years`

### Product–Wagon Compatibility
```
Hot Rolled Coils  → BCNA, BOST
Cold Rolled Sheets → BCNA, BOST, BTPN
Plates            → BRN, BOST
Billets           → BOXN, BCN, BRN
Pig Iron          → BOXN, BCN
Structural Steel  → BRN, BCN, BOXN
Finished Bundles  → BCNA, BTPN, BCN
```

### Derived AI Features
- `urgency_score` — deadline proximity scoring (0–1)
- `risk_score` — weighted penalty × urgency × priority
- `wagon_match_score` — compatibility breadth score
- `loading_feasibility_index` — inventory vs order ratio
- `composite_priority` — master ranking score

---

## 🤖 Algorithms

### 1. Greedy Heuristic Planner
- Sorts orders by composite priority
- Greedily assigns best-fit compatible wagons
- Fast: ~10-50ms runtime
- Good for quick feasibility checks

### 2. MILP Optimization (OR-Tools)
- Objective: Minimize freight cost + idle capacity + penalty exposure
- Constraints: wagon compatibility, rake size limit, inventory limits
- Better utilization packing (targets ≥85% fill before moving to next wagon)
- Runtime: 200-800ms

### 3. Algorithm Comparison Engine
- Runs both algorithms on same dataset
- Compares: utilization %, net savings, runtime, confidence score
- Auto-recommends winner

### 4. Digital Twin Simulation
- Monte Carlo next-day demand forecasting
- Wagon shortage risk prediction
- 3-scenario analysis (Optimistic / Base / Pessimistic)

---

## 📱 15-Page Application

| # | Page | Description |
|---|------|-------------|
| 1 | Command Center | Live KPIs, charts, alerts |
| 2 | Orders Intelligence | 20K orders with AI scores, filters, sort |
| 3 | Wagon Monitor | 2,500 wagons, status heatmap |
| 4 | Compatibility Matrix | Product-wagon compatibility grid |
| 5 | Inventory & Stockyard | Inventory by product/yard |
| 6 | **Rake Planner** | Core AI planning workspace |
| 7 | Space Utilization | Utilization heatmap per rake |
| 8 | Plan Comparison | Greedy vs MILP side-by-side |
| 9 | Cost & Penalty | 30-day financial analytics |
| 10 | Risk Monitor | Risk distribution, danger zones |
| 11 | Loading Scheduler | Siding capacity & queue |
| 12 | AI Explanation | Explainable AI decision factors |
| 13 | Digital Twin | Simulation & next-day forecast |
| 14 | Historical Analytics | 30-day performance trends |
| 15 | Admin & Monitor | System health, dataset info |

---

## 🚀 Installation Guide

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

✅ Backend runs at: `http://localhost:8000`  
✅ API docs at: `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

✅ Frontend runs at: `http://localhost:3000`

---

## 📡 API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/dashboard` | KPIs, alerts, charts data |
| GET | `/orders?status=PENDING&limit=500` | Orders with filters |
| GET | `/wagons?status=AVAILABLE` | Wagon fleet status |
| GET | `/inventory` | Stockyard inventory |
| GET | `/analytics` | Historical & risk analytics |
| GET | `/compatibility` | Product-wagon matrix |
| GET | `/rakes` | Rake status list |
| GET | `/loading-points` | Siding capacity data |
| GET | `/routes` | Origin-destination routes |
| GET | `/simulation` | Digital twin forecast |
| POST | `/generate-plan` | **Generate optimized rake plan** |
| GET | `/plan-explanation` | XAI explanation |

### Generate Plan Request
```json
{
  "algorithm": "both",
  "max_wagons": 50,
  "product_filter": "Hot Rolled Coils",
  "destination_filter": "Mumbai"
}
```

---

## 🎨 Design System

- **Primary**: Steel Blue `#0B3C5D`
- **Accent**: Industrial Orange `#FF7A00`
- **Background**: Deep Navy `#050e1a`
- **Typography**: Rajdhani (display), JetBrains Mono (data), Inter (body)

---

## 📈 Evaluation Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Wagon Utilization | ≥80% | Loaded tons / Capacity |
| Penalty Avoided | Maximize | High-risk orders dispatched on time |
| Net Savings | Positive | Penalty avoided − Freight cost |
| Confidence Score | ≥85% | AI plan confidence |
| Runtime (Greedy) | <100ms | Quick feasibility |
| Runtime (MILP) | <1000ms | Optimal planning |

---

## 🔮 Future Enhancements

1. **Real-time Indian Railways API** integration for live wagon tracking
2. **SAP ERP integration** for live order feeds
3. **GPU-accelerated MILP** for 10x speed improvement
4. **Reinforcement Learning** agent for adaptive planning
5. **Mobile app** for field officers
6. **Geospatial route mapping** with live rail network
7. **Multi-plant coordination** (Bhilai, Rourkela, Durgapur)
8. **Weather and strike delay** prediction model
9. **WhatsApp/SMS alerts** for critical risk orders
10. **Blockchain** dispatch audit trail

---

*Built for SAIL Bokaro Steel Plant — Steel Authority of India Limited*  
*© 2024 | Industrial DSS Platform v2.0*
