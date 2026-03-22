"""
SAIL DSS - Vectorized Preprocessing Pipeline
Fixed: risk threshold adapted to real data range, status mapping corrected
"""
import numpy as np
import pandas as pd


def preprocess_orders(orders_df: pd.DataFrame, compat_df: pd.DataFrame, inventory_df: pd.DataFrame) -> pd.DataFrame:
    df = orders_df.copy()

    df['deadline_days'] = pd.to_numeric(df.get('deadline_days', 7), errors='coerce').fillna(7)
    df['penalty_cost']  = pd.to_numeric(df.get('penalty_cost', 10000), errors='coerce').fillna(10000)
    df['customer_priority'] = pd.to_numeric(df.get('customer_priority', 3), errors='coerce').fillna(3)
    df['quantity_tons'] = pd.to_numeric(df.get('quantity_tons', 50), errors='coerce').fillna(50)

    # Fix status — map CONFIRMED/SHIPPED → meaningful statuses
    status_map = {
        'PENDING': 'PENDING', 'pending': 'PENDING',
        'CONFIRMED': 'PENDING',   # treat confirmed as pending dispatch
        'IN_PROCESS': 'IN_PROCESS', 'PROCESSING': 'IN_PROCESS',
        'SHIPPED': 'DISPATCHED', 'DISPATCHED': 'DISPATCHED',
        'DELIVERED': 'DISPATCHED',
    }
    df['status'] = df['status'].map(status_map).fillna('PENDING')

    # Vectorized urgency score
    dd = df['deadline_days'].clip(lower=0)
    df['urgency_score'] = np.where(dd <= 0,  1.00,
                          np.where(dd <= 2,  0.95,
                          np.where(dd <= 5,  0.75,
                          np.where(dd <= 8,  0.50,
                          np.where(dd <= 12, 0.25, 0.10)))))

    # Normalize penalty against ACTUAL data range (not hardcoded 80000)
    pen_max = df['penalty_cost'].quantile(0.95)   # use 95th percentile as ceiling
    pen_max = max(pen_max, 1)
    penalty_norm = (df['penalty_cost'] / pen_max).clip(upper=1.0)

    priority_norm = (df['customer_priority'] - 1) / 4.0   # normalize 1-5 → 0-1

    df['risk_score'] = (
        0.40 * df['urgency_score'] +
        0.40 * penalty_norm +
        0.20 * priority_norm
    ).round(4)

    # Wagon match score
    compat_counts = compat_df[compat_df['compatible'] == True].groupby('product_type').size()
    compat_map = (compat_counts / 6.0).to_dict()
    df['wagon_match_score'] = df['product_type'].map(compat_map).fillna(0.3).round(4)

    # Loading feasibility
    inv_col = 'available_tons' if 'available_tons' in inventory_df.columns else 'available_quantity_tons'
    prod_col = 'product_type' if 'product_type' in inventory_df.columns else 'product_code'
    inv_by_product = inventory_df.groupby(prod_col)[inv_col].sum().rename('inv_tons')
    df = df.merge(inv_by_product, left_on='product_type', right_index=True, how='left')
    df['inv_tons'] = df['inv_tons'].fillna(500)
    df['loading_feasibility_index'] = (df['inv_tons'] / df['quantity_tons'].clip(lower=1)).clip(upper=1.0).round(4)
    df.drop(columns=['inv_tons'], inplace=True, errors='ignore')

    df['composite_priority'] = (
        0.35 * df['urgency_score'] +
        0.35 * df['risk_score'] +
        0.15 * df['wagon_match_score'] +
        0.15 * df['loading_feasibility_index']
    ).round(4)

    return df


def preprocess_wagons(wagons_df: pd.DataFrame) -> pd.DataFrame:
    df = wagons_df.copy()
    cap_col = 'capacity_tons' if 'capacity_tons' in df.columns else 'wagon_capacity_tons'
    df['capacity_tons'] = pd.to_numeric(df[cap_col], errors='coerce').fillna(55)
    max_cap = df['capacity_tons'].max()
    df['utilization_potential'] = (df['capacity_tons'] / max_cap).round(4)
    df['condition_score'] = pd.to_numeric(df.get('condition_score', 80), errors='coerce').fillna(80)
    df['age_years']       = pd.to_numeric(df.get('age_years', 5),        errors='coerce').fillna(5)
    df['health_score']    = (df['condition_score'] / 100.0).round(4)
    df['age_penalty']     = (1 - df['age_years'] / 30.0).clip(0, 1).round(4)
    return df
