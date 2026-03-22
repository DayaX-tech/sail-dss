"""
SAIL DSS — Route Consolidation Engine
Finds shortest multi-stop routes and consolidates orders
to maximize rake utilization. Real Indian Railways corridors.
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Tuple

# ── Real Indian Railways main corridors from Bokaro ──────────────────────────
# Each corridor is ordered by distance from Bokaro (shortest to furthest)
# Train stops at each city in order — no backtracking

CORRIDORS = {
    "Eastern Corridor (ECR)": {
        "zone": "ECR",
        "stops": ["Dhanbad", "Howrah", "Durgapur", "Asansol", "Patna", "Varanasi", "Allahabad", "Lucknow", "Kanpur"],
        "distances": {"Dhanbad":150, "Howrah":290, "Durgapur":310, "Asansol":320, "Patna":380,
                      "Varanasi":680, "Allahabad":750, "Lucknow":1050, "Kanpur":980},
        "color": "#3B8BD4"
    },
    "South Eastern Corridor (SER)": {
        "zone": "SER",
        "stops": ["Jamshedpur", "Rourkela", "Bhilai", "Raipur", "Visakhapatnam", "Vijayawada", "Chennai", "Coimbatore", "Madurai"],
        "distances": {"Jamshedpur":120, "Rourkela":390, "Bhilai":680, "Raipur":720,
                      "Visakhapatnam":780, "Vijayawada":920, "Chennai":1850, "Coimbatore":2050, "Madurai":2150},
        "color": "#1D9E75"
    },
    "Central Corridor (CR/WCR)": {
        "zone": "CR",
        "stops": ["Ranchi", "Nagpur", "Bhopal", "Jabalpur", "Kota", "Jaipur", "Delhi", "Meerut", "Faridabad", "Agra", "Gwalior", "Ludhiana"],
        "distances": {"Ranchi":180, "Nagpur":1120, "Bhopal":1050, "Jabalpur":1100,
                      "Kota":1420, "Jaipur":1420, "Delhi":1300, "Meerut":1260,
                      "Faridabad":1320, "Agra":1180, "Gwalior":1200, "Ludhiana":1480},
        "color": "#BA7517"
    },
    "Western Corridor (WR)": {
        "zone": "WR",
        "stops": ["Vadodara", "Surat", "Ahmedabad", "Rajkot", "Pune", "Nashik", "Mumbai", "Jodhpur"],
        "distances": {"Vadodara":1690, "Surat":1680, "Ahmedabad":1720, "Rajkot":1820,
                      "Pune":1600, "Nashik":1580, "Mumbai":1650, "Jodhpur":1650},
        "color": "#9F4AB7"
    },
    "Hyderabad Corridor (SCR)": {
        "zone": "SCR",
        "stops": ["Hyderabad"],
        "distances": {"Hyderabad":1450},
        "color": "#D85A30"
    },
}

# Build reverse lookup: city → corridor
CITY_TO_CORRIDOR = {}
for corr_name, corr_data in CORRIDORS.items():
    for city in corr_data["stops"]:
        CITY_TO_CORRIDOR[city] = corr_name


def get_corridor(city: str) -> str:
    """Return corridor name for a destination city."""
    return CITY_TO_CORRIDOR.get(city, "Unknown")


def get_distance(city: str) -> int:
    """Return distance from Bokaro to city in km."""
    for corr in CORRIDORS.values():
        if city in corr["distances"]:
            return corr["distances"][city]
    return 1000  # fallback


def consolidate_orders(orders_df: pd.DataFrame, max_wagon_capacity: float = 55.0,
                       wagons_per_rake: int = 50) -> List[Dict]:
    """
    Groups orders by corridor, then by wagon type compatibility.
    Fills each rake to maximum capacity with orders on the same route.
    Returns list of consolidated rake plans.
    """
    if orders_df.empty:
        return []

    rake_capacity_tons = max_wagon_capacity * wagons_per_rake

    # Normalize fields
    df = orders_df.copy()
    dest_col = next((c for c in ["destination","destination_city"] if c in df.columns), None)
    qty_col  = next((c for c in ["quantity_tons","order_quantity_tons"] if c in df.columns), None)
    pen_col  = next((c for c in ["penalty_cost","penalty_cost_per_day"] if c in df.columns), None)
    prod_col = next((c for c in ["product_type","product_code"] if c in df.columns), None)

    if not all([dest_col, qty_col, prod_col]):
        return []

    df["_dest"]    = df[dest_col].astype(str)
    df["_qty"]     = pd.to_numeric(df[qty_col], errors="coerce").fillna(50)
    df["_penalty"] = pd.to_numeric(df[pen_col], errors="coerce").fillna(5000) if pen_col else 5000
    df["_product"] = df[prod_col].astype(str)
    df["_corridor"]= df["_dest"].map(lambda c: get_corridor(c))
    df["_dist"]    = df["_dest"].map(lambda c: get_distance(c))
    df["_urgency"] = (df["_penalty"] / df["_dist"].clip(lower=1)).round(2)

    # Sort by urgency DESC (highest penalty per km first — greedy)
    df = df.sort_values("_urgency", ascending=False)

    consolidated = []
    used_orders  = set()
    rake_num     = 1

    for corridor_name, corr_data in CORRIDORS.items():
        corr_orders = df[
            (df["_corridor"] == corridor_name) &
            (~df.index.isin(used_orders))
        ]
        if corr_orders.empty:
            continue

        # Within corridor, group by compatible wagon type
        remaining = corr_orders.copy()
        while len(remaining) > 0 and len(remaining[~remaining.index.isin(used_orders)]) > 0:
            remaining = remaining[~remaining.index.isin(used_orders)]
            if remaining.empty:
                break

            # Pick anchor order (highest urgency remaining)
            anchor = remaining.iloc[0]
            anchor_product = anchor["_product"]

            # Find compatible wagon type for this product
            from engines.optimizer import PRODUCT_WAGON_COMPAT
            wagon_type = _get_wagon_type(anchor_product, PRODUCT_WAGON_COMPAT)

            # Find orders with same wagon type compatibility on same corridor
            compatible_orders = remaining[
                remaining["_product"].map(lambda p: _get_wagon_type(p, PRODUCT_WAGON_COMPAT)) == wagon_type
            ]

            # Sort stops by distance (train visits in order)
            stop_order = {city: i for i, city in enumerate(corr_data["stops"])}
            compatible_orders = compatible_orders.copy()
            compatible_orders["_stop_order"] = compatible_orders["_dest"].map(
                lambda c: stop_order.get(c, 99)
            )
            compatible_orders = compatible_orders.sort_values(["_stop_order", "_urgency"],
                                                               ascending=[True, False])

            # Fill rake greedily up to capacity
            rake_orders   = []
            total_tons    = 0.0
            total_penalty = 0

            for idx, order in compatible_orders.iterrows():
                if total_tons >= rake_capacity_tons * 0.95:
                    break
                remaining_cap = rake_capacity_tons - total_tons
                load_tons     = min(order["_qty"], remaining_cap)
                if load_tons < 5:
                    continue

                rake_orders.append({
                    "order_id":      str(order.get("order_id", idx)),
                    "customer_name": str(order.get("customer_name", order.get("customer_id", "?"))),
                    "customer_email":str(order.get("customer_email", "")),
                    "product":       anchor_product,
                    "destination":   order["_dest"],
                    "distance_km":   int(order["_dist"]),
                    "quantity_tons": round(float(order["_qty"]), 1),
                    "loaded_tons":   round(load_tons, 1),
                    "penalty_per_day": int(order["_penalty"]),
                    "corridor_stop": int(order["_stop_order"]),
                })
                total_tons    += load_tons
                total_penalty += int(order["_penalty"])
                used_orders.add(idx)

            if not rake_orders:
                # Mark first order as used to prevent infinite loop
                used_orders.add(compatible_orders.index[0])
                continue

            # Calculate route stops actually used
            route_stops = sorted(
                list({o["destination"] for o in rake_orders}),
                key=lambda c: stop_order.get(c, 99)
            )

            # Wagons needed
            wagons_needed = max(1, int(np.ceil(total_tons / max_wagon_capacity)))
            utilization   = round(total_tons / (wagons_needed * max_wagon_capacity) * 100, 1)

            consolidated.append({
                "rake_id":          f"RK-{rake_num:03d}",
                "rake_num":         rake_num,
                "corridor":         corridor_name,
                "corridor_color":   corr_data["color"],
                "wagon_type":       wagon_type,
                "wagons_needed":    wagons_needed,
                "total_capacity_tons": round(wagons_needed * max_wagon_capacity, 1),
                "total_loaded_tons":round(total_tons, 1),
                "utilization_pct":  utilization,
                "total_penalty_saved": total_penalty,
                "orders_count":     len(rake_orders),
                "route_stops":      route_stops,
                "total_distance_km":max((o["distance_km"] for o in rake_orders), default=0),
                "orders":           rake_orders,
                "zone":             corr_data["zone"],
                "freight_cost_estimate": int(total_tons * max(o["distance_km"] for o in rake_orders) * 0.9 / 1000) * 1000,
            })
            rake_num += 1

    return consolidated


def _get_wagon_type(product: str, compat_map: dict) -> str:
    """Get primary wagon type for a product."""
    types = compat_map.get(product, [])
    if types:
        return types[0]
    # Partial match
    for key, types in compat_map.items():
        if key.upper() in product.upper() or product.upper() in key.upper():
            return types[0] if types else "BOXN"
    return "BOXN"  # default
