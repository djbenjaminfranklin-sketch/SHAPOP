// Faux client Supabase en mémoire, suffisant pour tester les routes Express
// (select / insert / update / upsert + filtres usuels, storage, auth).
type Row = Record<string, unknown>
type Filter = (row: Row) => boolean

export class FakeDb {
  tables: Record<string, Row[]> = {}
  storageObjects: Record<string, { bucket: string; size: number; contentType?: string }> = {}
  users: Record<string, { id: string; email: string }> = {}

  reset() {
    this.tables = {}
    this.storageObjects = {}
    this.users = {}
  }

  table(name: string): Row[] {
    if (!this.tables[name]) this.tables[name] = []
    return this.tables[name]
  }

  from(name: string) {
    return new Query(this, name)
  }

  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, body: Buffer, opts?: { contentType?: string }) => {
        this.storageObjects[`${bucket}/${path}`] = { bucket, size: body.length, contentType: opts?.contentType }
        return { data: { path }, error: null }
      },
      createSignedUrl: async (path: string, ttl: number) => ({
        data: { signedUrl: `https://signed.test/${bucket}/${path}?ttl=${ttl}` }, error: null,
      }),
    }),
  }

  auth = {
    // Le jeton de test EST l'identifiant de l'utilisateur
    getUser: async (token: string) => {
      const u = this.users[token]
      return u ? { data: { user: u }, error: null } : { data: { user: null }, error: { message: 'invalid' } }
    },
    admin: {
      getUserById: async (id: string) => ({ data: { user: this.users[id] || null }, error: null }),
    },
  }
}

class Query implements PromiseLike<{ data: unknown; error: unknown; count?: number }> {
  private filters: Filter[] = []
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private payload: Row | Row[] | null = null
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {}
  private returning = false
  private limitN: number | null = null
  private orderBy: { col: string; asc: boolean } | null = null
  private head = false

  constructor(private db: FakeDb, private name: string) {}

  select(_cols?: string, opts?: { head?: boolean; count?: string }) {
    if (this.op === 'select') this.op = 'select'
    else this.returning = true
    if (opts?.head) this.head = true
    return this
  }
  insert(rows: Row | Row[]) { this.op = 'insert'; this.payload = rows; return this }
  update(patch: Row) { this.op = 'update'; this.payload = patch; return this }
  upsert(rows: Row | Row[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = 'upsert'; this.payload = rows; this.upsertOpts = opts || {}; return this
  }
  delete() { this.op = 'delete'; return this }

  eq(col: string, val: unknown) { this.filters.push(r => r[col] === val); return this }
  neq(col: string, val: unknown) { this.filters.push(r => r[col] !== val); return this }
  in(col: string, vals: unknown[]) { this.filters.push(r => vals.includes(r[col])); return this }
  is(col: string, val: unknown) { this.filters.push(r => (r[col] ?? null) === val); return this }
  not(col: string, op: string, val: unknown) {
    if (op === 'is') this.filters.push(r => (r[col] ?? null) !== val)
    else if (op === 'in') {
      const list = String(val).replace(/[()"]/g, '').split(',')
      this.filters.push(r => !list.includes(String(r[col])))
    }
    return this
  }
  lt(col: string, val: unknown) { this.filters.push(r => r[col] != null && (r[col] as number) < (val as number)); return this }
  lte(col: string, val: unknown) { this.filters.push(r => r[col] != null && (r[col] as number) <= (val as number)); return this }
  gt(col: string, val: unknown) { this.filters.push(r => r[col] != null && (r[col] as number) > (val as number)); return this }
  gte(col: string, val: unknown) { this.filters.push(r => r[col] != null && (r[col] as number) >= (val as number)); return this }
  order(col: string, opts?: { ascending?: boolean }) { this.orderBy = { col, asc: opts?.ascending !== false }; return this }
  limit(n: number) { this.limitN = n; return this }

  async single() {
    const { data, error } = await this.run()
    const rows = (Array.isArray(data) ? data : data ? [data] : []) as Row[]
    if (error) return { data: null, error }
    if (rows.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'not single' } }
    return { data: rows[0], error: null }
  }

  async maybeSingle() {
    const { data, error } = await this.run()
    const rows = (Array.isArray(data) ? data : data ? [data] : []) as Row[]
    if (error) return { data: null, error }
    return { data: rows[0] ?? null, error: null }
  }

  then<T1 = { data: unknown; error: unknown }, T2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown; count?: number }) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return this.run().then(onfulfilled, onrejected)
  }

  private matching(): Row[] {
    return this.db.table(this.name).filter(r => this.filters.every(f => f(r)))
  }

  private async run(): Promise<{ data: unknown; error: unknown; count?: number }> {
    const table = this.db.table(this.name)
    if (this.op === 'select') {
      let rows = this.matching()
      if (this.orderBy) {
        const { col, asc } = this.orderBy
        rows = [...rows].sort((a, b) => ((a[col] as number) > (b[col] as number) ? 1 : -1) * (asc ? 1 : -1))
      }
      if (this.limitN != null) rows = rows.slice(0, this.limitN)
      if (this.head) return { data: null, error: null, count: rows.length }
      return { data: rows.map(r => ({ ...r })), error: null }
    }
    if (this.op === 'insert') {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[]
      const inserted = rows.map(r => ({ id: r.id ?? `id-${Math.random().toString(36).slice(2)}`, ...r }))
      table.push(...inserted)
      return { data: this.returning ? inserted : null, error: null }
    }
    if (this.op === 'upsert') {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[]
      const key = this.upsertOpts.onConflict || 'id'
      for (const r of rows) {
        const existing = table.find(t => t[key] === r[key])
        if (existing) {
          if (!this.upsertOpts.ignoreDuplicates) Object.assign(existing, r)
        } else table.push({ ...r })
      }
      return { data: null, error: null }
    }
    if (this.op === 'update') {
      const rows = this.matching()
      for (const r of rows) Object.assign(r, this.payload)
      return { data: this.returning ? rows.map(r => ({ ...r })) : null, error: null }
    }
    // delete
    const keep = table.filter(r => !this.filters.every(f => f(r)))
    this.db.tables[this.name] = keep
    return { data: null, error: null }
  }
}

export const fakeDb = new FakeDb()
