import { NextResponse } from 'next/server'
import { z } from 'zod'
import { loadEvents, saveEvents, type StoredEvent } from '@/lib/eventsStore'

const EventSchema = z.object({
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  description: z.string().optional(),
  location: z.string().optional(),
  calendar: z.string().default('My Calendar'),
})

function cors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

export async function GET() {
  const events = await loadEvents()
  return cors(NextResponse.json(events))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = EventSchema.parse(body)

    const nowId = String(Date.now())
    const color = parsed.calendar === 'Work' ? 'bg-green-500' : parsed.calendar === 'Personal' ? 'bg-purple-500' : 'bg-blue-500'
    const newEvent: StoredEvent = {
      id: nowId,
      title: parsed.title.trim(),
      date: parsed.date,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      description: parsed.description?.trim(),
      location: parsed.location?.trim(),
      calendar: parsed.calendar,
      color,
      attendees: [],
      organizer: 'API',
    }
    const events = await loadEvents()
    events.push(newEvent)
    await saveEvents(events)
    return cors(NextResponse.json(newEvent, { status: 201 }))
  } catch (e: any) {
    const message = e?.message || 'Invalid request'
    return cors(NextResponse.json({ error: message }, { status: 400 }))
  }
}

