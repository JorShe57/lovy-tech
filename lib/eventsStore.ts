import { promises as fs } from 'fs'
import path from 'path'
let blobAvailable = false
try {
  // dynamic require to avoid bundling when not installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('@vercel/blob')
  blobAvailable = true
} catch {}

type BlobModule = typeof import('@vercel/blob')

export type StoredEvent = {
  id: string
  title: string
  startTime: string
  endTime: string
  date: string
  calendar: string
  color: string
  description?: string
  location?: string
  attendees?: string[]
  organizer?: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE = path.join(DATA_DIR, 'events.json')

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.access(FILE)
  } catch {
    await fs.writeFile(FILE, JSON.stringify([], null, 2), 'utf-8')
  }
}

export async function loadEvents(): Promise<StoredEvent[]> {
  if (process.env.BLOB_READ_WRITE_TOKEN && blobAvailable) {
    const { list } = (await import('@vercel/blob')) as BlobModule
    const { blobs } = await list({ prefix: 'calendar-events/events.json', token: process.env.BLOB_READ_WRITE_TOKEN })
    if (blobs.length === 0) return []
    const res = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!res.ok) return []
    try {
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  } else {
    await ensureFile()
    const raw = await fs.readFile(FILE, 'utf-8')
    try {
      const data = JSON.parse(raw)
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }
}

export async function saveEvents(events: StoredEvent[]): Promise<void> {
  if (process.env.BLOB_READ_WRITE_TOKEN && blobAvailable) {
    const { put } = (await import('@vercel/blob')) as BlobModule
    await put('calendar-events/events.json', JSON.stringify(events, null, 2), {
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      access: 'private',
    })
  } else {
    await ensureFile()
    await fs.writeFile(FILE, JSON.stringify(events, null, 2), 'utf-8')
  }
}
