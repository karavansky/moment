'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals(metric => {
    // Use `window.gtag` if you initialized Google Analytics as this example:
    // https://github.com/vercel/next.js/blob/canary/examples/with-google-analytics/pages/_app.js
    if (typeof window !== 'undefined' && (window as any).gtag) {
      const params: Record<string, any> = {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value), // values must be integers
        event_label: metric.id, // id unique to current page load
        non_interaction: true, // avoids affecting bounce rate.
      }

      // Debug info based on https://web.dev/articles/debug-performance-in-the-field
      if (metric.entries && metric.entries.length > 0) {
        // LCP Debug
        if (metric.name === 'LCP') {
          const lastEntry = metric.entries[metric.entries.length - 1] as any
          if (lastEntry.element) {
            params.debug_target = getSelector(lastEntry.element)
          }
        }
        // CLS Debug
        else if (metric.name === 'CLS') {
          const largestEntry = metric.entries.reduce((prev: any, curr: any) => {
            return prev.value > curr.value ? prev : curr
          }) as any
          if (largestEntry && largestEntry.sources && largestEntry.sources.length > 0) {
            const source = largestEntry.sources[0]
            if (source.node) {
              params.debug_target = getSelector(source.node)
            }
          }
        }
        // INP Debug
        else if (metric.name === 'INP') {
          // Find the entry that matches the metric value (duration)
          const entry = metric.entries.find(
            (e: any) => e.duration === metric.value || Math.abs(e.duration - metric.value) < 1
          ) as any

          if (entry) {
            if (entry.target) {
              params.debug_target = getSelector(entry.target)
            }
            params.event_type = entry.name
            params.input_delay = Math.round(entry.processingStart - entry.startTime)
            params.processing_time = Math.round(entry.processingEnd - entry.processingStart)
            params.presentation_delay = Math.round(
              entry.startTime + entry.duration - entry.processingEnd
            )
          }
        }
      }

      ;(window as any).gtag('event', metric.name, params)
    }
    console.log(metric)
  })

  return null
}

function getSelector(node: any): string {
  if (!node || typeof node.localName !== 'string') return ''
  let selector = node.localName
  if (node.id) selector += `#${node.id}`
  if (node.className && typeof node.className === 'string') {
    const classes = node.className.split(/\s+/).filter(Boolean).join('.')
    if (classes) selector += `.${classes}`
  }
  return selector
}
