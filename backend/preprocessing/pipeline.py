"""
SAIL DSS - Data Preprocessing Pipeline
Feature engineering and scoring for orders
"""
import numpy as np
import pandas as pd
from datetime import datetime


def compute_urgency_score(deadline_days: int) -> float:
    """Higher score = more urgent"""
    if deadline_days <= 0:
        return 1.0
    elif deadline_days <= 2:
        return 0.95
    elif deadline_days <= 5:
        return 0.75
    elif deadline_days <= 8:
        return 0.5
    elif deadline_days <= 12:
        return 0.25
    else:
        return 0.1


def compute_risk_score(penalty_cost: float, deadline_days: int, customer_priority: int) -> float:
    penalty_norm = min(penalty_cost / 80000, 1.0)
    urgency = compute_urgency_score(deadline_days)
    priority_norm = customer_priority / 5.0
    return round(0.4 * urgency + 0.4 * penalty_norm + 0.2 * priority_norm, 4)


def compute_wagon_match_score(product_type: str, compat_df: pd.DataFrame) -> float:
    available = compat_df[(compat_df['product_type'] == product_type) & (compat_df['compatible'] == True)]
    return round(len(available) / 6.0, 4)


def compute_loading_feasibility(product_type: str, quantity_tons: float, inventory_df: pd.DataFrame) -> float:
    inv = inventory_df[inventory_df['product_type'] == product_type]['available_tons'].sum()
    if inv <= 0:
        return 0.0
    return min(inv / max(quantity_tons, 1), 1.0)


def preprocess_orders(orders_df: pd.DataFrame, compat_df: pd.DataFrame, inventory_df: pd.DataFrame) -> pd.DataFrame:
    df = orders_df.copy()
    
    # Fill missing values
    df['deadline_days'] = df['deadline_days'].fillna(7)
    df['penalty_cost'] = df['penalty_cost'].fillna(df['penalty_cost'].median())
    df['customer_priority'] = df['customer_priority'].fillna(3)
    
    # Feature engineering
    df['urgency_score'] = df['deadline_days'].apply(compute_urgency_score)
    df['risk_score'] = df.apply(
        lambda r: compute_risk_score(r['penalty_cost'], r['deadline_days'], r['customer_priority']), axis=1
    )
    df['wagon_match_score'] = df['product_type'].apply(
        lambda p: compute_wagon_match_score(p, compat_df)
    )
    df['loading_feasibility_index'] = df.apply(
        lambda r: compute_loading_feasibility(r['product_type'], r['quantity_tons'], inventory_df), axis=1
    )
    df['composite_priority'] = (
        0.35 * df['urgency_score'] +
        0.35 * df['risk_score'] +
        0.15 * df['wagon_match_score'] +
        0.15 * df['loading_feasibility_index']
    ).round(4)
    
    return df


def preprocess_wagons(wagons_df: pd.DataFrame) -> pd.DataFrame:
    df = wagons_df.copy()
    df['utilization_potential'] = df['capacity_tons'] / df['capacity_tons'].max()
    df['health_score'] = (df['condition_score'] / 100.0).round(4)
    df['age_penalty'] = (1 - df['age_years'] / 30.0).clip(0, 1).round(4)
    return df
