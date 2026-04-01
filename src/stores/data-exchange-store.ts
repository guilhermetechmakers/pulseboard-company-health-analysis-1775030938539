import { create } from 'zustand'
import type { DataExportPreset } from '@/types/data-io'

export interface DataExchangeState {
  exportPreset: DataExportPreset
  exportSelectedFields: string[]
  exportScheduleNote: string
  setExportPreset: (p: DataExportPreset) => void
  setExportSelectedFields: (fields: string[]) => void
  setExportScheduleNote: (note: string) => void
}

export const useDataExchangeStore = create<DataExchangeState>((set) => ({
  exportPreset: 'full_backup',
  exportSelectedFields: [],
  exportScheduleNote: '',
  setExportPreset: (p) => set({ exportPreset: p }),
  setExportSelectedFields: (fields) => set({ exportSelectedFields: [...fields] }),
  setExportScheduleNote: (note) => set({ exportScheduleNote: note }),
}))
