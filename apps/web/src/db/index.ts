import Dexie, { type Table } from 'dexie'

export interface SettingRecord {
  key: string
  value: unknown
  updatedAt: number
}

class TimeFlowDatabase extends Dexie {
  settings!: Table<SettingRecord, string>

  constructor() {
    super('timeflow')

    this.version(1).stores({
      // `&key` makes the setting key unique; `updatedAt` is indexed for sorting.
      settings: '&key, updatedAt',
    })
  }
}

export const db = new TimeFlowDatabase()

export const settingsRepository = {
  get(key: string) {
    return db.settings.get(key)
  },

  async set(key: string, value: unknown) {
    await db.settings.put({ key, value, updatedAt: Date.now() })
  },

  delete(key: string) {
    return db.settings.delete(key)
  },
}
