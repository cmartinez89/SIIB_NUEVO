import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/auth/Login'
import Dashboard from '@/pages/Dashboard'

// Nómina
import NominaIndex from '@/pages/nomina/NominaIndex'
import PrenominaList from '@/pages/nomina/PrenominaList'
import PrenominaDetalle from '@/pages/nomina/PrenominaDetalle'
import RecibosNomina from '@/pages/nomina/RecibosNomina'
import Checador from '@/pages/nomina/Checador'
import TEF from '@/pages/nomina/TEF'

// RRHH
import EmpleadosList from '@/pages/rrhh/EmpleadosList'
import EmpleadoForm from '@/pages/rrhh/EmpleadoForm'
import EmpleadoDetalle from '@/pages/rrhh/EmpleadoDetalle'

// Compras
import RequisicionesList from '@/pages/compras/RequisicionesList'
import RequisicionForm from '@/pages/compras/RequisicionForm'
import RequisicionDetalle from '@/pages/compras/RequisicionDetalle'
import ProveedoresList from '@/pages/compras/ProveedoresList'
import OrdenesCompra from '@/pages/compras/OrdenesCompra'

// Almacén
import InventarioList from '@/pages/almacen/InventarioList'
import ArticuloForm from '@/pages/almacen/ArticuloForm'
import MovimientosList from '@/pages/almacen/MovimientosList'
import SolicitudesAlmacen from '@/pages/almacen/SolicitudesAlmacen'

// Alimentación
import DietasList from '@/pages/alimentacion/DietasList'
import DietaForm from '@/pages/alimentacion/DietaForm'
import DietaDetalle from '@/pages/alimentacion/DietaDetalle'
import FacturasForraje from '@/pages/alimentacion/FacturasForraje'
import FacturaForrajeForm from '@/pages/alimentacion/FacturaForrajeForm'

// Informática
import AnimalesList from '@/pages/informatica/AnimalesList'
import AnimalForm from '@/pages/informatica/AnimalForm'
import AnimalDetalle from '@/pages/informatica/AnimalDetalle'
import LotesList from '@/pages/informatica/LotesList'
import PartosList from '@/pages/informatica/PartosList'

// Báscula
import FichasBascula from '@/pages/bascula/FichasBascula'
import FichaBasculaForm from '@/pages/bascula/FichaBasculaForm'
import FichaBasculaDetalle from '@/pages/bascula/FichaBasculaDetalle'

// Leche
import EnviosLeche from '@/pages/leche/EnviosLeche'
import EnvioLecheForm from '@/pages/leche/EnvioLecheForm'
import ProgramacionSemanal from '@/pages/leche/ProgramacionSemanal'

// Contabilidad
import SolicitudesPago from '@/pages/contabilidad/SolicitudesPago'
import SolicitudPagoForm from '@/pages/contabilidad/SolicitudPagoForm'
import SolicitudPagoDetalle from '@/pages/contabilidad/SolicitudPagoDetalle'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

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
        <Route path="/nomina" element={<NominaIndex />} />
        <Route path="/nomina/prenomina" element={<PrenominaList />} />
        <Route path="/nomina/prenomina/:id" element={<PrenominaDetalle />} />
        <Route path="/nomina/recibos" element={<RecibosNomina />} />
        <Route path="/nomina/checador" element={<Checador />} />
        <Route path="/nomina/tef" element={<TEF />} />

        {/* RRHH */}
        <Route path="/rrhh/empleados" element={<EmpleadosList />} />
        <Route path="/rrhh/empleados/nuevo" element={<EmpleadoForm />} />
        <Route path="/rrhh/empleados/:id" element={<EmpleadoDetalle />} />
        <Route path="/rrhh/empleados/:id/editar" element={<EmpleadoForm />} />

        {/* Compras */}
        <Route path="/compras/requisiciones" element={<RequisicionesList />} />
        <Route path="/compras/requisiciones/nueva" element={<RequisicionForm />} />
        <Route path="/compras/requisiciones/:id" element={<RequisicionDetalle />} />
        <Route path="/compras/ordenes" element={<OrdenesCompra />} />
        <Route path="/compras/proveedores" element={<ProveedoresList />} />

        {/* Almacén */}
        <Route path="/almacen/inventario" element={<InventarioList />} />
        <Route path="/almacen/articulos/nuevo" element={<ArticuloForm />} />
        <Route path="/almacen/movimientos" element={<MovimientosList />} />
        <Route path="/almacen/solicitudes" element={<SolicitudesAlmacen />} />

        {/* Alimentación */}
        <Route path="/alimentacion/dietas" element={<DietasList />} />
        <Route path="/alimentacion/dietas/nueva" element={<DietaForm />} />
        <Route path="/alimentacion/dietas/:id" element={<DietaDetalle />} />
        <Route path="/alimentacion/forrajes" element={<FacturasForraje />} />
        <Route path="/alimentacion/forrajes/nueva" element={<FacturaForrajeForm />} />

        {/* Informática */}
        <Route path="/informatica/animales" element={<AnimalesList />} />
        <Route path="/informatica/animales/nuevo" element={<AnimalForm />} />
        <Route path="/informatica/animales/:id" element={<AnimalDetalle />} />
        <Route path="/informatica/lotes" element={<LotesList />} />
        <Route path="/informatica/partos" element={<PartosList />} />

        {/* Báscula */}
        <Route path="/bascula/fichas" element={<FichasBascula />} />
        <Route path="/bascula/fichas/nueva" element={<FichaBasculaForm />} />
        <Route path="/bascula/fichas/:id" element={<FichaBasculaDetalle />} />

        {/* Leche */}
        <Route path="/leche" element={<EnviosLeche />} />
        <Route path="/leche/envios" element={<EnviosLeche />} />
        <Route path="/leche/nuevo" element={<EnvioLecheForm />} />
        <Route path="/leche/programacion" element={<ProgramacionSemanal />} />

        {/* Contabilidad */}
        <Route path="/contabilidad" element={<SolicitudesPago />} />
        <Route path="/contabilidad/solicitudes" element={<SolicitudesPago />} />
        <Route path="/contabilidad/nueva-solicitud" element={<SolicitudPagoForm />} />
        <Route path="/contabilidad/solicitud/:id" element={<SolicitudPagoDetalle />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
