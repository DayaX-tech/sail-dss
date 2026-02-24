"""
SAIL Bokaro Steel Plant - Industrial Data Generator
Generates realistic large-scale operational simulation data
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random
import json

np.random.seed(42)
random.seed(42)

PRODUCTS = ["Hot Rolled Coils", "Cold Rolled Sheets", "Plates", "Billets", "Pig Iron", "Structural Steel", "Finished Bundles"]
WAGON_TYPES = ["BCNA", "BRN", "BOXN", "BOST", "BTPN", "BCN"]
DESTINATIONS = [
    "Mumbai", "Delhi", "Kolkata", "Chennai", "Hyderabad", "Pune", "Ahmedabad",
    "Surat", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Visakhapatnam", "Bhopal",
    "Patna", "Ludhiana", "Agra", "Vadodara", "Nashik", "Faridabad",
    "Meerut", "Rajkot", "Kalyan", "Vasai", "Varanasi", "Srinagar",
    "Aurangabad", "Dhanbad", "Amritsar", "Allahabad", "Ranchi", "Howrah",
    "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai",
    "Raipur", "Kota"
]
STOCKYARDS = ["SY-A", "SY-B", "SY-C", "SY-D", "SY-E"]
SIDINGS = ["SID-1", "SID-2", "SID-3", "SID-4", "SID-5", "SID-6"]
INDUSTRY_TYPES = ["Automotive", "Construction", "Manufacturing", "Infrastructure", "Export", "Defence", "Railways"]

PRODUCT_WAGON_COMPAT = {
    "Hot Rolled Coils": ["BCNA", "BOST"],
    "Cold Rolled Sheets": ["BCNA", "BOST", "BTPN"],
    "Plates": ["BRN", "BOST"],
    "Billets": ["BOXN", "BCN", "BRN"],
    "Pig Iron": ["BOXN", "BCN"],
    "Structural Steel": ["BRN", "BCN", "BOXN"],
    "Finished Bundles": ["BCNA", "BTPN", "BCN"]
}

WAGON_CAPACITY = {
    "BCNA": 58.0,
    "BRN": 55.0,
    "BOXN": 60.0,
    "BOST": 52.0,
    "BTPN": 50.0,
    "BCN": 45.0
}

ROUTE_BASE_COST = {
    "Mumbai": 45000, "Delhi": 38000, "Kolkata": 15000, "Chennai": 52000,
    "Hyderabad": 42000, "Pune": 43000, "Ahmedabad": 48000, "Surat": 46000,
    "Jaipur": 40000, "Lucknow": 32000, "Kanpur": 31000, "Nagpur": 35000,
    "Visakhapatnam": 28000, "Bhopal": 33000, "Patna": 18000, "Ludhiana": 42000,
    "Agra": 36000, "Vadodara": 47000, "Nashik": 44000, "Faridabad": 39000,
    "Meerut": 37000, "Rajkot": 49000, "Kalyan": 44000, "Vasai": 44000,
    "Varanasi": 25000, "Srinagar": 55000, "Aurangabad": 43000, "Dhanbad": 12000,
    "Amritsar": 43000, "Allahabad": 27000, "Ranchi": 14000, "Howrah": 16000,
    "Coimbatore": 55000, "Jabalpur": 34000, "Gwalior": 37000, "Vijayawada": 30000,
    "Jodhpur": 47000, "Madurai": 56000, "Raipur": 25000, "Kota": 41000
}

ROUTE_DISTANCE = {
    "Mumbai": 1650, "Delhi": 1300, "Kolkata": 280, "Chennai": 1850,
    "Hyderabad": 1450, "Pune": 1600, "Ahmedabad": 1720, "Surat": 1680,
    "Jaipur": 1420, "Lucknow": 1050, "Kanpur": 980, "Nagpur": 1120,
    "Visakhapatnam": 780, "Bhopal": 1050, "Patna": 380, "Ludhiana": 1480,
    "Agra": 1180, "Vadodara": 1690, "Nashik": 1580, "Faridabad": 1320,
    "Meerut": 1260, "Rajkot": 1820, "Kalyan": 1640, "Vasai": 1640,
    "Varanasi": 680, "Srinagar": 2100, "Aurangabad": 1520, "Dhanbad": 150,
    "Amritsar": 1550, "Allahabad": 750, "Ranchi": 180, "Howrah": 290,
    "Coimbatore": 2050, "Jabalpur": 1100, "Gwalior": 1200, "Vijayawada": 920,
    "Jodhpur": 1650, "Madurai": 2150, "Raipur": 720, "Kota": 1420
}

def generate_customers(n=800):
    customers = []
    for i in range(n):
        customers.append({
            "customer_id": f"CUST-{i+1:04d}",
            "customer_name": f"Customer {i+1}",
            "contract_priority": random.choice([1, 2, 3, 4, 5]),
            "industry_type": random.choice(INDUSTRY_TYPES),
            "destination": random.choice(DESTINATIONS),
            "credit_limit": random.randint(5000000, 50000000),
            "outstanding_dues": random.randint(0, 2000000)
        })
    return pd.DataFrame(customers)

def generate_orders(n=20000, customers_df=None):
    orders = []
    now = datetime.now()
    customer_ids = customers_df["customer_id"].tolist() if customers_df is not None else [f"CUST-{i:04d}" for i in range(1, 801)]
    
    for i in range(n):
        product = random.choice(PRODUCTS)
        destination = random.choice(DESTINATIONS)
        qty = round(random.uniform(20, 500), 2)
        deadline_days = random.randint(1, 15)
        deadline = now + timedelta(days=deadline_days)
        urgency = max(0, 10 - deadline_days) / 10
        penalty_per_day = random.randint(5000, 80000)
        
        orders.append({
            "order_id": f"ORD-{i+1:05d}",
            "customer_id": random.choice(customer_ids),
            "product_type": product,
            "quantity_tons": qty,
            "destination": destination,
            "deadline": deadline.strftime("%Y-%m-%d"),
            "deadline_days": deadline_days,
            "penalty_cost": penalty_per_day,
            "customer_priority": random.choice([1, 2, 3, 4, 5]),
            "order_date": (now - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
            "status": random.choice(["PENDING", "PENDING", "PENDING", "IN_PROCESS", "DISPATCHED"]),
            "stockyard": random.choice(STOCKYARDS)
        })
    return pd.DataFrame(orders)

def generate_wagons(n=2500):
    wagons = []
    locations = SIDINGS + STOCKYARDS
    for i in range(n):
        wtype = random.choice(WAGON_TYPES)
        wagons.append({
            "wagon_id": f"WGN-{i+1:04d}",
            "wagon_type": wtype,
            "capacity_tons": WAGON_CAPACITY[wtype] + random.uniform(-2, 2),
            "availability_status": random.choice(["AVAILABLE", "AVAILABLE", "AVAILABLE", "IN_USE", "MAINTENANCE", "TRANSIT"]),
            "location": random.choice(locations),
            "last_maintenance": (datetime.now() - timedelta(days=random.randint(1, 180))).strftime("%Y-%m-%d"),
            "age_years": round(random.uniform(0.5, 25), 1),
            "rake_assignment": None,
            "condition_score": round(random.uniform(60, 100), 1)
        })
    return pd.DataFrame(wagons)

def generate_rakes(n=150):
    rakes = []
    for i in range(n):
        max_wagons = random.choice([40, 45, 50, 55, 58])
        rakes.append({
            "rake_id": f"RK-{i+1:03d}",
            "max_wagons": max_wagons,
            "readiness_time": random.randint(2, 8),
            "status": random.choice(["READY", "READY", "FORMING", "DISPATCHED", "MAINTENANCE"]),
            "current_wagons": random.randint(0, max_wagons),
            "formation_siding": random.choice(SIDINGS),
            "loco_assigned": random.choice([True, False]),
            "target_destination": random.choice(DESTINATIONS + [None])
        })
    return pd.DataFrame(rakes)

def generate_inventory():
    inventory = []
    for sy in STOCKYARDS:
        for prod in PRODUCTS:
            inventory.append({
                "stockyard": sy,
                "product_type": prod,
                "available_tons": round(random.uniform(100, 5000), 2),
                "reserved_tons": round(random.uniform(0, 500), 2),
                "location_code": f"{sy}-{prod[:3].upper()}",
                "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
    return pd.DataFrame(inventory)

def generate_routes():
    routes = []
    for dest, dist in ROUTE_DISTANCE.items():
        routes.append({
            "origin": "Bokaro",
            "destination": dest,
            "distance_km": dist,
            "freight_cost_per_wagon": ROUTE_BASE_COST.get(dest, 30000),
            "transit_days": max(1, dist // 400),
            "zone": "Eastern" if dist < 500 else ("Central" if dist < 1000 else "Western/Southern")
        })
    return pd.DataFrame(routes)

def generate_loading_points():
    lp = []
    for sid in SIDINGS:
        lp.append({
            "siding_id": sid,
            "capacity_wagons_per_day": random.randint(20, 80),
            "queue_time_hours": round(random.uniform(0.5, 4.0), 1),
            "current_queue": random.randint(0, 15),
            "status": random.choice(["OPERATIONAL", "OPERATIONAL", "MAINTENANCE", "FULL"]),
            "crane_count": random.randint(1, 4),
            "shift_capacity": random.randint(8, 25)
        })
    return pd.DataFrame(lp)

def generate_compatibility_matrix():
    compat = []
    for prod, wagon_list in PRODUCT_WAGON_COMPAT.items():
        for wtype in WAGON_TYPES:
            compat.append({
                "product_type": prod,
                "wagon_type": wtype,
                "compatible": wtype in wagon_list,
                "load_efficiency": round(random.uniform(0.85, 1.0), 2) if wtype in wagon_list else 0.0,
                "special_requirements": "Coil cradles" if prod == "Hot Rolled Coils" and wtype in wagon_list else None
            })
    return pd.DataFrame(compat)

def load_all_data():
    customers = generate_customers(800)
    orders = generate_orders(20000, customers)
    wagons = generate_wagons(2500)
    rakes = generate_rakes(150)
    inventory = generate_inventory()
    routes = generate_routes()
    loading_points = generate_loading_points()
    compatibility = generate_compatibility_matrix()
    
    return {
        "customers": customers,
        "orders": orders,
        "wagons": wagons,
        "rakes": rakes,
        "inventory": inventory,
        "routes": routes,
        "loading_points": loading_points,
        "compatibility": compatibility,
        "wagon_capacity": WAGON_CAPACITY,
        "product_wagon_compat": PRODUCT_WAGON_COMPAT
    }

# Singleton data store
_data_cache = None

def get_data():
    global _data_cache
    if _data_cache is None:
        _data_cache = load_all_data()
    return _data_cache
