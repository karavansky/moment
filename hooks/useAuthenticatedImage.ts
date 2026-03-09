import { useState, useEffect } from 'react'

/**
 * Hook to load images that require authentication
 * Fetches the image with credentials and creates a blob URL
 */
export function useAuthenticatedImage(url: string | null | undefined): {
  blobUrl: string | null
  loading: boolean
  error: Error | null
} {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!url) {
      setBlobUrl(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null

    const loadImage = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(url, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`Failed to load image: ${response.status} ${response.statusText}`)
        }

        const blob = await response.blob()

        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob)
          setBlobUrl(objectUrl)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load image'))
          setBlobUrl(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadImage()

    // Cleanup: revoke object URL when component unmounts or URL changes
    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [url])

  return { blobUrl, loading, error }
}
