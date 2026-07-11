import { of } from 'rxjs';
import type { DashboardSource } from '@services/dashboard-source';
import type { DashboardData, SucursalRow, ProvinciaData } from '@models/data-models.model';

export function makeSucursalRow(partial: Partial<SucursalRow> = {}): SucursalRow {
  return {
    id: 'S1', nombre: 'Sucursal Uno',
    provinciaId: 'P1', provincia: 'Buenos Aires', region: 'Pampeana', localidad: 'Ciudad A',
    estadoId: '1', estado: 'Activa',
    email: 'uno@e.com', telefono: '111', direccion: 'Calle 1', codigoPostal: '1000', fechaApertura: '2024-01-10',
    lat: -34.6, lng: -58.4, coordValida: true, coordInvalida: false, sinCoord: false,
    tieneDist: true, tieneSocial: true,
    compTotal: 2, compAbiertas: 1, mailsTotal: 2, mailsFallidos: 1,
    riesgo: 3, isDeleted: false,
    ratingAverage: 4.3, ratingCount: 12,
    ...partial,
  };
}

export function makeProvinciaData(partial: Partial<ProvinciaData> = {}): ProvinciaData {
  return {
    provinciaId: 'P1', nombre: 'Buenos Aires', region: 'Pampeana',
    total: 3, activas: 2, inactivas: 1, pendientes: 0, sinCoord: 0,
    sinSocial: 1, sinDist: 1, conDistCount: 2, conSocialCount: 2,
    pctActivas: 66.7, pctCoberturaDist: 66.7, pctCoberturaSocial: 66.7,
    compAbiertas: 1, compTotal: 2, mailsTotal: 2, mailsFallidos: 1, pctMailsFallidos: 50,
    ratingAverage: 4.1, ratingVotos: 20, sucCalificadas: 2, pctCalificadas: 66.7,
    ...partial,
  };
}

export function makeDashboardData(partial: Partial<DashboardData> = {}): DashboardData {
  return {
    loading: false,
    totalSucursales: 5, activas: 3, inactivas: 1, pendientes: 1, pctActivas: 60,
    sucConDist: 2, pctCobDist: 40, sucConSocial: 1, pctCobSocial: 20,
    totalComp: 4, compAbiertas: 3, compCerradas: 1, pctCompAbiertas: 75,
    compPendientes: 3, compEnRevision: 0, compAprobadas: 1, compRechazadas: 0,
    edadPromedioComp: 26, totalErrores: 2, compAging: { b0_7: 1, b8_30: 1, b31plus: 1 },
    totalMails: 4, mailsEnviados: 2, mailsFallidos: 2, pctMailsFallidos: 50, reintentosSMTP: 3,
    totalEventos: 3, inserciones: 2, actualizaciones: 1, softDeletes: 0, bulkInserts: 0, bulkUpdates: 0,
    scoreRiesgo: 54, sinRedSocial: 4, sinDistribuidor: 3, sinCoordenadas: 1,
    pctSinSocial: 80, pctSinDist: 60, pctSinCoord: 20,
    ratingPromedioRed: 4.2, ratingVotos: 24, sucCalificadas: 4, pctCalificadas: 80,
    ratingBajas: 1, ratingDistribucion: [1, 2, 3, 8, 10],
    provincias: [makeProvinciaData(), makeProvinciaData({ provinciaId: 'P2', nombre: 'Cordoba', region: 'Centro', total: 2 })],
    compPorMes: [{ mes: '2024-01', total: 2, abiertas: 1 }, { mes: '2024-02', total: 3, abiertas: 2 }],
    mailsPorMes: [{ mes: '2024-01', total: 5, fallidos: 1 }, { mes: '2024-02', total: 4, fallidos: 2 }],
    aperturasPorMes: [{ mes: '2024-01', total: 2 }, { mes: '2024-02', total: 3 }],
    trends: { compTotal: 50, compAbiertas: -10, mailsTotal: 0, mailsFallidos: 100, nuevasSucursales: 50 },
    auditPorMes: [{ mes: '2024-01', insert: 2, update: 1 } as any],
    auditPorTabla: [{ tabla: 'sucursales', insert: 2, update: 1 } as any],
    erroresPorTipo: [{ tipo: 'Timeout', total: 1 }, { tipo: 'Validation', total: 1 }],
    mailsPorAsunto: [{ asunto: 'Bienvenida', total: 3, fallidos: 1 }],
    sucursalesGeo: [], coordsInvalidas: 1,
    sucursalesConProblemas: [],
    sucursales: [makeSucursalRow(), makeSucursalRow({ id: 'S2', nombre: 'Sucursal Dos', provinciaId: 'P2', provincia: 'Cordoba' })],
    ...partial,
  };
}

/** A DashboardSource test double with spy-able methods. */
export function createMockDataService(data: DashboardData = makeDashboardData()) {
  return {
    data$: of(data),
    state$: of({ status: 'ready', data: null, error: null }),
    activeFilter$: of({ provincia: null, region: null, estado: null, desde: null, hasta: null }),
    filterOptions$: of({
      provincias: [{ id: 'P1', nombre: 'Buenos Aires' }, { id: 'P2', nombre: 'Cordoba' }],
      regiones: ['Centro', 'Pampeana'],
      estados: ['Activa', 'Inactiva', 'Pendiente'],
    }),
    hasActiveFilter: false,
    allRows: data.sucursales,
    setFilter: vi.fn(),
    clearFilter: vi.fn(),
    reload: vi.fn(),
    searchSucursales: vi.fn(() => data.sucursales),
    getSucursal: vi.fn((id: string) => data.sucursales.find(s => s.id === id)),
  } as unknown as DashboardSource;
}
