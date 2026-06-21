import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/auth/Login'
import Dashboard from '@/pages/Dashboard'

// ─── Protected Route ────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ─── Placeholder Page ────────────────────────────────────────────────────────
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
        <p className="text-gray-500">Módulo en desarrollo</p>
      </div>
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Nómina */}
        <Route path="/nomina" element={<PlaceholderPage title="Nómina" />} />
        <Route path="/nomina/prenomina" element={<PlaceholderPage title="Pre-Nómina" />} />
        <Route path="/nomina/recibos" element={<PlaceholderPage title="Recibos" />} />
        <Route path="/nomina/checador" element={<PlaceholderPage title="Checador" />} />
        <Route path="/nomina/tef" element={<PlaceholderPage title="TEF" />} />
        <Route path="/nomina/vacaciones" element={<PlaceholderPage title="Vacaciones" />} />

        {/* RR.HH. */}
        <Route path="/rrhh/empleados" element={<PlaceholderPage title="Empleados" />} />
        <Route path="/rrhh/puestos" element={<PlaceholderPage title="Puestos" />} />
        <Route path="/rrhh/departamentos" element={<PlaceholderPage title="Departamentos" />} />

        {/* Compras */}
        <Route path="/compras/requisiciones" element={<PlaceholderPage title="Requisiciones" />} />
        <Route path="/compras/cotizaciones" element={<PlaceholderPage title="Cotizaciones" />} />
        <Route path="/compras/ordenes" element={<PlaceholderPage title="Órdenes de Compra" />} />
        <Route path="/compras/proveedores" element={<PlaceholderPage title="Proveedores" />} />

        {/* Almacén */}
        <Route path="/almacen/inventario" element={<PlaceholderPage title="Inventario" />} />
        <Route path="/almacen/articulos" element={<PlaceholderPage title="Artículos" />} />
        <Route path="/almacen/movimientos" element={<PlaceholderPage title="Movimientos" />} />
        <Route path="/almacen/solicitudes" element={<PlaceholderPage title="Solicitudes de Almacén" />} />

        {/* Alimentación */}
        <Route path="/alimentacion/dietas" element={<PlaceholderPage title="Dietas" />} />
        <Route path="/alimentacion/forrajes" element={<PlaceholderPage title="Forrajes" />} />
        <Route path="/alimentacion/programas" element={<PlaceholderPage title="Programas de Alimentación" />} />

        {/* Informática Bovina */}
        <Route path="/informatica/animales" element={<PlaceholderPage title="Animales" />} />
        <Route path="/informatica/lotes" element={<PlaceholderPage title="Lotes" />} />
        <Route path="/informatica/partos" element={<PlaceholderPage title="Partos" />} />

        {/* Báscula */}
        <Route path="/bascula/fichas" element={<PlaceholderPage title="Fichas de Báscula" />} />
        <Route path="/bascula/movimientos" element={<PlaceholderPage title="Movimientos de Báscula" />} />

        {/* Leche */}
        <Route path="/leche/envios" element={<PlaceholderPage title="Envíos de Leche" />} />
        <Route path="/leche/programacion" element={<PlaceholderPage title="Programación de Leche" />} />

        {/* Contabilidad */}
        <Route path="/contabilidad/solicitudes" element={<PlaceholderPage title="Solicitudes de Pago" />} />
        <Route path="/contabilidad/presupuestos" element={<PlaceholderPage title="Presupuestos" />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
