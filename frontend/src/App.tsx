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
import FichasBasculaSab from '@/pages/bascula/FichasBasculaSab'

// Leche
import EnviosLeche from '@/pages/leche/EnviosLeche'
import EnvioLecheForm from '@/pages/leche/EnvioLecheForm'
import ProgramacionSemanal from '@/pages/leche/ProgramacionSemanal'

// Contabilidad
import SolicitudesPago from '@/pages/contabilidad/SolicitudesPago'
import SolicitudPagoForm from '@/pages/contabilidad/SolicitudPagoForm'
import SolicitudPagoDetalle from '@/pages/contabilidad/SolicitudPagoDetalle'

// Caseta
import CasetaOperacion from '@/pages/casetas/CasetaOperacion'
import Vales from '@/pages/casetas/Vales'

// Soporte / Evaluaciones / Catálogos menores
import TicketsKanban from '@/pages/soporte/TicketsKanban'
import EvaluacionesPeriodos from '@/pages/evaluaciones/EvaluacionesPeriodos'
import EvaluacionesConfig from '@/pages/evaluaciones/EvaluacionesConfig'
import CatalogosMenores from '@/pages/catalogosMenores/CatalogosMenores'

// Administración
import UsuariosList from '@/pages/administracion/UsuariosList'
import RolesList from '@/pages/administracion/RolesList'
import RolPermisos from '@/pages/administracion/RolPermisos'
import ModulosAdmin from '@/pages/administracion/ModulosAdmin'
import ConfiguracionAlcance from '@/pages/administracion/ConfiguracionAlcance'
import DispositivosAcceso from '@/pages/administracion/DispositivosAcceso'
import EquiposTI from '@/pages/administracion/EquiposTI'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Oculta/bloquea páginas que el rol del usuario no tiene permiso de ver.
// Un usuario esAdmin siempre pasa (ver store/auth.ts hasSubmodulo).
function RequireSubmodulo({ clave, children }: { clave: string; children: React.ReactNode }) {
  const permitido = useAuthStore((s) => s.hasSubmodulo(clave))
  if (!permitido) return <Navigate to="/dashboard" replace />
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
        <Route path="/nomina/prenomina" element={<RequireSubmodulo clave="PRENOMINA"><PrenominaList /></RequireSubmodulo>} />
        <Route path="/nomina/prenomina/:id" element={<RequireSubmodulo clave="PRENOMINA"><PrenominaDetalle /></RequireSubmodulo>} />
        <Route path="/nomina/recibos" element={<RequireSubmodulo clave="RECIBOS"><RecibosNomina /></RequireSubmodulo>} />
        <Route path="/nomina/checador" element={<RequireSubmodulo clave="CHECADOR"><Checador /></RequireSubmodulo>} />
        <Route path="/nomina/tef" element={<RequireSubmodulo clave="TEF"><TEF /></RequireSubmodulo>} />

        {/* RRHH */}
        <Route path="/rrhh/empleados" element={<RequireSubmodulo clave="EMPLEADOS"><EmpleadosList /></RequireSubmodulo>} />
        <Route path="/rrhh/empleados/nuevo" element={<RequireSubmodulo clave="EMPLEADOS"><EmpleadoForm /></RequireSubmodulo>} />
        <Route path="/rrhh/empleados/:id" element={<RequireSubmodulo clave="EMPLEADOS"><EmpleadoDetalle /></RequireSubmodulo>} />
        <Route path="/rrhh/empleados/:id/editar" element={<RequireSubmodulo clave="EMPLEADOS"><EmpleadoForm /></RequireSubmodulo>} />

        {/* Compras */}
        <Route path="/compras/requisiciones" element={<RequireSubmodulo clave="REQUISICIONES"><RequisicionesList /></RequireSubmodulo>} />
        <Route path="/compras/requisiciones/nueva" element={<RequireSubmodulo clave="REQUISICIONES"><RequisicionForm /></RequireSubmodulo>} />
        <Route path="/compras/requisiciones/:id" element={<RequireSubmodulo clave="REQUISICIONES"><RequisicionDetalle /></RequireSubmodulo>} />
        <Route path="/compras/ordenes" element={<RequireSubmodulo clave="ORDENES_COMPRA"><OrdenesCompra /></RequireSubmodulo>} />
        <Route path="/compras/proveedores" element={<RequireSubmodulo clave="PROVEEDORES"><ProveedoresList /></RequireSubmodulo>} />

        {/* Almacén */}
        <Route path="/almacen/inventario" element={<RequireSubmodulo clave="INVENTARIO"><InventarioList /></RequireSubmodulo>} />
        <Route path="/almacen/articulos/nuevo" element={<RequireSubmodulo clave="INVENTARIO"><ArticuloForm /></RequireSubmodulo>} />
        <Route path="/almacen/movimientos" element={<RequireSubmodulo clave="MOVIMIENTOS_ALMACEN"><MovimientosList /></RequireSubmodulo>} />
        <Route path="/almacen/solicitudes" element={<RequireSubmodulo clave="SOLICITUDES_ALMACEN"><SolicitudesAlmacen /></RequireSubmodulo>} />

        {/* Alimentación */}
        <Route path="/alimentacion/dietas" element={<RequireSubmodulo clave="DIETAS"><DietasList /></RequireSubmodulo>} />
        <Route path="/alimentacion/dietas/nueva" element={<RequireSubmodulo clave="DIETAS"><DietaForm /></RequireSubmodulo>} />
        <Route path="/alimentacion/dietas/:id" element={<RequireSubmodulo clave="DIETAS"><DietaDetalle /></RequireSubmodulo>} />
        <Route path="/alimentacion/forrajes" element={<RequireSubmodulo clave="FORRAJES"><FacturasForraje /></RequireSubmodulo>} />
        <Route path="/alimentacion/forrajes/nueva" element={<RequireSubmodulo clave="FORRAJES"><FacturaForrajeForm /></RequireSubmodulo>} />

        {/* Informática */}
        <Route path="/informatica/animales" element={<RequireSubmodulo clave="ANIMALES"><AnimalesList /></RequireSubmodulo>} />
        <Route path="/informatica/animales/nuevo" element={<RequireSubmodulo clave="ANIMALES"><AnimalForm /></RequireSubmodulo>} />
        <Route path="/informatica/animales/:id" element={<RequireSubmodulo clave="ANIMALES"><AnimalDetalle /></RequireSubmodulo>} />
        <Route path="/informatica/lotes" element={<RequireSubmodulo clave="LOTES"><LotesList /></RequireSubmodulo>} />
        <Route path="/informatica/partos" element={<RequireSubmodulo clave="PARTOS"><PartosList /></RequireSubmodulo>} />

        {/* Báscula */}
        <Route path="/bascula/fichas" element={<RequireSubmodulo clave="FICHAS_BASCULA"><FichasBascula /></RequireSubmodulo>} />
        <Route path="/bascula/fichas/nueva" element={<RequireSubmodulo clave="FICHAS_BASCULA"><FichaBasculaForm /></RequireSubmodulo>} />
        <Route path="/bascula/fichas/:id" element={<RequireSubmodulo clave="FICHAS_BASCULA"><FichaBasculaDetalle /></RequireSubmodulo>} />
        <Route path="/bascula/sab" element={<RequireSubmodulo clave="FICHAS_BASCULA_SAB"><FichasBasculaSab /></RequireSubmodulo>} />

        {/* Leche */}
        <Route path="/leche" element={<RequireSubmodulo clave="ENVIOS_LECHE"><EnviosLeche /></RequireSubmodulo>} />
        <Route path="/leche/envios" element={<RequireSubmodulo clave="ENVIOS_LECHE"><EnviosLeche /></RequireSubmodulo>} />
        <Route path="/leche/nuevo" element={<RequireSubmodulo clave="ENVIOS_LECHE"><EnvioLecheForm /></RequireSubmodulo>} />
        <Route path="/leche/programacion" element={<RequireSubmodulo clave="PROGRAMACION_LECHE"><ProgramacionSemanal /></RequireSubmodulo>} />

        {/* Contabilidad */}
        <Route path="/contabilidad" element={<RequireSubmodulo clave="SOLICITUDES_PAGO"><SolicitudesPago /></RequireSubmodulo>} />
        <Route path="/contabilidad/solicitudes" element={<RequireSubmodulo clave="SOLICITUDES_PAGO"><SolicitudesPago /></RequireSubmodulo>} />
        <Route path="/contabilidad/nueva-solicitud" element={<RequireSubmodulo clave="SOLICITUDES_PAGO"><SolicitudPagoForm /></RequireSubmodulo>} />
        <Route path="/contabilidad/solicitud/:id" element={<RequireSubmodulo clave="SOLICITUDES_PAGO"><SolicitudPagoDetalle /></RequireSubmodulo>} />

        {/* Caseta */}
        <Route path="/casetas/operacion" element={<RequireSubmodulo clave="CASETA_OPERACION"><CasetaOperacion /></RequireSubmodulo>} />
        <Route path="/casetas/vales" element={<RequireSubmodulo clave="CASETA_VALES"><Vales /></RequireSubmodulo>} />

        {/* Soporte */}
        <Route path="/soporte/tickets" element={<RequireSubmodulo clave="TICKETS"><TicketsKanban /></RequireSubmodulo>} />

        {/* Evaluaciones */}
        <Route path="/evaluaciones/periodos" element={<RequireSubmodulo clave="EVALUACIONES_PERIODOS"><EvaluacionesPeriodos /></RequireSubmodulo>} />
        <Route path="/evaluaciones/configuracion" element={<RequireSubmodulo clave="EVALUACIONES_CONFIG"><EvaluacionesConfig /></RequireSubmodulo>} />

        {/* Catálogos menores */}
        <Route path="/catalogos-menores/clasificaciones" element={<RequireSubmodulo clave="CLASIFICACIONES"><CatalogosMenores /></RequireSubmodulo>} />
        <Route path="/catalogos-menores/centros" element={<RequireSubmodulo clave="CENTROS"><CatalogosMenores /></RequireSubmodulo>} />
        <Route path="/catalogos-menores/equipos" element={<RequireSubmodulo clave="EQUIPOS_ESTABLO"><CatalogosMenores /></RequireSubmodulo>} />

        {/* Administración */}
        <Route path="/administracion/usuarios" element={<RequireSubmodulo clave="ADMIN_USUARIOS"><UsuariosList /></RequireSubmodulo>} />
        <Route path="/administracion/roles" element={<RequireSubmodulo clave="ADMIN_ROLES"><RolesList /></RequireSubmodulo>} />
        <Route path="/administracion/roles/:id" element={<RequireSubmodulo clave="ADMIN_ROLES"><RolPermisos /></RequireSubmodulo>} />
        <Route path="/administracion/modulos" element={<RequireSubmodulo clave="ADMIN_MODULOS"><ModulosAdmin /></RequireSubmodulo>} />
        <Route path="/administracion/configuracion" element={<RequireSubmodulo clave="ADMIN_CONFIGURACION"><ConfiguracionAlcance /></RequireSubmodulo>} />
        <Route path="/administracion/dispositivos" element={<RequireSubmodulo clave="ADMIN_ACCESO"><DispositivosAcceso /></RequireSubmodulo>} />
        <Route path="/administracion/equipos-ti" element={<RequireSubmodulo clave="ADMIN_EQUIPOS_TI"><EquiposTI /></RequireSubmodulo>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
