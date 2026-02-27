import React, { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Modal, Button, Separator, TextArea, TextField, Input, toast } from '@heroui/react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { Appointment, Report, Photo } from '@/types/scheduling'
import {
  Save,
  Plus,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  Play,
  Pause,
  Square,
  MapPin,
} from 'lucide-react'

const MapView = dynamic(() => import('./MapView'), { ssr: false })
import { generateId } from '@/lib/generate-id'
import { formatTime, isSameDate } from '@/lib/calendar-utils'
import imageCompression from 'browser-image-compression'
import { useTranslation } from '@/components/Providers'
import { useLanguage } from '@/hooks/useLanguage'
import ElapsedTimer from './ElapsedTimer'
import { Alert } from '../Alert'

/** Haversine distance between two coordinates, returns meters */
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

interface PhotoUrlContext {
  firmaID: string
  appointmentId: string
  reportId: string
}

const getPhotoUrl = (url: string, context: PhotoUrlContext): string => {
  if (!url) return ''
  if (url.startsWith('/api/files/buckets/')) return url
  const { firmaID, appointmentId, reportId } = context
  return `/api/files/buckets/images/${firmaID}/${appointmentId}/${reportId}/${url}`
}

interface AppointmentReportProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment | null
}

export default function AppointmentReport({
  isOpen,
  onClose,
  appointment: propAppointment,
}: AppointmentReportProps) {
  const {
    updateAppointment,
    upsertReport,
    user,
    openAppointment,
    closeAppointment,
    deleteAppointment,

    appointments,
    reports: allReports,
  } = useScheduling()
  const { t } = useTranslation()
  const lang = useLanguage()

  const appointment = React.useMemo(() => {
    if (!propAppointment) return null
    return appointments.find(a => a.id === propAppointment.id) || propAppointment
  }, [appointments, propAppointment])

  const [reportSessions, setReportSessions] = useState<Report[]>([])
  const [currentReportId, setCurrentReportId] = useState<string>('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({})
  const [dirtyNotes, setDirtyNotes] = useState<Record<string, boolean>>({})
  const [isSavingNotes, setIsSavingNotes] = useState<Record<string, boolean>>({})
  const [isStarting, setIsStarting] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [isPausing, setIsPausing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStage, setUploadStage] = useState<
    'idle' | 'converting' | 'compressing' | 'uploading'
  >('idle')
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [mapModal, setMapModal] = useState<{ lat: number; lng: number; address?: string } | null>(
    null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photosContainerRef = useRef<HTMLDivElement>(null)
  const scrollOnNextUpdate = useRef(false)

  const selectedPhoto = photos.find(p => p.id === selectedPhotoId)

  // Load sessions from context when modal opens
  React.useEffect(() => {
    if (isOpen && appointment) {
      const sessions = allReports
        .filter(r => r.appointmentId === appointment.id)
        .sort((a, b) => {
          const aTime = a.openAt ? new Date(a.openAt).getTime() : 0
          const bTime = b.openAt ? new Date(b.openAt).getTime() : 0
          return aTime - bTime
        })
      setReportSessions(sessions)

      // Find active work session (type=0, opened but not closed) — only when appointment itself is open
      const active = appointment.isOpen
        ? [...sessions].reverse().find(s => s.type === 0 && s.openAt && !s.closeAt)
        : undefined
      setCurrentReportId(active?.id || '')
      // When there's an active session, show its photos; otherwise show all photos from all sessions
      if (active) {
        setPhotos(active.photos || [])
      } else {
        const allPhotos = sessions.flatMap(s => s.photos || [])
        setPhotos(allPhotos)
      }

      // Auto-close orphaned work sessions (type=0 only): opened but never closed while appointment is already closed
      // Proxy sessions (type=1) don't need closing — they are just photo containers
      if (!appointment.isOpen) {
        const orphaned = sessions.filter(s => s.type === 0 && s.openAt && !s.closeAt)
        orphaned.forEach(s => {
          fetch(`/api/reports/${s.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ close: true }),
          }).catch(err =>
            console.warn('[AppointmentReport] Failed to auto-close orphaned session:', err)
          )
        })
      }

      const notes: Record<string, string> = {}
      sessions.forEach(s => {
        notes[s.id] = s.notes || ''
      })
      setSessionNotes(notes)
      setDirtyNotes({})
      setIsSavingNotes({})
    }
  }, [isOpen, appointment?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setReportSessions([])
      setCurrentReportId('')
      setPhotos([])
      setSessionNotes({})
      setDirtyNotes({})
      setIsSavingNotes({})
    }
  }, [isOpen])

  React.useEffect(() => {
    if (scrollOnNextUpdate.current && photosContainerRef.current) {
      setTimeout(() => {
        if (photosContainerRef.current) {
          photosContainerRef.current.scrollTo({
            left: photosContainerRef.current.scrollWidth,
            behavior: 'smooth',
          })
        }
      }, 100)
      scrollOnNextUpdate.current = false
    }
  }, [photos])

  async function getGeoData(
    clientLat?: number,
    clientLon?: number,
    posOptions?: PositionOptions
  ): Promise<{ lat?: number; lon?: number; address?: string; distance?: number }> {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve({})
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const lat = pos.coords.latitude
          const lon = pos.coords.longitude
          let address: string | undefined
          let distance: number | undefined
          try {
            const r = await fetch(`/api/photon/reverse?lat=${lat}&lon=${lon}&lang=${lang}`)
            const d = await r.json()
            const p = d.features?.[0]?.properties
            if (p) {
              address = [p.street, p.housenumber, p.postcode, p.city].filter(Boolean).join(' ')
            }
          } catch {}
          if (clientLat && clientLon) {
            distance = haversineMeters(lat, lon, clientLat, clientLon)
          }
          resolve({ lat, lon, address, distance })
        },
        () => resolve({}),
        posOptions ?? { enableHighAccuracy: true, timeout: 5000 }
      )
    })
  }

  const handleStart = async () => {
    if (!appointment || !user) return
    setIsStarting(true)

    // Generate ID client-side — no need to wait for server to know the reportID
    const reportIdToUpdate = generateId()
    const clientLat = appointment.client?.latitude
    const clientLon = appointment.client?.longitude
    // confirmedSession is built after step 1 with the server-determined openAt
    let confirmedSession: Report | undefined

    try {
      // Step 1: create report — openAt is set by DB server via NOW()
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportID: reportIdToUpdate,
          type: 0, // work session
          appointmentId: appointment.id,
          workerId: user.myWorkerID || appointment.workerId,
          firmaID: user.firmaID,
        }),
      })
      if (!res.ok) throw new Error('Failed to create report session')
      const { report } = await res.json()

      // Use server-determined openAt so timer reflects server clock
      const serverOpenAt = new Date(report.openAt)
      confirmedSession = {
        id: reportIdToUpdate,
        firmaID: user.firmaID,
        type: 0,
        workerId: user.myWorkerID || appointment.workerId,
        appointmentId: appointment.id,
        notes: '',
        date: serverOpenAt,
        photos: [],
        openAt: serverOpenAt,
      }

      const updatedSessions: Report[] = [...reportSessions, confirmedSession]
      setReportSessions(updatedSessions)
      setCurrentReportId(reportIdToUpdate)
      setPhotos([])
      setSessionNotes(prev => ({ ...prev, [reportIdToUpdate]: '' }))
      upsertReport(confirmedSession)

      openAppointment(appointment.id, user.myWorkerID!)
      updateAppointment(
        {
          ...appointment,
          isOpen: true,
          openedAt: serverOpenAt,
          closedAt: undefined,
          reports: updatedSessions,
        },
        true
      )
    } catch (err) {
      console.error('[handleStart] Error:', err)
      toast.danger(t('appointment.report.startError'))
    } finally {
      setIsStarting(false)
    }

    if (!confirmedSession) return // step 1 failed — skip geo

    // Step 2: fire-and-forget geo update — runs in background, doesn't block UI
    getGeoData(clientLat, clientLon, {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 30000,
    }).then(geo => {
      if (!geo.lat && !geo.lon && !geo.address && geo.distance == null) return

      fetch(`/api/reports/${reportIdToUpdate}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openLatitude: geo.lat,
          openLongitude: geo.lon,
          openAddress: geo.address,
          openDistanceToAppointment: geo.distance,
        }),
      }).catch(err => console.warn('[handleStart] geo patch failed:', err))

      const geoUpdatedSession = {
        ...confirmedSession,
        openLatitude: geo.lat,
        openLongitude: geo.lon,
        openAddress: geo.address,
        openDistanceToAppointment: geo.distance,
      }

      // Always update global context so next modal open reads fresh geo without API call
      upsertReport(geoUpdatedSession)

      // Update local sessions list if modal is still open (prev may be [] if modal was closed — safe, map returns [] unchanged)
      setReportSessions(prev => prev.map(s => (s.id === reportIdToUpdate ? geoUpdatedSession : s)))
    })
  }

  const handleFinish = async () => {
    if (!appointment || !currentReportId) return
    setIsFinishing(true)

    // Capture snapshots before any state resets
    const reportIdToUpdate = currentReportId
    const sessionSnapshot = reportSessions.find(s => s.id === reportIdToUpdate)
    const clientLat = appointment.client?.latitude
    const clientLon = appointment.client?.longitude
    // confirmedCloseAt is set after step 1 with the server-determined closeAt
    let confirmedCloseAt: Date | undefined

    try {
      // Step 1: close session — closeAt is set by DB server via NOW()
      const res = await fetch(`/api/reports/${reportIdToUpdate}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ close: true }),
      })
      if (!res.ok) throw new Error('Failed to close report session')
      const { report } = await res.json()

      // Use server-determined closeAt to prevent client clock manipulation
      confirmedCloseAt = new Date(report.closeAt)

      const updatedSessions = reportSessions.map(s =>
        s.id === reportIdToUpdate ? { ...s, closeAt: confirmedCloseAt } : s
      )
      setReportSessions(updatedSessions)
      setCurrentReportId('')
      const updatedSession = updatedSessions.find(s => s.id === reportIdToUpdate)
      if (updatedSession) upsertReport(updatedSession)

      closeAppointment(appointment.id)
      updateAppointment(
        { ...appointment, isOpen: false, closedAt: confirmedCloseAt, reports: updatedSessions },
        true
      )
    } catch (err) {
      console.error('[handleFinish] Error:', err)
      toast.danger(t('appointment.report.finishError'))
    } finally {
      setIsFinishing(false)
    }

    if (!confirmedCloseAt) return // step 1 failed — skip geo

    // Step 2: fire-and-forget geo update — runs in background, doesn't block UI
    // maximumAge: 30 s accepts a cached position if the browser already has one
    // timeout: 30 s — enough for a fresh GPS fix on mobile
    getGeoData(clientLat, clientLon, {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 30000,
    }).then(geo => {
      if (!geo.lat && !geo.lon && !geo.address && geo.distance == null) return

      fetch(`/api/reports/${reportIdToUpdate}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closeLatitude: geo.lat,
          closeLongitude: geo.lon,
          closeAddress: geo.address,
          closeDistanceToAppointment: geo.distance,
        }),
      }).catch(err => console.warn('[handleFinish] geo patch failed:', err))

      if (!sessionSnapshot) return

      const geoUpdatedSession = {
        ...sessionSnapshot,
        closeAt: confirmedCloseAt,
        closeLatitude: geo.lat,
        closeLongitude: geo.lon,
        closeAddress: geo.address,
        closeDistanceToAppointment: geo.distance,
      }

      // Always update global context so next modal open reads fresh geo without API call
      upsertReport(geoUpdatedSession)

      // Update local sessions list if modal is still open (prev may be [] if modal was closed — safe, map returns [] unchanged)
      setReportSessions(prev => prev.map(s => (s.id === reportIdToUpdate ? geoUpdatedSession : s)))
    })
  }

  const handlePause = () => {
    if (!appointment) return
    setIsPausing(true)
    closeAppointment(appointment.id)
    setIsPausing(false)
  }

  const handleSaveNotes = async (reportId: string) => {
    setIsSavingNotes(prev => ({ ...prev, [reportId]: true }))
    try {
      await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: sessionNotes[reportId] }),
      })
      const updatedSessions = reportSessions.map(s =>
        s.id === reportId ? { ...s, notes: sessionNotes[reportId] } : s
      )
      setReportSessions(updatedSessions)
      setDirtyNotes(prev => ({ ...prev, [reportId]: false }))
      const updatedSession = updatedSessions.find(s => s.id === reportId)
      if (updatedSession) upsertReport(updatedSession)
      if (appointment) updateAppointment({ ...appointment, reports: updatedSessions }, true)
    } catch (err) {
      console.error('[handleSaveNotes] Error:', err)
      toast.danger(t('appointment.report.saveError'))
    } finally {
      setIsSavingNotes(prev => ({ ...prev, [reportId]: false }))
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    setIsUploading(true)
    const originalFile = e.target.files[0]

    try {
      let fileToCompress: File = originalFile

      const isHeic =
        originalFile.type === 'image/heic' ||
        originalFile.type === 'image/heif' ||
        originalFile.name.toLowerCase().endsWith('.heic') ||
        originalFile.name.toLowerCase().endsWith('.heif')

      if (isHeic) {
        setUploadStage('converting')
        const heicFormData = new FormData()
        heicFormData.append('file', originalFile)
        const convertResponse = await fetch('/api/convert-heic', {
          method: 'POST',
          body: heicFormData,
        })
        const convertData = await convertResponse.json()
        if (!convertResponse.ok) {
          throw new Error(convertData.details || convertData.error || 'HEIC conversion failed')
        }
        const byteCharacters = atob(convertData.data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'image/jpeg' })
        fileToCompress = new File([blob], convertData.originalName, { type: 'image/jpeg' })
      }

      setUploadStage('compressing')
      const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg',
      }
      const compressedFile = await imageCompression(fileToCompress, compressionOptions)

      setUploadStage('uploading')

      // Auto-create session if none is active
      let activeReportId = currentReportId
      if (!activeReportId) {
        if (!user?.firmaID || !appointment?.id) throw new Error('Missing required data')
        const openAt = new Date()
        const createRes = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 1, // proxy session — photo container
            appointmentId: appointment.id,
            workerId: user.myWorkerID || appointment.workerId,
            firmaID: user.firmaID,
          }),
        })
        if (!createRes.ok) throw new Error('Failed to auto-create proxy report session')
        const { report } = await createRes.json()
        const newSession: Report = {
          id: report.reportID,
          firmaID: report.firmaID,
          type: 1,
          workerId: report.workerId,
          appointmentId: report.appointmentId,
          notes: '',
          date: report.date || openAt,
          photos: [],
          openAt: report.openAt,
        }
        activeReportId = newSession.id
        setCurrentReportId(activeReportId)
        setReportSessions(prev => [...prev, newSession])
        setSessionNotes(prev => ({ ...prev, [newSession.id]: '' }))
        upsertReport(newSession)
      }

      if (!user?.firmaID || !appointment?.id) throw new Error('Missing required data')

      const formData = new FormData()
      const fileName = originalFile.name.replace(/\.[^.]+$/, '.jpeg')
      formData.append('file', compressedFile, fileName)
      formData.append('firmaID', user.firmaID)
      formData.append('appointmentId', appointment.id)
      formData.append('reportId', activeReportId)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.details || data.error || 'Upload failed')

      // Save photo to DB + move to permanent storage
      const saveRes = await fetch('/api/reports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: activeReportId,
          photo: { id: data.photoId, url: data.url, note: '' },
        }),
      })
      const saveData = await saveRes.json()
      const savedPhoto: Photo = {
        id: data.photoId,
        url: saveData.photo?.url || data.url,
        note: '',
      }

      setPhotos(prev => [...prev, savedPhoto])
      scrollOnNextUpdate.current = true

      setReportSessions(prev => {
        const updated = prev.map(s =>
          s.id === activeReportId ? { ...s, photos: [...(s.photos || []), savedPhoto] } : s
        )
        // Sync to context outside of setState to avoid "Cannot update a component while rendering" error
        queueMicrotask(() => {
          const updatedSession = updated.find(s => s.id === activeReportId)
          if (updatedSession) upsertReport(updatedSession)
          if (appointment) updateAppointment({ ...appointment, reports: updated }, true)
        })
        return updated
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      const errorMessage =
        error instanceof Error ? error.message : t('appointment.report.unknownError')
      toast.danger(`${t('appointment.report.uploadError')} ${errorMessage}`)
    } finally {
      setIsUploading(false)
      setUploadStage('idle')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id))
    setReportSessions(prev => {
      // Find which session owns this photo — don't rely on currentReportId
      // because it may be '' when all sessions are closed
      const ownerSessionId =
        currentReportId || prev.find(s => (s.photos || []).some(p => p.id === id))?.id
      const updated = prev.map(s =>
        s.id === ownerSessionId ? { ...s, photos: (s.photos || []).filter(p => p.id !== id) } : s
      )
      // Sync to context outside of setState to avoid "Cannot update a component while rendering" error
      queueMicrotask(() => {
        const updatedSession = updated.find(s => s.id === ownerSessionId)
        if (updatedSession) upsertReport(updatedSession)
        if (appointment) updateAppointment({ ...appointment, reports: updated }, true)
      })
      return updated
    })
    fetch(`/api/reports/photos/${id}`, { method: 'DELETE' }).catch(err =>
      console.error('[handleRemovePhoto] Error:', err)
    )
  }

  const handlePhotoNoteChange = (id: string, note: string) => {
    setPhotos(prev => prev.map(p => (p.id === id ? { ...p, note } : p)))
  }

  const formatSessionDuration = (openAt?: Date, closeAt?: Date) => {
    if (!openAt) return ''
    const diffSeconds = Math.floor(
      ((closeAt ? new Date(closeAt) : new Date()).getTime() - new Date(openAt).getTime()) / 1000
    )
    // Round up; for closed sessions guarantee at least 1 min even if timestamps are equal
    const mins = closeAt ? Math.max(1, Math.ceil(diffSeconds / 60)) : Math.ceil(diffSeconds / 60)
    if (mins < 60) return `${mins} ${t('appointment.report.min')}`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m === 0
      ? `${h} ${t('appointment.report.hour')}`
      : `${h} ${t('appointment.report.hour')} ${m} ${t('appointment.report.min')}`
  }

  const formatDistance = (meters: number) =>
    meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`

  if (!appointment) return null

  const startTime = new Date(appointment.startTime)
  const endTime = new Date(appointment.endTime)

  return (
    <>
      <Modal>
        <Modal.Backdrop
          isOpen={isOpen}
          onOpenChange={open => {
            if (!open) onClose()
          }}
          variant="blur"
        >
          <Modal.Container className="max-w-2xl" size="lg">
            <Modal.Dialog className="max-h-[90vh] overflow-y-auto">
              <Modal.CloseTrigger />

              <Modal.Header>
                <div className="flex items-center justify-between w-full">
                  <h2 className="text-xl font-bold">{t('appointment.report.title')}</h2>
                  {(() => {
                    const closedSessionsSeconds = reportSessions
                      .filter(s => s.type === 0 && s.openAt && s.closeAt)
                      .reduce(
                        (acc, s) =>
                          acc +
                          Math.floor(
                            (new Date(s.closeAt!).getTime() - new Date(s.openAt!).getTime()) / 1000
                          ),
                        0
                      )
                    const activeSession = currentReportId
                      ? reportSessions.find(s => s.id === currentReportId && s.openAt && !s.closeAt)
                      : undefined
                    const timerOpenedAt = activeSession?.openAt
                      ? new Date(activeSession.openAt)
                      : undefined
                    const showTimer = closedSessionsSeconds > 0 || !!timerOpenedAt
                    return showTimer ? (
                      <ElapsedTimer
                        openedAt={timerOpenedAt}
                        offsetSeconds={closedSessionsSeconds}
                        className="text-base px-6"
                      />
                    ) : null
                  })()}
                </div>
                {user?.status === 1 && isSameDate(appointment.date, new Date()) ? (
                  <div className="flex items-center gap-2 w-full">
                    <Button
                      size="sm"
                      className="gap-2 bg-green-500! text-white! hover:bg-green-600!"
                      isDisabled={appointment?.isOpen || isStarting}
                      onPress={handleStart}
                    >
                      {isStarting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {t('appointment.edit.start')}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-2 bg-yellow-500! text-white! hover:bg-yellow-600!"
                      isDisabled={!appointment?.isOpen || isPausing}
                      onPress={handlePause}
                    >
                      {isPausing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Pause className="w-4 h-4" />
                      )}
                      {t('appointment.edit.pause')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="gap-2 ml-auto"
                      isDisabled={!appointment?.isOpen || isFinishing}
                      onPress={handleFinish}
                    >
                      {isFinishing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      {t('appointment.edit.finish')}
                    </Button>
                  </div>
                ) : null}
              </Modal.Header>

              <Modal.Body className="gap-6">
                {/* Appointment Details (Read-only) */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-default-50 rounded-lg">
                  <div>
                    <p className="text-xs text-default-500 uppercase font-semibold">
                      {t('appointment.report.client')}
                    </p>
                    <p className="font-medium">
                      {appointment.client?.name} {appointment.client?.surname}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-default-500 uppercase font-semibold">
                      {t('appointment.report.staff')}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {appointment.worker.map(w => (
                        <span
                          key={w.id}
                          className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm"
                        >
                          {w.name} {w.surname}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-default-500 uppercase font-semibold">
                      {t('appointment.report.time')}
                    </p>
                    <p className="font-medium">
                      {appointment.date.toLocaleDateString('de-DE')} | {formatTime(startTime)} -{' '}
                      {formatTime(endTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-default-500 uppercase font-semibold">
                      {t('appointment.report.duration')}
                    </p>
                    <p className="font-medium">
                      {appointment.duration} {t('appointment.report.min')}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-default-500 uppercase font-semibold">
                      {t('appointment.report.services')}
                    </p>
                    <ul className="list-disc list-inside text-sm">
                      {appointment.services.map(s => (
                        <li key={s.id}>{s.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Separator />

                {/* Report Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">{t('appointment.report.report')}</h3>
                  </div>

                  {/* Report Sessions List — only work sessions (type=0), not proxy photo containers */}
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {reportSessions.filter(s => s.type === 0).length === 0 && (
                      <p className="text-sm text-default-400 italic">
                        {t('appointment.report.noSessions')}
                      </p>
                    )}
                    {[...reportSessions]
                      .filter(s => s.type === 0)
                      .sort(
                        (a, b) =>
                          (b.openAt ? new Date(b.openAt).getTime() : 0) -
                          (a.openAt ? new Date(a.openAt).getTime() : 0)
                      )
                      .map((session, index, arr) => (
                        <div key={session.id}>
                          <div className="p-1 bg-default-50 rounded-lg space-y-1">
                            {/* Row 1: Time range + open geo */}
                            <div className="flex items-baseline justify-between gap-2 text-sm">
                              <p className="font-medium shrink-0">
                                {session.openAt && formatTime(new Date(session.openAt))}
                                {session.closeAt && ` → ${formatTime(new Date(session.closeAt))}`}
                              </p>
                              {(session.openAddress ||
                                session.openDistanceToAppointment != null) && (
                                <button
                                  type="button"
                                  className="text-xs text-default-500 text-right truncate hover:text-primary cursor-pointer inline-flex items-center gap-0.5 transition-colors"
                                  onClick={() => {
                                    if (
                                      session.openLatitude != null &&
                                      session.openLongitude != null
                                    ) {
                                      setMapModal({
                                        lat: session.openLatitude,
                                        lng: session.openLongitude,
                                        address: session.openAddress || undefined,
                                      })
                                    }
                                  }}
                                >
                                  <MapPin className="w-3 h-3 shrink-0" />▶ {session.openAddress}
                                  {session.openDistanceToAppointment != null &&
                                    ` ${formatDistance(session.openDistanceToAppointment)}`}
                                </button>
                              )}
                            </div>
                            {/* Row 2: Duration + close geo */}
                            <div className="flex items-baseline justify-between gap-2 text-sm">
                              <p className="text-xs text-default-400 shrink-0">
                                {formatSessionDuration(
                                  session.openAt ? new Date(session.openAt) : undefined,
                                  session.closeAt ? new Date(session.closeAt) : undefined
                                )}
                              </p>
                              {(session.closeAddress ||
                                session.closeDistanceToAppointment != null) && (
                                <button
                                  type="button"
                                  className="text-xs text-default-500 text-right truncate hover:text-primary cursor-pointer inline-flex items-center gap-0.5 transition-colors"
                                  onClick={() => {
                                    if (
                                      session.closeLatitude != null &&
                                      session.closeLongitude != null
                                    ) {
                                      setMapModal({
                                        lat: session.closeLatitude,
                                        lng: session.closeLongitude,
                                        address: session.closeAddress || undefined,
                                      })
                                    }
                                  }}
                                >
                                  <MapPin className="w-3 h-3 shrink-0" />■ {session.closeAddress}
                                  {session.closeDistanceToAppointment != null &&
                                    ` ${formatDistance(session.closeDistanceToAppointment)}`}
                                </button>
                              )}
                            </div>
                            {/* Row 3: Notes (full width) */}
                            <div className="flex items-start gap-1 pt-1">
                              <TextField className="flex-1 mb-0">
                                <TextArea
                                  rows={2}
                                  placeholder={t('appointment.report.notesPlaceholder')}
                                  value={sessionNotes[session.id] || ''}
                                  onChange={e => {
                                    setSessionNotes(prev => ({
                                      ...prev,
                                      [session.id]: e.target.value,
                                    }))
                                    setDirtyNotes(prev => ({ ...prev, [session.id]: true }))
                                  }}
                                />
                              </TextField>
                              {dirtyNotes[session.id] && (
                                <button
                                  onClick={() => handleSaveNotes(session.id)}
                                  disabled={isSavingNotes[session.id]}
                                  className="mt-1 p-1 text-primary hover:text-primary/80 disabled:opacity-50"
                                >
                                  {isSavingNotes[session.id] ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          {index < arr.length - 1 && <Separator className="my-1" />}
                        </div>
                      ))}
                  </div>

                  {/* Photos Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">{t('appointment.report.photos')}</h3>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => fileInputRef.current?.click()}
                        isDisabled={isUploading}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {t('appointment.report.addPhoto')}
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                    </div>

                    {isUploading && (
                      <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        <span className="text-sm text-primary font-medium">
                          {uploadStage === 'converting' && t('appointment.report.convertingHeic')}
                          {uploadStage === 'compressing' &&
                            t('appointment.report.compressingImage')}
                          {uploadStage === 'uploading' && t('appointment.report.uploading')}
                        </span>
                      </div>
                    )}

                    <div ref={photosContainerRef} className="flex gap-4 overflow-x-auto pb-2">
                      {photos.map(photo => (
                        <div
                          key={photo.id}
                          className="relative aspect-3/4 bg-default-100 rounded-lg overflow-hidden group shrink-0 w-48"
                        >
                          <img
                            src={getPhotoUrl(photo.url, {
                              firmaID: user?.firmaID || '',
                              appointmentId: appointment?.id || '',
                              reportId: currentReportId,
                            })}
                            alt="Report photo"
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setSelectedPhotoId(photo.id)}
                          />
                          <button
                            onClick={() => handleRemovePhoto(photo.id)}
                            className="absolute top-1 right-1 z-20 bg-black/50 text-white p-1 rounded-full"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="absolute rounded-b-lg bottom-0 left-0 right-0 p-2 bg-transparent backdrop-blur-sm">
                            <Input
                              placeholder={t('appointment.report.descriptionPlaceholder')}
                              value={photo.note}
                              onChange={e => handlePhotoNoteChange(photo.id, e.target.value)}
                              className="bg-transparent text-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer>
                {user?.status === 0 && (
                  <Alert
                    variant="danger"
                    title={t('appointment.edit.delete')}
                    description={t('appointment.edit.confirmDelete')}
                    onConfirm={() => {
                      if (appointment) {
                        deleteAppointment(appointment.id)
                        onClose()
                      }
                    }}
                  />
                )}
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Fullscreen photo viewer */}
      <Modal>
        <Modal.Backdrop
          isOpen={!!selectedPhotoId}
          onOpenChange={open => {
            if (!open) setSelectedPhotoId(null)
          }}
          variant="blur"
        >
          <Modal.Container size="cover">
            <Modal.Dialog className="h-full flex flex-col bg-black/90 p-0">
              <Modal.CloseTrigger className="z-50" />
              {selectedPhoto && (
                <Modal.Body className="relative flex-1 flex items-center justify-center bg-default-100 rounded-lg overflow-hidden group min-h-0">
                  <img
                    src={getPhotoUrl(selectedPhoto.url, {
                      firmaID: user?.firmaID || '',
                      appointmentId: appointment?.id || '',
                      reportId: currentReportId,
                    })}
                    alt="Report photo"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                  <div className="absolute bottom-0 left-0 right-0 rounded-b-lg p-2 bg-transparent backdrop-blur-sm">
                    <Input
                      className="bg-transparent text-white!"
                      placeholder={t('appointment.report.descriptionPlaceholder')}
                      value={selectedPhoto.note}
                      onChange={e => handlePhotoNoteChange(selectedPhoto.id, e.target.value)}
                    />
                  </div>
                </Modal.Body>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Map Modal — Container must be INSIDE Backdrop */}
      <Modal>
        <Modal.Backdrop
          isOpen={!!mapModal}
          onOpenChange={open => {
            if (!open) setMapModal(null)
          }}
          style={{ zIndex: 100 }}
        >
          <Modal.Container className="sm:max-w-lg">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <h2 className="text-lg font-semibold truncate">
                  {mapModal?.address || 'Location'}
                </h2>
              </Modal.Header>
              <Modal.Body className="p-0">
                {mapModal && (
                  <div className="h-[400px]">
                    <MapView lat={mapModal.lat} lng={mapModal.lng} address={mapModal.address} />
                  </div>
                )}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  )
}
