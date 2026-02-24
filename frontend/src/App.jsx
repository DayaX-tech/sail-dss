import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './layouts/Sidebar'
import Header from './layouts/Header'
import Dashboard from './pages/Dashboard'
import OrdersPage from './pages/OrdersPage'
import WagonMonitor from './pages/WagonMonitor'
import CompatibilityMatrix from './pages/CompatibilityMatrix'
import RakePlanner from './pages/RakePlanner'
import { CostAnalytics, RiskMonitor, SimulationPage, ComparisonPage, ExplanationPage, HistoricalPage } from './pages/AnalyticsPages'
import { InventoryPage, LoadingScheduler, UtilizationPage, AdminPage } from './pages/OtherPages'

const PAGE_TITLES = {
  '/': 'Command Center',
  '/orders': 'Orders Intelligence',
  '/wagons': 'Wagon Monitor',
  '/compatibility': 'Compatibility Matrix',
  '/inventory': 'Inventory & Stockyard',
  '/rake-planner': 'Rake Planner',
  '/utilization': 'Space Utilization',
  '/comparison': 'Plan Comparison',
  '/cost-analytics': 'Cost & Penalty',
  '/risk-monitor': 'Risk Monitor',
  '/loading-scheduler': 'Loading Scheduler',
  '/explanation': 'AI Explanation',
  '/simulation': 'Digital Twin',
  '/historical': 'Historical Analytics',
  '/admin': 'Admin & Monitor',
}

export default function App() {
  const path = window.location.pathname
  const title = PAGE_TITLES[path] || 'Dashboard'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-5">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/wagons" element={<WagonMonitor />} />
            <Route path="/compatibility" element={<CompatibilityMatrix />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/rake-planner" element={<RakePlanner />} />
            <Route path="/utilization" element={<UtilizationPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/cost-analytics" element={<CostAnalytics />} />
            <Route path="/risk-monitor" element={<RiskMonitor />} />
            <Route path="/loading-scheduler" element={<LoadingScheduler />} />
            <Route path="/explanation" element={<ExplanationPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/historical" element={<HistoricalPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
