"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Image from "next/image"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings,
  Menu,
  Clock,
  MapPin,
  Users,
  Calendar,
  Pause,
  Sparkles,
  X,
} from "lucide-react"

export default function Home() {
  type EventItem = {
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

  const [isLoaded, setIsLoaded] = useState(false)
  const [showAIPopup, setShowAIPopup] = useState(false)
  const [typedText, setTypedText] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState("week")
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedCalendars, setSelectedCalendars] = useState({
    "My Calendar": true,
    Work: true,
    Personal: true,
    Family: true,
  })

  const audioCtxRef = useRef<AudioContext | null>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)

  const [newEvent, setNewEvent] = useState({
    title: "",
    startTime: "",
    endTime: "",
    description: "",
    location: "",
    date: "",
  })

  const myCalendars = [
    { name: "My Calendar", color: "bg-blue-500" },
    { name: "Work", color: "bg-green-500" },
    { name: "Personal", color: "bg-purple-500" },
    { name: "Family", color: "bg-orange-500" },
  ] as const

  const calendarColorFor = (calendar: string) => {
    const found = myCalendars.find((c) => c.name === calendar)
    return found ? found.color : "bg-blue-500"
  }

  const pad2 = (n: number) => n.toString().padStart(2, "0")
  const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  const startOfWeek = (d: Date) => {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day
    date.setDate(diff)
    date.setHours(0, 0, 0, 0)
    return date
  }
  const addDays = (d: Date, days: number) => {
    const copy = new Date(d)
    copy.setDate(copy.getDate() + days)
    return copy
  }

  // Persistent events state
  const [events, setEvents] = useState<EventItem[]>([])

  useEffect(() => {
    setIsLoaded(true)
    setNewEvent((prev) => ({ ...prev, date: toISODate(currentDate) }))

    // Load selected calendar visibility
    try {
      const storedCalendars = localStorage.getItem("selectedCalendars")
      if (storedCalendars) setSelectedCalendars((prev) => ({ ...prev, ...JSON.parse(storedCalendars) }))
    } catch {}

    // Try server events first, then fall back to localStorage, finally seed
    ;(async () => {
      try {
        const res = await fetch('/api/events', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setEvents(data)
            return
          }
        }
      } catch {}
      try {
        const raw = localStorage.getItem('calendarEvents')
        if (raw) {
          setEvents(JSON.parse(raw))
          return
        }
      } catch {}
      // seed if still empty
      const wkStart = startOfWeek(currentDate)
      const seeded = sampleEvents.map((e: any) => ({
        id: String(e.id),
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        date: toISODate(new Date(wkStart.getFullYear(), wkStart.getMonth(), wkStart.getDate() + (e.day - 1))),
        calendar: e.calendar,
        color: e.color,
        description: e.description,
        location: e.location,
        attendees: e.attendees,
        organizer: e.organizer,
      }))
      setEvents(seeded)
    })()

    const popupTimer = setTimeout(() => setShowAIPopup(true), 3000)
    return () => clearTimeout(popupTimer)
  }, [])

  useEffect(() => {
    try { localStorage.setItem('calendarEvents', JSON.stringify(events)) } catch {}
  }, [events])

  useEffect(() => {
    try {
      localStorage.setItem("selectedCalendars", JSON.stringify(selectedCalendars))
    } catch {}
  }, [selectedCalendars])

  useEffect(() => {
    if (showAIPopup) {
      const text =
        "LLooks like you don't have that many meetings today. Shall I play some Hans Zimmer essentials to help you get into your Flow State?"
      let i = 0
      const typingInterval = setInterval(() => {
        if (i < text.length) {
          setTypedText((prev) => prev + text.charAt(i))
          i++
        } else {
          clearInterval(typingInterval)
        }
      }, 50)

      return () => clearInterval(typingInterval)
    }
  }, [showAIPopup])

  const navigateToToday = () => {
    setCurrentDate(new Date())
  }

  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    if (currentView === "day") {
      newDate.setDate(newDate.getDate() - 1)
    } else if (currentView === "week") {
      newDate.setDate(newDate.getDate() - 7)
    } else if (currentView === "month") {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (currentView === "day") {
      newDate.setDate(newDate.getDate() + 1)
    } else if (currentView === "week") {
      newDate.setDate(newDate.getDate() + 7)
    } else if (currentView === "month") {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const toggleCalendar = (calendarName) => {
    setSelectedCalendars((prev) => ({
      ...prev,
      [calendarName]: !prev[calendarName],
    }))
  }

  const handleCreateEvent = async () => {
    if (newEvent.title && newEvent.startTime && newEvent.endTime && newEvent.date) {
      // Try pushing to API first
      try {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newEvent.title,
            date: newEvent.date,
            startTime: newEvent.startTime,
            endTime: newEvent.endTime,
            description: newEvent.description,
            location: newEvent.location,
            calendar: 'My Calendar',
          }),
        })
        if (res.ok) {
          const created = await res.json()
          setEvents((prev) => [...prev, created])
        } else {
          // Fallback to local add
          const item: EventItem = {
            id: `${Date.now()}`,
            title: newEvent.title.trim(),
            startTime: newEvent.startTime,
            endTime: newEvent.endTime,
            date: newEvent.date,
            description: newEvent.description?.trim(),
            location: newEvent.location?.trim(),
            attendees: [],
            organizer: 'You',
            calendar: 'My Calendar',
            color: 'bg-blue-500',
          }
          setEvents((prev) => [...prev, item])
        }
      } catch {
        // Fallback
        const item: EventItem = {
          id: `${Date.now()}`,
          title: newEvent.title.trim(),
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
          date: newEvent.date,
          description: newEvent.description?.trim(),
          location: newEvent.location?.trim(),
          attendees: [],
          organizer: 'You',
          calendar: 'My Calendar',
          color: 'bg-blue-500',
        }
        setEvents((prev) => [...prev, item])
      }

      setNewEvent({ title: '', startTime: '', endTime: '', description: '', location: '', date: toISODate(currentDate) })
      setShowCreateModal(false)
    }
  }

  const handleEventClick = (event: any) => {
    setSelectedEvent(event)
  }

  // Updated sample calendar events with all events before 4 PM
  const sampleEvents = [
    {
      id: 1,
      title: "Team Meeting",
      startTime: "09:00",
      endTime: "10:00",
      color: "bg-blue-500",
      day: 1,
      description: "Weekly team sync-up",
      location: "Conference Room A",
      attendees: ["John Doe", "Jane Smith", "Bob Johnson"],
      organizer: "Alice Brown",
      calendar: "Work",
    },
    {
      id: 2,
      title: "Lunch with Sarah",
      startTime: "12:30",
      endTime: "13:30",
      color: "bg-green-500",
      day: 1,
      description: "Discuss project timeline",
      location: "Cafe Nero",
      attendees: ["Sarah Lee"],
      organizer: "You",
      calendar: "Personal",
    },
    {
      id: 3,
      title: "Project Review",
      startTime: "14:00",
      endTime: "15:30",
      color: "bg-purple-500",
      day: 3,
      description: "Q2 project progress review",
      location: "Meeting Room 3",
      attendees: ["Team Alpha", "Stakeholders"],
      organizer: "Project Manager",
      calendar: "Work",
    },
    {
      id: 4,
      title: "Client Call",
      startTime: "10:00",
      endTime: "11:00",
      color: "bg-yellow-500",
      day: 2,
      description: "Quarterly review with major client",
      location: "Zoom Meeting",
      attendees: ["Client Team", "Sales Team"],
      organizer: "Account Manager",
      calendar: "Work",
    },
    {
      id: 5,
      title: "Team Brainstorm",
      startTime: "13:00",
      endTime: "14:30",
      color: "bg-indigo-500",
      day: 4,
      description: "Ideation session for new product features",
      location: "Creative Space",
      attendees: ["Product Team", "Design Team"],
      organizer: "Product Owner",
      calendar: "Work",
    },
    {
      id: 6,
      title: "Product Demo",
      startTime: "11:00",
      endTime: "12:00",
      color: "bg-pink-500",
      day: 5,
      description: "Showcase new features to stakeholders",
      location: "Demo Room",
      attendees: ["Stakeholders", "Dev Team"],
      organizer: "Tech Lead",
      calendar: "Work",
    },
    {
      id: 7,
      title: "Marketing Meeting",
      startTime: "13:00",
      endTime: "14:00",
      color: "bg-teal-500",
      day: 6,
      description: "Discuss Q3 marketing strategy",
      location: "Marketing Office",
      attendees: ["Marketing Team"],
      organizer: "Marketing Director",
      calendar: "Work",
    },
    {
      id: 8,
      title: "Code Review",
      startTime: "15:00",
      endTime: "16:00",
      color: "bg-cyan-500",
      day: 7,
      description: "Review pull requests for new feature",
      location: "Dev Area",
      attendees: ["Dev Team"],
      organizer: "Senior Developer",
      calendar: "Work",
    },
    {
      id: 9,
      title: "Morning Standup",
      startTime: "08:30",
      endTime: "09:30", // Changed from "09:00" to "09:30"
      color: "bg-blue-400",
      day: 2,
      description: "Daily team standup",
      location: "Slack Huddle",
      attendees: ["Development Team"],
      organizer: "Scrum Master",
      calendar: "Work",
    },
    {
      id: 10,
      title: "Design Review",
      startTime: "14:30",
      endTime: "15:45",
      color: "bg-purple-400",
      day: 5,
      description: "Review new UI designs",
      location: "Design Lab",
      attendees: ["UX Team", "Product Manager"],
      organizer: "Lead Designer",
      calendar: "Work",
    },
    {
      id: 11,
      title: "Investor Meeting",
      startTime: "10:30",
      endTime: "12:00",
      color: "bg-red-400",
      day: 7,
      description: "Quarterly investor update",
      location: "Board Room",
      attendees: ["Executive Team", "Investors"],
      organizer: "CEO",
      calendar: "Work",
    },
    {
      id: 12,
      title: "Team Training",
      startTime: "09:30",
      endTime: "11:30",
      color: "bg-green-400",
      day: 4,
      description: "New tool onboarding session",
      location: "Training Room",
      attendees: ["All Departments"],
      organizer: "HR",
      calendar: "Work",
    },
    {
      id: 13,
      title: "Budget Review",
      startTime: "13:30",
      endTime: "15:00",
      color: "bg-yellow-400",
      day: 3,
      description: "Quarterly budget analysis",
      location: "Finance Office",
      attendees: ["Finance Team", "Department Heads"],
      organizer: "CFO",
      calendar: "Work",
    },
    {
      id: 14,
      title: "Client Presentation",
      startTime: "11:00",
      endTime: "12:30",
      color: "bg-orange-400",
      day: 6,
      description: "Present new project proposal",
      location: "Client Office",
      attendees: ["Sales Team", "Client Representatives"],
      organizer: "Account Executive",
      calendar: "Work",
    },
    {
      id: 15,
      title: "Product Planning",
      startTime: "14:00",
      endTime: "15:30",
      color: "bg-pink-400",
      day: 1,
      description: "Roadmap discussion for Q3",
      location: "Strategy Room",
      attendees: ["Product Team", "Engineering Leads"],
      organizer: "Product Manager",
      calendar: "Work",
    },
  ]

  // If no persisted events loaded, seed once based on current week
  useEffect(() => {
    if (events.length === 0) {
      const wkStart = startOfWeek(currentDate)
      const seeded = sampleEvents.map((e: any) => ({
        id: String(e.id),
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        date: toISODate(new Date(wkStart.getFullYear(), wkStart.getMonth(), wkStart.getDate() + (e.day - 1))),
        calendar: e.calendar,
        color: e.color,
        description: e.description,
        location: e.location,
        attendees: e.attendees,
        organizer: e.organizer,
      }))
      setEvents(seeded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const weekStartDate = useMemo(() => startOfWeek(currentDate), [currentDate])
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + i)), [weekStartDate])

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return events.filter((event) => {
      if (selectedCalendars[event.calendar] === false) return false
      if (!q) return true
      return event.title.toLowerCase().includes(q) || (event.description || "").toLowerCase().includes(q)
    })
  }, [events, selectedCalendars, searchQuery])

  const formatCurrentDate = () => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
    return currentDate.toLocaleDateString("en-US", options)
  }

  const formatCurrentMonth = () => {
    const options = {
      year: "numeric",
      month: "long",
    }
    return currentDate.toLocaleDateString("en-US", options)
  }

  // Sample calendar days for the week view
  const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
  const timeSlots = Array.from({ length: 12 }, (_, i) => i + 8) // 8 AM to 7 PM

  // Helper function to calculate event position and height
  const calculateEventStyle = (startTime: string, endTime: string) => {
    const start = Number.parseInt(startTime.split(":")[0]) + Number.parseInt(startTime.split(":")[1]) / 60
    const end = Number.parseInt(endTime.split(":")[0]) + Number.parseInt(endTime.split(":")[1]) / 60
    const top = (start - 8) * 60 // 60px per hour
    const height = Math.max(32, (end - start) * 60)
    return { top: `${top}px`, height: `${height}px` }
  }

  // Calendar for mini calendar (real month)
  const firstOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate])
  const daysInMonth = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(),
    [currentDate],
  )
  const firstDayOffset = useMemo(() => firstOfMonth.getDay(), [firstOfMonth])
  const miniCalendarDays = useMemo(
    () =>
      Array.from({ length: daysInMonth + firstDayOffset }, (_, i) => (i < firstDayOffset ? null : i - firstDayOffset + 1)),
    [daysInMonth, firstDayOffset],
  )

  const togglePlay = async () => {
    if (!isPlaying) {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        const ctx = audioCtxRef.current
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "sine"
        osc.frequency.value = 174
        gain.gain.value = 0.04
        osc.connect(gain).connect(ctx.destination)
        osc.start()
        oscillatorRef.current = osc
      } catch {}
      setIsPlaying(true)
    } else {
      try {
        oscillatorRef.current?.stop()
        oscillatorRef.current?.disconnect()
        oscillatorRef.current = null
      } catch {}
      setIsPlaying(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <Image
        src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop"
        alt="Beautiful mountain landscape"
        fill
        className="object-cover"
        priority
      />

      {/* Navigation */}
      <header
        className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-6 opacity-0 ${isLoaded ? "animate-fade-in" : ""}`}
        style={{ animationDelay: "0.2s" }}
      >
        <div className="flex items-center gap-4">
          <Menu className="h-6 w-6 text-white cursor-pointer hover:text-white/80" />
          <span className="text-2xl font-semibold text-white drop-shadow-lg">Calendar</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-full bg-white/10 backdrop-blur-sm pl-10 pr-4 py-2 text-white placeholder:text-white/70 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          <Settings
            className="h-6 w-6 text-white drop-shadow-md cursor-pointer hover:text-white/80"
            onClick={() => setShowSettings(!showSettings)}
          />
          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shadow-md cursor-pointer hover:bg-blue-600">
            U
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative h-screen w-full pt-20 flex">
        {/* Sidebar */}
        <div
          className={`w-64 h-full bg-white/10 backdrop-blur-lg p-4 shadow-xl border-r border-white/20 rounded-tr-3xl opacity-0 ${isLoaded ? "animate-fade-in" : ""} flex flex-col justify-between`}
          style={{ animationDelay: "0.4s" }}
        >
          <div>
            <button
              className="mb-6 flex items-center justify-center gap-2 rounded-full bg-blue-500 px-4 py-3 text-white w-full hover:bg-blue-600 transition-colors"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-5 w-5" />
              <span>Create</span>
            </button>

            {/* Mini Calendar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium">{formatCurrentMonth()}</h3>
                <div className="flex gap-1">
                  <button
                    className="p-1 rounded-full hover:bg-white/20"
                    onClick={() => {
                      const newDate = new Date(currentDate)
                      newDate.setMonth(newDate.getMonth() - 1)
                      setCurrentDate(newDate)
                    }}
                  >
                    <ChevronLeft className="h-4 w-4 text-white" />
                  </button>
                  <button
                    className="p-1 rounded-full hover:bg-white/20"
                    onClick={() => {
                      const newDate = new Date(currentDate)
                      newDate.setMonth(newDate.getMonth() + 1)
                      setCurrentDate(newDate)
                    }}
                  >
                    <ChevronRight className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                  <div key={i} className="text-xs text-white/70 font-medium py-1">
                    {day}
                  </div>
                ))}

                {miniCalendarDays.map((day, i) => (
                  <div
                    key={i}
                    className={`text-xs rounded-full w-7 h-7 flex items-center justify-center cursor-pointer ${
                      day && new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString() === new Date().toDateString()
                        ? "bg-blue-500 text-white"
                        : "text-white hover:bg-white/20"
                    } ${!day ? "invisible" : ""}`}
                    onClick={() => {
                      if (day) {
                        const newDate = new Date(currentDate)
                        newDate.setDate(day)
                        setCurrentDate(newDate)
                        setCurrentView("day")
                      }
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* My Calendars */}
            <div>
              <h3 className="text-white font-medium mb-3">My calendars</h3>
              <div className="space-y-2">
                {myCalendars.map((cal, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 cursor-pointer hover:bg-white/10 rounded p-1"
                    onClick={() => toggleCalendar(cal.name)}
                  >
                    <div
                      className={`w-3 h-3 rounded-sm ${cal.color} ${selectedCalendars[cal.name] ? "opacity-100" : "opacity-30"}`}
                    ></div>
                    <span
                      className={`text-white text-sm ${selectedCalendars[cal.name] ? "opacity-100" : "opacity-50"}`}
                    >
                      {cal.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* New position for the big plus button */}
          <button
            className="mt-6 flex items-center justify-center gap-2 rounded-full bg-blue-500 p-4 text-white w-14 h-14 self-start hover:bg-blue-600 transition-colors"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Calendar View */}
        <div
          className={`flex-1 flex flex-col opacity-0 ${isLoaded ? "animate-fade-in" : ""}`}
          style={{ animationDelay: "0.6s" }}
        >
          {/* Calendar Controls */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <div className="flex items-center gap-4">
              <button
                className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
                onClick={navigateToToday}
              >
                Today
              </button>
              <div className="flex">
                <button
                  className="p-2 text-white hover:bg-white/10 rounded-l-md transition-colors"
                  onClick={navigatePrevious}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  className="p-2 text-white hover:bg-white/10 rounded-r-md transition-colors"
                  onClick={navigateNext}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <h2 className="text-xl font-semibold text-white">{formatCurrentDate()}</h2>
            </div>

            <div className="flex items-center gap-2 rounded-md p-1">
              <button
                onClick={() => setCurrentView("day")}
                className={`px-3 py-1 rounded transition-colors ${currentView === "day" ? "bg-white/20" : "hover:bg-white/10"} text-white text-sm`}
              >
                Day
              </button>
              <button
                onClick={() => setCurrentView("week")}
                className={`px-3 py-1 rounded transition-colors ${currentView === "week" ? "bg-white/20" : "hover:bg-white/10"} text-white text-sm`}
              >
                Week
              </button>
              <button
                onClick={() => setCurrentView("month")}
                className={`px-3 py-1 rounded transition-colors ${currentView === "month" ? "bg-white/20" : "hover:bg-white/10"} text-white text-sm`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Week View */}
          <div className="flex-1 overflow-auto p-4">
            {currentView === "week" && (
            <div className="bg-white/20 backdrop-blur-lg rounded-xl border border-white/20 shadow-xl h-full">
              {/* Week Header */}
              <div className="grid grid-cols-8 border-b border-white/20">
                <div className="p-2 text-center text-white/50 text-xs"></div>
                {weekDates.map((date, i) => (
                  <div key={i} className="p-2 text-center border-l border-white/20">
                    <div className="text-xs text-white/70 font-medium">{weekDays[i]}</div>
                    <div
                      className={`text-lg font-medium mt-1 text-white ${
                        new Date().toDateString() === date.toDateString()
                          ? "bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                          : ""
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Grid */}
              <div className="grid grid-cols-8">
                {/* Time Labels */}
                <div className="text-white/70">
                  {timeSlots.map((time, i) => (
                    <div key={i} className="border-b border-white/10 pr-2 text-right text-xs" style={{ height: 60 }}>
                      {time === 12 ? "12 PM" : time > 12 ? `${time - 12} PM` : `${time} AM`}
                    </div>
                  ))}
                </div>

                {/* Days Columns */}
                {weekDates.map((date, dayIndex) => (
                  <div key={dayIndex} className="border-l border-white/20 relative">
                    {timeSlots.map((_, timeIndex) => (
                      <div key={timeIndex} className="border-b border-white/10" style={{ height: 60 }}></div>
                    ))}

                    {/* Events */}
                    {filteredEvents
                      .filter((event) => event.date === `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`)
                      .map((event) => {
                        const eventStyle = calculateEventStyle(event.startTime, event.endTime)
                        return (
                          <div
                            key={event.id}
                            className={`absolute ${event.color} rounded-md p-2 text-white text-xs shadow-md cursor-pointer transition-all duration-200 ease-in-out hover:translate-y-[-2px] hover:shadow-lg`}
                            style={{
                              ...eventStyle,
                              left: "4px",
                              right: "4px",
                            }}
                            onClick={() => handleEventClick(event)}
                          >
                            <div className="font-medium">{event.title}</div>
                            <div className="opacity-80 text-[10px] mt-1">{`${event.startTime} - ${event.endTime}`}</div>
                          </div>
                        )
                      })}
                  </div>
                ))}
              </div>
            </div>
            )}
            {currentView === "day" && (
              <div className="bg-white/20 backdrop-blur-lg rounded-xl border border-white/20 shadow-xl h-full">
                <div className="grid grid-cols-2 border-b border-white/20">
                  <div className="p-2 text-center text-white/50 text-xs"></div>
                  <div className="p-2 text-center border-l border-white/20">
                    <div className="text-xs text-white/70 font-medium">{weekDays[currentDate.getDay()]}</div>
                    <div className="text-lg font-medium mt-1 text-white">{currentDate.getDate()}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="text-white/70">
                    {timeSlots.map((time, i) => (
                      <div key={i} className="border-b border-white/10 pr-2 text-right text-xs" style={{ height: 60 }}>
                        {time === 12 ? "12 PM" : time > 12 ? `${time - 12} PM` : `${time} AM`}
                      </div>
                    ))}
                  </div>
                  <div className="border-l border-white/20 relative" style={{ height: timeSlots.length * 60 }}>
                    {timeSlots.map((_, i) => (
                      <div key={i} className="border-b border-white/10" style={{ height: 60 }}></div>
                    ))}
                    {filteredEvents
                      .filter((e) => e.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`)
                      .map((event) => {
                        const eventStyle = calculateEventStyle(event.startTime, event.endTime)
                        return (
                          <div
                            key={event.id}
                            className={`absolute ${event.color} rounded-md p-2 text-white text-xs shadow-md cursor-pointer transition-all duration-200 ease-in-out hover:translate-y-[-2px] hover:shadow-lg`}
                            style={{ ...eventStyle, left: "4px", right: "4px" }}
                            onClick={() => handleEventClick(event)}
                          >
                            <div className="font-medium">{event.title}</div>
                            <div className="opacity-80 text-[10px] mt-1">{`${event.startTime} - ${event.endTime}`}</div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            )}
            {currentView === "month" && (
              <div className="bg-white/20 backdrop-blur-lg rounded-xl border border-white/20 shadow-xl h-full">
                <div className="p-4">
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((d) => (
                      <div key={d} className="text-center text-xs text-white/70 font-medium py-1">{d}</div>
                    ))}
                    {miniCalendarDays.map((day, i) => {
                      const date = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null
                      const iso = date
                        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                        : ""
                      const dayEvents = date ? filteredEvents.filter((e) => e.date === iso) : []
                      return (
                        <div
                          key={i}
                          className={`min-h-24 border border-white/10 rounded-md p-2 ${day ? "text-white" : "invisible"}`}
                          onClick={() => {
                            if (day && date) {
                              setCurrentDate(date)
                              setCurrentView("day")
                            }
                          }}
                        >
                          <div className="text-xs opacity-80 mb-1">{day}</div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map((e) => (
                              <div key={e.id} className={`${e.color} text-[10px] rounded px-1 py-0.5`}>{e.title}</div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-[10px] text-white/70">+{dayEvents.length - 3} more</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white/90 backdrop-blur-lg p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Create New Event</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Event title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="flex-1 p-2 border rounded-md"
                  />
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="flex-1 p-2 border rounded-md"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
                <textarea
                  placeholder="Description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full p-2 border rounded-md h-20"
                />
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  onClick={handleCreateEvent}
                >
                  Create Event
                </button>
                <button
                  className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white/90 backdrop-blur-lg p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Settings</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Default View</h4>
                  <select className="w-full p-2 border rounded-md">
                    <option>Week</option>
                    <option>Day</option>
                    <option>Month</option>
                  </select>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Time Format</h4>
                  <select className="w-full p-2 border rounded-md">
                    <option>12 Hour</option>
                    <option>24 Hour</option>
                  </select>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Notifications</h4>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    Enable event reminders
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  onClick={() => setShowSettings(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Popup */}
        {showAIPopup && (
          <div className="fixed bottom-8 right-8 z-20">
            <div className="w-[450px] relative bg-gradient-to-br from-blue-400/30 via-blue-500/30 to-blue-600/30 backdrop-blur-lg p-6 rounded-2xl shadow-xl border border-blue-300/30 text-white">
              <button
                onClick={() => setShowAIPopup(false)}
                className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-blue-300" />
                </div>
                <div className="min-h-[80px]">
                  <p className="text-base font-light">{typedText}</p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={togglePlay}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm transition-colors font-medium"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowAIPopup(false)}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm transition-colors font-medium"
                >
                  No
                </button>
              </div>
              {isPlaying && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-white text-sm hover:bg-white/20 transition-colors"
                    onClick={togglePlay}
                  >
                    <Pause className="h-4 w-4" />
                    <span>Pause Hans Zimmer</span>
                  </button>
                  <div className="text-xs text-white/70">♪ Interstellar - Main Theme</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Event Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${(selectedEvent as any).color} p-6 rounded-lg shadow-xl max-w-md w-full mx-4`}>
              <h3 className="text-2xl font-bold mb-4 text-white">{(selectedEvent as any).title}</h3>
              <div className="space-y-3 text-white">
                <p className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  {`${(selectedEvent as any).startTime} - ${(selectedEvent as any).endTime}`}
                </p>
                <p className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  {(selectedEvent as any).location}
                </p>
                <p className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  {new Date((selectedEvent as any).date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="flex items-start">
                  <Users className="mr-2 h-5 w-5 mt-1" />
                  <span>
                    <strong>Attendees:</strong>
                    <br />
                    {((selectedEvent as any).attendees || []).join(", ") || "No attendees"}
                  </span>
                </p>
                <p>
                  <strong>Organizer:</strong> {(selectedEvent as any).organizer}
                </p>
                <p>
                  <strong>Description:</strong> {(selectedEvent as any).description}
                </p>
              </div>
              <div className="mt-6 flex justify-between">
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                  onClick={() => setEvents((prev) => prev.filter((e) => e.id !== (selectedEvent as any).id))}
                >
                  Delete
                </button>
                <button
                  className="bg-white text-gray-800 px-4 py-2 rounded hover:bg-gray-100 transition-colors"
                  onClick={() => setSelectedEvent(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
