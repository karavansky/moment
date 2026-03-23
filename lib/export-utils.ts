/**
 * Utilities for exporting data to Excel and PDF
 */

import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface AppointmentData {
  id: string
  date: string
  startTime: string
  endTime: string
  duration: number
  isFixedTime: boolean
  client: {
    id: string
    fullName: string
    address: string
  }
  workers: Array<{
    id: string
    fullName: string
  }>
  services: Array<{
    id: string
    name: string
  }>
}

interface ClientSummary {
  client: {
    id: string
    fullName: string
    address: string
  }
  appointmentCount: number
  appointments: AppointmentData[]
}

/**
 * Format date for display (DD.MM.YYYY)
 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

/**
 * Format time for display (HH:MM)
 */
const formatTime = (timeStr: string): string => {
  const date = new Date(timeStr)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Format time range for display
 */
const formatTimeRange = (apt: AppointmentData): string => {
  if (!apt.isFixedTime) {
    return '—'
  }
  const start = formatTime(apt.startTime)
  const end = formatTime(apt.endTime)
  return `${start} - ${end}`
}

/**
 * Export appointments to Excel (XLSX) using ExcelJS
 */
export async function exportToExcel(
  clientSummaries: ClientSummary[],
  labels: {
    title: string
    client: string
    worker: string
    service: string
  }
) {
  // Create workbook
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Berichte')

  // Add header row with styling
  worksheet.columns = [
    { header: labels.client, key: 'client', width: 25 },
    { header: 'Datum', key: 'date', width: 12 },
    { header: 'Uhrzeit', key: 'time', width: 15 },
    { header: labels.worker, key: 'worker', width: 25 },
    { header: labels.service, key: 'service', width: 30 },
  ]

  // Style header row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, size: 12 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }, // Blue background
  }
  headerRow.font = { ...headerRow.font, color: { argb: 'FFFFFFFF' } } // White text
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' }
  headerRow.height = 20

  // Add data rows
  clientSummaries.forEach((summary) => {
    summary.appointments.forEach((apt) => {
      worksheet.addRow({
        client: summary.client.fullName,
        date: formatDate(apt.date),
        time: formatTimeRange(apt),
        worker: apt.workers.map((w) => w.fullName).join(', ') || '—',
        service: apt.services.map((s) => s.name).join(', ') || '—',
      })
    })
  })

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      }
    })
  })

  // Generate file name with current date
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const fileName = `${labels.title.replace(/\s+/g, '_')}_${dateStr}.xlsx`

  // Generate buffer and download file
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  // Create download link
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()

  // Cleanup
  window.URL.revokeObjectURL(url)
}

/**
 * Export appointments to PDF
 */
export function exportToPDF(
  clientSummaries: ClientSummary[],
  labels: {
    title: string
    client: string
    worker: string
    service: string
  }
) {
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  // Add title
  doc.setFontSize(18)
  doc.text(labels.title, 14, 15)

  // Add generation date
  doc.setFontSize(10)
  const now = new Date()
  const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  doc.text(`Erstellt am: ${dateStr}`, 14, 22)

  // Prepare table data
  const tableData: any[] = []

  clientSummaries.forEach((summary) => {
    summary.appointments.forEach((apt, index) => {
      tableData.push([
        index === 0 ? summary.client.fullName : '', // Show client name only on first row
        formatDate(apt.date),
        formatTimeRange(apt),
        apt.workers.map((w) => w.fullName).join(', ') || '—',
        apt.services.map((s) => s.name).join(', ') || '—',
      ])
    })

    // Add empty row between clients for better readability
    if (tableData.length > 0) {
      tableData.push(['', '', '', '', ''])
    }
  })

  // Remove last empty row
  if (tableData.length > 0 && tableData[tableData.length - 1].every((cell: string) => cell === '')) {
    tableData.pop()
  }

  // Add table
  autoTable(doc, {
    head: [[labels.client, 'Datum', 'Uhrzeit', labels.worker, labels.service]],
    body: tableData,
    startY: 28,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 50 }, // Client
      1: { cellWidth: 25 }, // Date
      2: { cellWidth: 30 }, // Time
      3: { cellWidth: 50 }, // Workers
      4: { cellWidth: 60 }, // Services
    },
    margin: { left: 14, right: 14 },
  })

  // Generate file name with current date
  const fileDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const fileName = `${labels.title.replace(/\s+/g, '_')}_${fileDate}.pdf`

  // Download file
  doc.save(fileName)
}
