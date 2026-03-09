import React from 'react'
import { useAuthenticatedImage } from '@/hooks/useAuthenticatedImage'
import { Loader2 } from 'lucide-react'

interface AuthenticatedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  fallback?: React.ReactNode
}

/**
 * Image component that handles authentication for protected images
 * Loads images with credentials and displays them via blob URLs
 */
export function AuthenticatedImage({
  src,
  alt,
  fallback,
  className,
  ...props
}: AuthenticatedImageProps) {
  const { blobUrl, loading, error } = useAuthenticatedImage(src)

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-default-100 ${className || ''}`}
        {...props}
      >
        <Loader2 className="w-6 h-6 animate-spin text-default-400" />
      </div>
    )
  }

  if (error) {
    return (
      fallback || (
        <div
          className={`flex items-center justify-center bg-default-100 text-default-400 text-sm ${className || ''}`}
          {...props}
        >
          Failed to load image
        </div>
      )
    )
  }

  if (!blobUrl) {
    return null
  }

  return <img src={blobUrl} alt={alt} className={className} {...props} />
}
