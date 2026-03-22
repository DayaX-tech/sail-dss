"""
SAIL Bokaro Steel Plant - Data Layer
Loads REAL CSV datasets provided by user and enriches with synthetic scale-up.
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random
import os

np.random.seed(42)
random.seed(42)

CSV_DIR = os.path.join(os.path.dirname(__file__), "csv")

WAGON_TYPES = ["BCNA", "BRN", "BOXN", "BOST", "BTPN", "BCN"]
SIDINGS = ["SID-1", "SID-2", "SID-3", "SID-4", "SID-5", "SID-6"]
STOCKYARDS = ["SY-A", "SY-B", "SY-C", "SY-D", "SY-E"]
INDUSTRY_TYPES = ["Automotive", "Construction", "Manufacturing", "Infrastructure", "Export", "Defence", "Railways"]

PRODUCT_WAGON_COMPAT = {
    "Hot Rolled Coils": ["BCNA", "BOST"],
    "Cold Rolled Sheets": ["BCNA", "BOST", "BTPN"],
    "Plates": ["BRN", "BOST"],
    "Billets": ["BOXN", "BCN", "BRN"],
    "Pig Iron": ["BOXN", "BCN"],
    "Structural Steel": ["BRN", "BCN", "BOXN"],
    "Finished Bundles": ["BCNA", "BTPN", "BCN"],
    "SLAB-A": ["BRN", "BOST"], "SLAB-B": ["BRN", "BOST"],
    "COIL-X": ["BCNA", "BOST"], "COIL-Y": ["BCNA", "BOST", "BTPN"],
    "ROD-1": ["BOXN", "BCN"], "ROD--2": ["BOXN", "BCN"],
    "PLATE-1": ["BRN", "BOST"], "TMT-BAR": ["BOXN", "BCN", "BRN"],
    "WIRE-ROD": ["BCNA", "BTPN"], "HR-COIL": ["BCNA", "BOST"],
}

WAGON_CAPACITY = {"BCNA": 58.0, "BRN": 55.0, "BOXN": 60.0, "BOST": 52.0, "BTPN": 50.0, "BCN": 45.0}

ROUTE_BASE_COST = {
    "Mumbai": 45000, "Delhi": 38000, "Kolkata": 15000, "Chennai": 52000,
    "Hyderabad": 42000, "Pune": 43000, "Ahmedabad": 48000, "vizag": 28000,
    "Jaipur": 40000, "Lucknow": 32000, "Kanpur": 31000, "Nagpur": 35000,
    "Visakhapatnam": 28000, "Bhopal": 33000, "Patna": 18000, "Raipur": 25000,
    "Ranchi": 14000, "Howrah": 16000, "Dhanbad": 12000, "chennai": 52000,
}
ROUTE_DISTANCE = {
    "Mumbai": 1650, "Delhi": 1300, "Kolkata": 280, "Chennai": 1850,
    "Hyderabad": 1450, "Pune": 1600, "Ahmedabad": 1720, "vizag": 780,
    "Jaipur": 1420, "Lucknow": 1050, "Kanpur": 980, "Nagpur": 1120,
    "Visakhapatnam": 780, "Bhopal": 1050, "Patna": 380, "Raipur": 720,
    "Ranchi": 180, "Howrah": 290, "Dhanbad": 150, "chennai": 1850,
}


def _safe_read(filename):
    path = os.path.join(CSV_DIR, filename)
    if os.path.exists(path):
        df = pd.read_csv(path)
        df.columns = df.columns.str.strip()
        return df
    return None


def load_orders():
    df = _safe_read("orders_csv.csv")
    now = datetime.now()
    if df is not None and len(df) > 0:
        df = df.copy()
        df.rename(columns={
            "order_quantity_tons": "quantity_tons",
            "destination_city": "destination",
            "delivery_due_days": "deadline_days",
            "penalty_cost_per_day": "penalty_cost",
            "customer_priority_class": "customer_priority_str",
            "order_status": "status_orig",
        }, inplace=True)
        df["product_type"] = df["product_code"].astype(str)
        # Remap destinations to Indian cities (CSV has random international cities)
        INDIAN_DESTS = ["Mumbai","Delhi","Kolkata","Chennai","Hyderabad","Pune",
                        "Ahmedabad","Jaipur","Lucknow","Kanpur","Nagpur","Bhopal",
                        "Patna","Raipur","Ranchi","Howrah","Dhanbad","vizag",
                        "Visakhapatnam","Ludhiana","Vadodara","Surat","Nashik"]
        import numpy as _np2
        df["destination"] = _np2.random.choice(INDIAN_DESTS, len(df))
        df["deadline_days"] = pd.to_numeric(df["deadline_days"], errors="coerce").fillna(7).astype(int)
        df["penalty_cost"] = pd.to_numeric(df["penalty_cost"], errors="coerce").fillna(10000).astype(int)
        df["quantity_tons"] = pd.to_numeric(df["quantity_tons"], errors="coerce").fillna(50).round(2)
        priority_map = {"High": 5, "Medium": 3, "Low": 1}
        df["customer_priority"] = df["customer_priority_str"].map(priority_map).fillna(3).astype(int)
        df["deadline"] = pd.to_datetime("today") + pd.to_timedelta(df["deadline_days"], unit="D")
        df["deadline"] = df["deadline"].dt.strftime("%Y-%m-%d")
        df["urgency_score"] = (df["penalty_cost"] / df["deadline_days"].clip(lower=1)).round(4)
        df["status"] = df["status_orig"].apply(
            lambda x: "PENDING" if str(x).lower() in ["pending","nan"] else str(x).upper()
        )
        df["stockyard"] = np.random.choice(STOCKYARDS, len(df))
        # Scale up to 20k using vectorized repeat
        base = len(df)
        # Realistic: keep 500 real orders — matches actual Bokaro weekly order book
        # No scale-up to avoid fake crore values on dashboard
        df["order_id"] = [f"ORD-{i+1:05d}" for i in range(len(df))]
        return df
    return _synthetic_orders(20000)


def load_wagons():
    df = _safe_read("wagons_csv.csv")
    if df is not None and len(df) > 0:
        df = df.copy()
        df["wagon_capacity_tons"] = pd.to_numeric(df["wagon_capacity_tons"], errors="coerce").fillna(55)
        df["availability_status"] = df["wagon_status"].apply(
            lambda x: "AVAILABLE" if str(x).lower() == "available"
            else ("IN_USE" if str(x).lower() == "assigned" else "MAINTENANCE")
        )
        df["location"] = df["current_location"].fillna("SY-A").astype(str)
        rng = np.random.default_rng(42)
        df["last_maintenance"] = [(datetime.now() - timedelta(days=int(d))).strftime("%Y-%m-%d") for d in rng.integers(1, 91, len(df))]
        df["age_years"] = rng.uniform(0.5, 20, len(df)).round(1)
        df["condition_score"] = rng.uniform(65, 100, len(df)).round(1)
        df["rake_assignment"] = None
        # Keep real 500 wagons — realistic for Bokaro plant
        df["wagon_id"] = [f"WGN-{i+1:04d}" for i in range(len(df))]
        return df.head(500)
    return _synthetic_wagons(500)


def load_rakes():
    df = _safe_read("rakes_csv.csv")
    if df is not None and len(df) > 0:
        df = df.copy()
        df.rename(columns={"availability_status": "status", "total_wagons": "max_wagons"}, inplace=True)
        df["status"] = df["status"].apply(
            lambda x: "READY" if str(x).lower() == "available"
            else ("DISPATCHED" if str(x).lower() == "assigned" else str(x).upper())
        )
        df["max_wagons"] = pd.to_numeric(df["max_wagons"], errors="coerce").fillna(50).astype(int)
        rng = np.random.default_rng(42)
        df["readiness_time"] = rng.integers(2, 9, len(df))
        df["current_wagons"] = [rng.integers(0, int(m)+1) for m in df["max_wagons"]]
        df["formation_siding"] = rng.choice(SIDINGS, len(df))
        df["loco_assigned"] = rng.choice([True, False], len(df))
        df["target_destination"] = rng.choice(list(ROUTE_DISTANCE.keys()), len(df))
        return df
    return _synthetic_rakes(150)


def load_inventory():
    df = _safe_read("inventory_csv.csv")
    if df is not None and len(df) > 0:
        df = df.copy()
        df.rename(columns={
            "location_name": "stockyard",
            "available_quantity_tons": "available_tons",
            "reserved_quantity_tons": "reserved_tons",
            "product_code": "product_type",
        }, inplace=True)
        df["available_tons"] = pd.to_numeric(df["available_tons"], errors="coerce").fillna(100)
        df["reserved_tons"] = pd.to_numeric(df["reserved_tons"], errors="coerce").fillna(0)
        df["last_updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return df
    return _synthetic_inventory()


def load_routes():
    df = _safe_read("routes_csv.csv")
    if df is not None and len(df) > 0:
        df = df.copy()
        df.rename(columns={
            "destination_city": "destination",
            "route_distance_km": "distance_km",
            "rail_freight_cost_per_ton": "freight_cost_per_wagon",
        }, inplace=True)
        df["distance_km"] = pd.to_numeric(df["distance_km"], errors="coerce").fillna(500)
        df["freight_cost_per_wagon"] = pd.to_numeric(df["freight_cost_per_wagon"], errors="coerce").fillna(30000)
        df["transit_days"] = (df["distance_km"] / 400).apply(lambda x: max(1, int(x)))
        df["origin"] = "Bokaro"
        df["zone"] = df["distance_km"].apply(lambda d: "Eastern" if d < 500 else ("Central" if d < 1000 else "Western/Southern"))
        return df
    return _synthetic_routes()


# ── Vectorized synthetics ────────────────────────────────────────────────────

def _synthetic_orders(n=20000):
    rng = np.random.default_rng(42)
    products = list(PRODUCT_WAGON_COMPAT.keys())
    destinations = list(ROUTE_DISTANCE.keys())
    dd = rng.integers(1, 16, n)
    pc = rng.integers(5000, 80001, n)
    return pd.DataFrame({
        "order_id": [f"ORD-{i+1:05d}" for i in range(n)],
        "customer_id": [f"CUST-{int(rng.integers(1,801)):04d}" for _ in range(n)],
        "product_type": rng.choice(products, n),
        "quantity_tons": rng.uniform(20, 500, n).round(2),
        "destination": rng.choice(destinations, n),
        "deadline": [(datetime.now()+timedelta(days=int(d))).strftime("%Y-%m-%d") for d in dd],
        "deadline_days": dd,
        "penalty_cost": pc,
        "customer_priority": rng.integers(1, 6, n),
        "order_date": [(datetime.now()-timedelta(days=int(d))).strftime("%Y-%m-%d") for d in rng.integers(1,31,n)],
        "status": rng.choice(["PENDING","PENDING","PENDING","IN_PROCESS","DISPATCHED"], n),
        "stockyard": rng.choice(STOCKYARDS, n),
        "urgency_score": (pc / dd.clip(1)).round(4),
    })


def _synthetic_wagons(n=2500):
    rng = np.random.default_rng(42)
    wtypes = rng.choice(WAGON_TYPES, n)
    caps = np.array([WAGON_CAPACITY.get(w, 55) for w in wtypes]) + rng.uniform(-2, 2, n)
    return pd.DataFrame({
        "wagon_id": [f"WGN-{i+1:04d}" for i in range(n)],
        "wagon_type": wtypes,
        "wagon_capacity_tons": caps.round(2),
        "availability_status": rng.choice(["AVAILABLE","AVAILABLE","AVAILABLE","IN_USE","MAINTENANCE","TRANSIT"], n),
        "location": rng.choice(SIDINGS + STOCKYARDS, n),
        "last_maintenance": [(datetime.now()-timedelta(days=int(d))).strftime("%Y-%m-%d") for d in rng.integers(1,181,n)],
        "age_years": rng.uniform(0.5, 25, n).round(1),
        "rake_assignment": [None]*n,
        "condition_score": rng.uniform(60, 100, n).round(1),
    })


def _synthetic_rakes(n=150):
    rng = np.random.default_rng(42)
    mw = rng.choice([40,45,50,55,58], n)
    return pd.DataFrame({
        "rake_id": [f"RK-{i+1:03d}" for i in range(n)],
        "max_wagons": mw,
        "readiness_time": rng.integers(2,9,n),
        "status": rng.choice(["READY","READY","FORMING","DISPATCHED","MAINTENANCE"], n),
        "current_wagons": [int(rng.integers(0,int(m)+1)) for m in mw],
        "formation_siding": rng.choice(SIDINGS, n),
        "loco_assigned": rng.choice([True,False], n),
        "target_destination": rng.choice(list(ROUTE_DISTANCE.keys()), n),
    })


def _synthetic_inventory():
    rng = np.random.default_rng(42)
    rows = [(sy, prod, round(float(rng.uniform(100,5000)),2), round(float(rng.uniform(0,500)),2),
             f"{sy}-{prod[:3].upper()}", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            for sy in STOCKYARDS for prod in list(PRODUCT_WAGON_COMPAT.keys())]
    return pd.DataFrame(rows, columns=["stockyard","product_type","available_tons","reserved_tons","location_code","last_updated"])


def _synthetic_routes():
    return pd.DataFrame([{
        "origin":"Bokaro","destination":dest,"distance_km":dist,
        "freight_cost_per_wagon":ROUTE_BASE_COST.get(dest,30000),
        "transit_days":max(1,dist//400),
        "zone":"Eastern" if dist<500 else ("Central" if dist<1000 else "Western/Southern"),
    } for dest,dist in ROUTE_DISTANCE.items()])


def generate_compatibility_matrix():
    rng = np.random.default_rng(42)
    rows = []
    for prod, wlist in PRODUCT_WAGON_COMPAT.items():
        for wtype in WAGON_TYPES:
            c = wtype in wlist
            rows.append({"product_type":prod,"wagon_type":wtype,"compatible":c,
                         "load_efficiency":round(float(rng.uniform(0.85,1.0)),2) if c else 0.0,
                         "special_requirements":"Coil cradles" if "Coil" in prod and c else None})
    return pd.DataFrame(rows)


def generate_loading_points():
    rng = np.random.default_rng(42)
    return pd.DataFrame([{
        "siding_id":sid,"capacity_wagons_per_day":int(rng.integers(20,81)),
        "queue_time_hours":round(float(rng.uniform(0.5,4.0)),1),
        "current_queue":int(rng.integers(0,16)),
        "status":rng.choice(["OPERATIONAL","OPERATIONAL","MAINTENANCE","FULL"]),
        "crane_count":int(rng.integers(1,5)),"shift_capacity":int(rng.integers(8,26)),
    } for sid in SIDINGS])


_data_cache = None

def get_data():
    global _data_cache
    if _data_cache is None:
        customers_df = _safe_read("customers_csv.csv")
        if customers_df is None:
            customers_df = pd.DataFrame()
        orders_df = load_orders()
        # Auto-join customer_email and customer_name into orders from customers CSV
        if not customers_df.empty and "customer_id" in customers_df.columns:
            if "customer_email" in customers_df.columns:
                email_map = customers_df.set_index("customer_id")["customer_email"].to_dict()
                orders_df["customer_email"] = orders_df["customer_id"].map(email_map).fillna("")
            if "customer_name" in customers_df.columns:
                name_map = customers_df.set_index("customer_id")["customer_name"].to_dict()
                orders_df["customer_name"] = orders_df["customer_id"].map(name_map).fillna(
                    orders_df.get("customer_name", pd.Series([""] * len(orders_df)))
                )
        _data_cache = {
            "customers": customers_df,
            "orders":    orders_df,
            "wagons":    load_wagons(),
            "rakes":     load_rakes(),
            "inventory": load_inventory(),
            "routes":    load_routes(),
            "loading_points":   generate_loading_points(),
            "compatibility":    generate_compatibility_matrix(),
            "wagon_capacity":   WAGON_CAPACITY,
            "product_wagon_compat": PRODUCT_WAGON_COMPAT,
        }
    return _data_cache