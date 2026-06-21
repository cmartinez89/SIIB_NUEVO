import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed sidebar (w-64) */}
      <Sidebar />

      {/* Main column: offset by sidebar width */}
      <div className="ml-64 flex flex-col min-h-screen">
        {/* Fixed header */}
        <Header />

        {/* Page content: offset by header height (h-16) */}
        <main className="flex-1 pt-16 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
