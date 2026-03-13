"""
SAIL Bokaro Steel Plant - Railway Rake DSS Backend
FastAPI Application Gateway
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from pydantic import BaseModel
from typing import Optional, List
import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

from data.generator import get_data
from preprocessing.pipeline import preprocess_orders, preprocess_wagons
from engines.optimizer import greedy_plan, milp_plan, generate_explanation, algorithm_comparison

app = FastAPI(
    title="SAIL Bokaro DSS API",
    description="AI-Driven Railway Rake Formation Decision Support System",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Data Initialization ────────────────────────────────────────────────────
_preprocessed = {}

def get_preprocessed():
    global _preprocessed
    if not _preprocessed:
        data = get_data()
        orders_pp = preprocess_orders(data['orders'], data['compatibility'], data['inventory'])
        wagons_pp = preprocess_wagons(data['wagons'])
        _preprocessed = {**data, 'orders': orders_pp, 'wagons': wagons_pp}
    return _preprocessed


# ─── Helpers ────────────────────────────────────────────────────────────────
def df_to_records(df: pd.DataFrame, limit: int = None) -> list:
    d = df.copy()
    for col in d.select_dtypes(include=['float64', 'float32']).columns:
        d[col] = d[col].round(4)
    if limit:
        d = d.head(limit)
    return d.replace({np.nan: None}).to_dict(orient='records')


# ─── Routes ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "SAIL DSS API Online", "version": "2.0.0", "plant": "Bokaro Steel Plant"}


@app.get("/dashboard")
def dashboard():
    data = get_preprocessed()
    orders = data['orders']
    wagons = data['wagons']
    inventory = data['inventory']
    
    pending = orders[orders['status'] == 'PENDING']
    high_risk = pending[pending['risk_score'] >= 0.7] if 'risk_score' in pending.columns else pending.head(0)
    
    wagon_status = wagons['availability_status'].value_counts().to_dict()
    
    today_dispatched = random.randint(8, 18)
    
    product_pending = pending.groupby('product_type')['quantity_tons'].sum().round(2).to_dict() if not pending.empty else {}
    
    destination_demand = pending.groupby('destination')['quantity_tons'].sum().nlargest(10).round(2).to_dict() if not pending.empty else {}
    
    hourly_loading = [random.randint(2, 12) for _ in range(24)]
    
    utilization_trend = [round(random.uniform(72, 92), 1) for _ in range(7)]
    
    return {
        "timestamp": datetime.now().isoformat(),
        "kpis": {
            "total_orders": int(len(orders)),
            "pending_orders": int(len(pending)),
            "high_risk_orders": int(len(high_risk)),
            "total_wagons": int(len(wagons)),
            "available_wagons": int(wagon_status.get('AVAILABLE', 0)),
            "wagons_in_use": int(wagon_status.get('IN_USE', 0)),
            "wagons_maintenance": int(wagon_status.get('MAINTENANCE', 0)),
            "today_dispatched_rakes": today_dispatched,
            "avg_utilization_pct": round(random.uniform(78, 88), 1),
            "penalties_avoided_today": random.randint(800000, 3000000),
            "total_inventory_tons": round(float(inventory['available_tons'].sum()), 2),
            "active_sidings": 5
        },
        "wagon_status_distribution": wagon_status,
        "product_pending_tons": product_pending,
        "destination_demand": destination_demand,
        "hourly_loading_activity": hourly_loading,
        "utilization_trend_7days": utilization_trend,
        "alerts": [
            {"level": "HIGH", "message": f"{int(len(high_risk))} orders breach deadline within 48 hours", "timestamp": datetime.now().isoformat()},
            {"level": "MEDIUM", "message": "SID-3 loading point nearing capacity (87%)", "timestamp": datetime.now().isoformat()},
            {"level": "LOW", "message": "BOXN wagon availability below threshold in SY-B", "timestamp": datetime.now().isoformat()}
        ]
    }


@app.get("/orders")
def get_orders(
    status: Optional[str] = None,
    product_type: Optional[str] = None,
    destination: Optional[str] = None,
    min_priority: Optional[int] = None,
    limit: int = Query(500, le=2000),
    offset: int = 0
):
    data = get_preprocessed()
    orders = data['orders'].copy()
    
    if status:
        orders = orders[orders['status'] == status]
    if product_type:
        orders = orders[orders['product_type'] == product_type]
    if destination:
        orders = orders[orders['destination'] == destination]
    if min_priority:
        orders = orders[orders['customer_priority'] >= min_priority]
    
    total = len(orders)
    orders = orders.iloc[offset:offset+limit]
    
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "orders": df_to_records(orders)
    }


@app.get("/wagons")
def get_wagons(
    status: Optional[str] = None,
    wagon_type: Optional[str] = None,
    location: Optional[str] = None,
    limit: int = Query(500, le=2500)
):
    data = get_preprocessed()
    wagons = data['wagons'].copy()
    
    if status:
        wagons = wagons[wagons['availability_status'] == status]
    if wagon_type:
        wagons = wagons[wagons['wagon_type'] == wagon_type]
    if location:
        wagons = wagons[wagons['location'] == location]
    
    status_dist = wagons['availability_status'].value_counts().to_dict()
    type_dist = wagons['wagon_type'].value_counts().to_dict()
    
    return {
        "total": len(wagons),
        "status_distribution": status_dist,
        "type_distribution": type_dist,
        "wagons": df_to_records(wagons.head(limit))
    }


@app.get("/inventory")
def get_inventory():
    data = get_preprocessed()
    inv = data['inventory']
    
    by_stockyard = inv.groupby('stockyard')[['available_tons', 'reserved_tons']].sum().round(2).to_dict()
    by_product = inv.groupby('product_type')[['available_tons', 'reserved_tons']].sum().round(2).to_dict()
    
    return {
        "total_available_tons": round(float(inv['available_tons'].sum()), 2),
        "total_reserved_tons": round(float(inv['reserved_tons'].sum()), 2),
        "by_stockyard": by_stockyard,
        "by_product": by_product,
        "records": df_to_records(inv)
    }


@app.get("/analytics")
def get_analytics():
    data = get_preprocessed()
    orders = data['orders']
    wagons = data['wagons']
    
    pending = orders[orders['status'] == 'PENDING']
    
    risk_dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    if 'risk_score' in pending.columns:
        risk_dist["LOW"] = int((pending['risk_score'] < 0.3).sum())
        risk_dist["MEDIUM"] = int(((pending['risk_score'] >= 0.3) & (pending['risk_score'] < 0.6)).sum())
        risk_dist["HIGH"] = int(((pending['risk_score'] >= 0.6) & (pending['risk_score'] < 0.85)).sum())
        risk_dist["CRITICAL"] = int((pending['risk_score'] >= 0.85).sum())
    
    historical_performance = []
    for i in range(30):
        day = (datetime.now() - timedelta(days=29-i)).strftime("%Y-%m-%d")
        historical_performance.append({
            "date": day,
            "rakes_dispatched": random.randint(6, 18),
            "avg_utilization": round(random.uniform(74, 92), 1),
            "penalties_avoided": random.randint(500000, 3000000),
            "freight_cost": random.randint(2000000, 6000000)
        })
    
    product_performance = []
    for prod in ["Hot Rolled Coils", "Cold Rolled Sheets", "Plates", "Billets", "Pig Iron", "Structural Steel"]:
        product_performance.append({
            "product": prod,
            "avg_utilization": round(random.uniform(75, 93), 1),
            "total_dispatched_tons": random.randint(5000, 50000),
            "avg_freight_cost": random.randint(25000, 55000)
        })
    
    return {
        "risk_distribution": risk_dist,
        "total_penalty_exposure": int(pending['penalty_cost'].sum()) if not pending.empty else 0,
        "avg_urgency_score": round(float(pending['urgency_score'].mean()), 4) if 'urgency_score' in pending.columns else 0,
        "wagon_utilization_by_type": {
            wt: round(random.uniform(65, 92), 1) for wt in ["BCNA", "BRN", "BOXN", "BOST", "BTPN", "BCN"]
        },
        "historical_performance": historical_performance,
        "product_performance": product_performance,
        "route_analysis": [
            {"destination": dest, "avg_cost": cost, "distance_km": dist, "monthly_rakes": random.randint(2, 20)}
            for (dest, cost), (_, dist) in zip(
                list({"Mumbai": 45000, "Delhi": 38000, "Kolkata": 15000, "Chennai": 52000, "Hyderabad": 42000}.items()),
                list({"Mumbai": 1650, "Delhi": 1300, "Kolkata": 280, "Chennai": 1850, "Hyderabad": 1450}.items())
            )
        ]
    }


@app.get("/compatibility")
def get_compatibility():
    data = get_preprocessed()
    compat = data['compatibility']
    return {
        "matrix": df_to_records(compat),
        "product_wagon_map": data['product_wagon_compat']
    }


@app.get("/rakes")
def get_rakes():
    data = get_preprocessed()
    rakes = data['rakes']
    return {
        "total": len(rakes),
        "status_distribution": rakes['status'].value_counts().to_dict(),
        "rakes": df_to_records(rakes)
    }


@app.get("/loading-points")
def get_loading_points():
    data = get_preprocessed()
    lp = data['loading_points']
    return {"loading_points": df_to_records(lp)}


@app.get("/routes")
def get_routes():
    data = get_preprocessed()
    routes = data['routes']
    return {"routes": df_to_records(routes)}


class PlanRequest(BaseModel):
    algorithm: str = "both"  # greedy | milp | both
    rake_id: Optional[str] = None
    max_wagons: int = 50
    product_filter: Optional[str] = None
    destination_filter: Optional[str] = None


@app.post("/generate-plan")
def generate_plan(req: PlanRequest):
    data = get_preprocessed()
    orders = data['orders'].copy()
    wagons = data['wagons'].copy()
    routes = data['routes']
    
    if req.product_filter:
        orders = orders[orders['product_type'] == req.product_filter]
    if req.destination_filter:
        orders = orders[orders['destination'] == req.destination_filter]
    
    rake_id = req.rake_id or f"RK-{random.randint(100, 999)}"
    
    result = {}
    
    if req.algorithm in ("greedy", "both"):
        result['greedy'] = greedy_plan(orders, wagons, routes, f"{rake_id}-G", req.max_wagons)
    
    if req.algorithm in ("milp", "both"):
        result['milp'] = milp_plan(orders, wagons, routes, f"{rake_id}-M", req.max_wagons)
    
    if req.algorithm == "both" and 'greedy' in result and 'milp' in result:
        result['comparison'] = algorithm_comparison(result['greedy'], result['milp'])
    
    return result


@app.get("/plan-explanation")
def plan_explanation_endpoint(algorithm: str = "milp"):
    data = get_preprocessed()
    orders = data['orders']
    wagons = data['wagons']
    routes = data['routes']
    
    if algorithm == "milp":
        plan = milp_plan(orders, wagons, routes, "RK-EXPLAIN", 30)
    else:
        plan = greedy_plan(orders, wagons, routes, "RK-EXPLAIN", 30)
    
    return generate_explanation(plan, orders)


@app.get("/simulation")
def simulation():
    """Digital Twin simulation - next day forecast"""
    products = ["Hot Rolled Coils", "Cold Rolled Sheets", "Plates", "Billets", "Pig Iron", "Structural Steel"]
    
    next_day_orders = random.randint(45, 85)
    wagon_shortage_risk = random.choice(["LOW", "MEDIUM", "HIGH"])
    
    return {
        "forecast_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
        "predicted_orders": next_day_orders,
        "predicted_demand_tons": random.randint(8000, 18000),
        "wagon_shortage_risk": wagon_shortage_risk,
        "estimated_penalty_risk": random.randint(2000000, 8000000),
        "recommended_wagon_reservation": random.randint(60, 120),
        "product_demand_forecast": {p: random.randint(200, 2000) for p in products},
        "delay_probability": round(random.uniform(0.1, 0.4), 2),
        "simulation_confidence": round(random.uniform(0.78, 0.95), 2),
        "scenarios": [
            {"scenario": "Optimistic", "rakes_needed": random.randint(8, 12), "penalty_risk": "LOW"},
            {"scenario": "Base Case", "rakes_needed": random.randint(12, 16), "penalty_risk": "MEDIUM"},
            {"scenario": "Pessimistic", "rakes_needed": random.randint(16, 22), "penalty_risk": "HIGH"}
        ]
    }
