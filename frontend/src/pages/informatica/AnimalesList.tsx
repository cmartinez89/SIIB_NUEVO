import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

interface Animal {
  id: number
  arete: string
  nombre?: string
  sexo: 'Macho' | 'Hembra'
  fechaNacimiento?: string
  loteId?: number
  lote?: { id: number; nombre: string }
  activo: boolean
  observaciones?: string
}

interface Lote {
  id: number
  nombre: string
  _count?: { animales: number }
}

interface Resumen {
  totalAnimales: number
  animalesActivos: number
  partosEsteMes: number
  totalLotes: number
}

function calcularEdad(fechaNacimiento?: string): string {
  if (!fechaNacimiento) return '-'
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let anos = hoy.getFullYear() - nacimiento.getFullYear()
  let meses = hoy.getMonth() - nacimiento.getMonth()
  if (meses < 0) {
    anos -= 1
    meses += 12
  }
  if (hoy.getDate() < nacimiento.getDate()) {
    meses -= 1
    if (meses < 0) {
      anos -= 1
      meses += 12
    }
  }
  if (anos > 0 && meses > 0) return `${anos}a ${meses}m`
  if (anos > 0) return `${anos}a`
  if (meses > 0) return `${meses}m`
  return '< 1m'
}

function formatFecha(dateString?: string): string {
  if (!dateString) return '-'
  const d = new Date(dateString)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export default function AnimalesList() {
  const navigate = useNavigate()
  const [loteId, setLoteId] = useState('')
  const [sexo, setSexo] = useState('')
  const [activo, setActivo] = useState('')
  const [search, setSearch] = useState('')

  const { data: animalesRes, isLoading: loadingAnimales, error: errorAnimales } = useQuery({
    queryKey: ['animales'],
    queryFn: () => api.get<Animal[]>('/informatica/animales'),
  })

  const { data: resumenRes } = useQuery({
    queryKey: ['resumen'],
    queryFn: () => api.get<Resumen>('/informatica/resumen'),
  })

  const { data: lotesRes } = useQuery({
    queryKey: ['lotes'],
    queryFn: () => api.get<Lote[]>('/informatica/lotes'),
  })

  const animales = animalesRes?.data ?? []
  const resumen = resumenRes?.data
  const lotes = lotesRes?.data ?? []

  const filteredAnimales = animales.filter((a) => {
    if (loteId && String(a.loteId) !== loteId) return false
    if (sexo && a.sexo !== sexo) return false
    if (activo === 'Activos' && !a.activo) return false
    if (activo === 'Baja' && a.activo) return false
    if (search && !a.arete.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Animales</h1>
            <p className="text-stone-500 text-sm mt-1">Gestión del inventario ganadero</p>
          </div>
          <button
            onClick={() => navigate('/informatica/animales/nuevo')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Registrar Animal
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
            <p className="text-sm text-stone-500">Total Animales</p>
            <p className="text-3xl font-bold text-stone-800 mt-1">{resumen?.totalAnimales ?? '-'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
            <p className="text-sm text-stone-500">Animales Activos</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{resumen?.animalesActivos ?? '-'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
            <p className="text-sm text-stone-500">Partos este Mes</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{resumen?.partosEsteMes ?? '-'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
            <p className="text-sm text-stone-500">Total Lotes</p>
            <p className="text-3xl font-bold text-stone-800 mt-1">{resumen?.totalLotes ?? '-'}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Lote</label>
              <select
                value={loteId}
                onChange={(e) => setLoteId(e.target.value)}
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos los lotes</option>
                {lotes.map((l) => (
                  <option key={l.id} value={String(l.id)}>{l.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Sexo</label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value)}
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos</option>
                <option value="Macho">Macho</option>
                <option value="Hembra">Hembra</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Estado</label>
              <select
                value={activo}
                onChange={(e) => setActivo(e.target.value)}
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos</option>
                <option value="Activos">Activos</option>
                <option value="Baja">Baja</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Buscar por Arete</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Número de arete..."
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
          {loadingAnimales ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin border-4 border-green-600 border-t-transparent rounded-full w-8 h-8" />
            </div>
          ) : errorAnimales ? (
            <div className="text-center py-16 text-red-600">
              <p className="font-medium">Error al cargar animales</p>
              <p className="text-sm mt-1">{(errorAnimales as Error).message}</p>
            </div>
          ) : filteredAnimales.length === 0 ? (
            <div className="text-center py-16 text-stone-500">
              <p className="text-lg font-medium">Sin animales registrados</p>
              <p className="text-sm mt-1">Ajusta los filtros o registra un nuevo animal.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-100 text-stone-600 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Arete</th>
                    <th className="px-4 py-3 font-semibold">Nombre</th>
                    <th className="px-4 py-3 font-semibold">Sexo</th>
                    <th className="px-4 py-3 font-semibold">Lote</th>
                    <th className="px-4 py-3 font-semibold">Fecha Nacimiento</th>
                    <th className="px-4 py-3 font-semibold">Edad</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredAnimales.map((animal) => (
                    <tr
                      key={animal.id}
                      onClick={() => navigate(`/informatica/animales/${animal.id}`)}
                      className="hover:bg-stone-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-stone-800">{animal.arete}</td>
                      <td className="px-4 py-3 text-stone-700">{animal.nombre || '-'}</td>
                      <td className="px-4 py-3">
                        {animal.sexo === 'Macho' ? (
                          <span className="text-blue-600 font-medium">♂ Macho</span>
                        ) : (
                          <span className="text-pink-600 font-medium">♀ Hembra</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{animal.lote?.nombre || '-'}</td>
                      <td className="px-4 py-3 text-stone-600">{formatFecha(animal.fechaNacimiento)}</td>
                      <td className="px-4 py-3 text-stone-600">{calcularEdad(animal.fechaNacimiento)}</td>
                      <td className="px-4 py-3">
                        {animal.activo ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Baja
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
