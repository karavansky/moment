import React, { useState, useRef } from 'react'
import { Modal, Button, Separator, TextArea, TextField, Label, Input } from '@heroui/react'
import { useScheduling } from '@/contexts/SchedulingContext'
import { Appointment, Report, Photo } from '@/types/scheduling'
import { Save, Plus, X, Upload, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { formatTime } from '@/lib/calendar-utils'
import imageCompression from 'browser-image-compression'
import { generateId } from '@/lib/generate-id'

interface PhotoUrlContext {
  firmaID: string
  appointmentId: string
  reportId: string
}

/**
 * Строит полный URL фото используя контекст
 * - Если URL уже содержит полный путь (/api/files/buckets/...) - возвращает как есть
 * - Если URL - просто имя файла - строит путь: /api/files/buckets/images/{firmaID}/{appointmentId}/{reportId}/{filename}
 */
const getPhotoUrl = (url: string, context: PhotoUrlContext): string => {
  if (!url) return ''
  // Новый формат: уже содержит полный путь
  if (url.startsWith('/api/files/buckets/')) {
    return url
  }
  // Строим полный путь из контекста
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
  appointment,
}: AppointmentReportProps) {
  const { updateAppointment, user } = useScheduling()
  const [reportNote, setReportNote] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStage, setUploadStage] = useState<
    'idle' | 'converting' | 'compressing' | 'uploading'
  >('idle')
  const [reportId, setReportId] = useState<string>('')
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedPhoto = photos.find(p => p.id === selectedPhotoId)

  // Reset state when opening for a new appointment
  React.useEffect(() => {
    if (isOpen && appointment) {
      // If there are existing reports, maybe load the last one to edit?
      // For now, let's assume we are adding a new report or just viewing.
      // If we want to edit the LAST report:
      const lastReport =
        appointment.reports && appointment.reports.length > 0
          ? appointment.reports[appointment.reports.length - 1]
          : null

      if (lastReport) {
        setReportNote(lastReport.notes || '')
        setPhotos(lastReport.photos || [])
        setReportId(lastReport.id)
      } else {
        setReportNote('')
        setPhotos([])
        // Генерируем новый reportId для нового отчета
        setReportId(generateId())
      }
    }
  }, [isOpen, appointment?.id]) // Используем appointment.id для точного отслеживания смены appointment

  // Сбрасываем state при закрытии модала
  React.useEffect(() => {
    if (!isOpen) {
      setReportNote('')
      setPhotos([])
      setReportId('')
    }
  }, [isOpen])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    setIsUploading(true)
    const originalFile = e.target.files[0]

    try {
      let fileToCompress: File = originalFile

      // Check if file is HEIC/HEIF format (Apple) and convert to JPEG
      const isHeic =
        originalFile.type === 'image/heic' ||
        originalFile.type === 'image/heif' ||
        originalFile.name.toLowerCase().endsWith('.heic') ||
        originalFile.name.toLowerCase().endsWith('.heif')

      if (isHeic) {
        setUploadStage('converting')
        console.log('Converting HEIC to JPEG via server...')

        // Server-side conversion (more reliable than browser-based heic2any)
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

        // Convert base64 back to File
        const byteCharacters = atob(convertData.data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'image/jpeg' })

        fileToCompress = new File([blob], convertData.originalName, {
          type: 'image/jpeg',
        })
        console.log(`Converted HEIC to JPEG: ${(fileToCompress.size / 1024 / 1024).toFixed(2)} MB`)
      }

      setUploadStage('compressing')
      // Compress image before upload
      const compressionOptions = {
        maxSizeMB: 1, // Max file size in MB
        maxWidthOrHeight: 1920, // Max dimension (maintains aspect ratio)
        useWebWorker: true, // Use web worker for better performance
        fileType: 'image/jpeg', // Convert to JPEG for better compression
      }

      console.log(
        `Original file: ${originalFile.name}, size: ${(originalFile.size / 1024 / 1024).toFixed(2)} MB`
      )

      const compressedFile = await imageCompression(fileToCompress, compressionOptions)

      console.log(
        `Compressed file: ${compressedFile.name}, size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`
      )

      setUploadStage('uploading')

      if (!user?.firmaID || !appointment?.id || !reportId) {
        throw new Error('Missing required data: firmaID, appointmentId, or reportId')
      }

      const formData = new FormData()
      // Keep original filename but ensure .jpeg extension for compressed file
      const fileName = originalFile.name.replace(/\.[^.]+$/, '.jpeg')
      formData.append('file', compressedFile, fileName)
      formData.append('firmaID', user.firmaID)
      formData.append('appointmentId', appointment.id)
      formData.append('reportId', reportId)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Upload response error:', data)
        throw new Error(data.details || data.error || 'Upload failed')
      }
      // data.url is the public URL from the upload route
      // data.photoId is the generated photo ID
      const newPhoto: Photo = {
        id: data.photoId,
        url: data.url,
        note: '', // Description for the photo
      }

      setPhotos(prev => [...prev, newPhoto])
    } catch (error) {
      // Enhanced error logging for debugging
      console.error('Error uploading file:', error)
      console.error('Error type:', typeof error)
      console.error('Error constructor:', error?.constructor?.name)
      console.error('Error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error || {})))
      if (error instanceof Error) {
        console.error('Error name:', error.name)
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      } else if (error && typeof error === 'object') {
        console.error('Error keys:', Object.keys(error))
        console.error('Error own props:', Object.getOwnPropertyNames(error))
      }
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
      alert(`Fehler beim Hochladen: ${errorMessage}`)
    } finally {
      setIsUploading(false)
      setUploadStage('idle')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemovePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  const handlePhotoNoteChange = (id: string, note: string) => {
    setPhotos(prev => prev.map(p => (p.id === id ? { ...p, note } : p)))
  }

  const handleSave = async () => {
    if (!appointment || !user) return

    // Create a new report object
    const existingReports = appointment.reports || []

    // Base report data (with potentially temp URLs)
    const tempReportData: Report = {
      id: reportId,
      firmaID: user.firmaID,
      workerId: appointment.workerId,
      appointmentId: appointment.id,
      date: new Date(),
      notes: reportNote,
      photos: photos,
    }

    try {
      // 1. Call API to move files and finalize report
      const response = await fetch('/api/reports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.id,
          report: tempReportData,
        }),
      })

      if (!response.ok) throw new Error('Failed to save report')

      const { report: savedReport } = await response.json()
      console.log('Saved report:', savedReport)

      // 2. Update local state with the saved report (containing permanent URLs)
      let updatedReports = [...existingReports]
      if (existingReports.length > 0) {
        updatedReports[updatedReports.length - 1] = savedReport
      } else {
        updatedReports.push(savedReport)
      }

      const updatedAppointment: Appointment = {
        ...appointment,
        reports: updatedReports,
      }

      updateAppointment(updatedAppointment)
      onClose()
    } catch (error) {
      console.error('Error saving report:', error)
      alert('Fehler beim Speichern des Berichts')
    }
  }

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
        <Modal.Container className="max-w-2xl">
          <Modal.Dialog className="max-h-[90vh] overflow-y-auto">
            <Modal.CloseTrigger />

            <Modal.Header>
              <h2 className="text-xl font-bold">Termin Bericht</h2>
            </Modal.Header>

            <Modal.Body className="gap-6">
              {/* Appointment Details (Read-only) */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-default-50 rounded-lg">
                <div>
                  <p className="text-xs text-default-500 uppercase font-semibold">Kunde</p>
                  <p className="font-medium">
                    {appointment.client?.name} {appointment.client?.surname}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-default-500 uppercase font-semibold">Mitarbeiter</p>
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
                  <p className="text-xs text-default-500 uppercase font-semibold">Zeit</p>
                  <p className="font-medium">
                    {appointment.date.toLocaleDateString('de-DE')} | {formatTime(startTime)} -{' '}
                    {formatTime(endTime)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-default-500 uppercase font-semibold">Dauer</p>
                  <p className="font-medium">{appointment.duration} Min.</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-default-500 uppercase font-semibold">Leistungen</p>
                  <ul className="list-disc list-inside text-sm">
                    {appointment.services.map(s => (
                      <li key={s.id}>{s.name}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <Separator />

              {/* Report Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Bericht</h3>
                </div>

                <TextField>
                  <Label>Notiz</Label>
                  <TextArea
                    placeholder="Geben Sie hier Ihre Notizen zum Termin ein..."
                    rows={3}
                    value={reportNote}
                    onChange={e => setReportNote(e.target.value)}
                  />
                </TextField>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">Fotos</h3>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => fileInputRef.current?.click()}
                      isDisabled={isUploading}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Foto hinzufügen
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
                        {uploadStage === 'converting' && 'HEIC wird konvertiert...'}
                        {uploadStage === 'compressing' && 'Bild wird komprimiert...'}
                        {uploadStage === 'uploading' && 'Wird hochgeladen...'}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {photos.map(photo => (
                      <div
                        key={photo.id}
                        className="relative aspect-3/4 bg-default-100 rounded-lg overflow-hidden group shrink-0 w-48"
                      >
                        <img
                          src={getPhotoUrl(photo.url, {
                            firmaID: user?.firmaID || '',
                            appointmentId: appointment?.id || '',
                            reportId: reportId,
                          })}
                          alt="Report photo"
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setSelectedPhotoId(photo.id)}
                        />
                        <button
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="absolute top-1 right-1 z-20 bg-black/50 text-white p-1 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/40 backdrop-blur-sm">
                          <Input
                            placeholder="Beschreibung..."
                            value={photo.note}
                            onChange={e => handlePhotoNoteChange(photo.id, e.target.value)}
                            className="bg-transparent"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer>
              <Button variant="ghost" onPress={onClose}>
                Abbrechen
              </Button>
              <Button variant="primary" onPress={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                Speichern
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>

      {/* Fullscreen photo viewer */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setSelectedPhotoId(null)}
        >
          <button
            onClick={() => setSelectedPhotoId(null)}
            className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={getPhotoUrl(selectedPhoto.url, {
                firmaID: user?.firmaID || '',
                appointmentId: appointment?.id || '',
                reportId: reportId,
              })}
              alt="Report photo"
              className="max-w-full max-h-full object-contain"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div
            className="p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => e.stopPropagation()}
          >
            <Input
              placeholder="Beschreibung..."
              value={selectedPhoto.note}
              onChange={e => handlePhotoNoteChange(selectedPhoto.id, e.target.value)}
              className="bg-transparent"
            />
          </div>
        </div>
      )}
    </>
  )
}

/*

<Card isFooterBlurred className="w-full h-[200px] col-span-12 sm:col-span-7">

        <Image
          removeWrapper
          alt="Background"
          className="z-0 w-full h-full object-cover"
          src={getPhotoUrl(photo.url, {
                              firmaID: user?.firmaID || '',
                              appointmentId: appointment?.id || '',
                              reportId: reportId,
                            })}
        />
        <Card.Footer className="absolute bg-black/40 bottom-0 z-10 border-t-1 border-default-600 dark:border-default-100">
                        <Input
                          placeholder="Beschreibung..."
                          value={photo.note}
                          onChange={(e) => handlePhotoNoteChange(photo.id, e.target.value)}
                        />
        </Card.Footer>
      </Card>

      */
