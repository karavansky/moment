'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ComboBox, Input, ListBox, Spinner, EmptyState, Label, Collection } from '@heroui/react'
import { MapPin } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface PhotonFeature {
  properties: {
    name?: string
    street?: string
    housenumber?: string
    postcode?: string
    city?: string
    country?: string
    osm_id: number
    osm_type: string
  }
  geometry: {
    coordinates: [number, number] // [lng, lat]
  }
}

interface PhotonResponse {
  features: PhotonFeature[]
}

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string, lat?: number, lng?: number) => void
  placeholder?: string
  fullWidth?: boolean
  'aria-label'?: string
}

interface AddressItem {
  id: string
  address: string
  city?: string
  feature: PhotonFeature
}

function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Введите адрес...',
  fullWidth,
  'aria-label': ariaLabel,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Debounce input для уменьшения количества запросов
  const debouncedInput = useDebounce(inputValue, 300)

  // Fetch suggestions from Photon API
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([])
      return
    }

    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        q: query,
        limit: '10',
        lang: 'de', // Photon supports: default, de, en, fr (ru not supported)
      })

      console.log('🔍 Fetching suggestions for:', query)
      const response = await fetch(`/api/photon?${params}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Photon API error:', response.status, errorData)
        throw new Error('Failed to fetch suggestions')
      }

      const data: PhotonResponse = await response.json()
      console.log('✅ Received suggestions:', data.features?.length || 0, data.features)
      setSuggestions(data.features || [])
    } catch (error) {
      console.error('Address autocomplete error:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Trigger fetch when debounced input changes
  useEffect(() => {
    if (debouncedInput) {
      fetchSuggestions(debouncedInput)
    } else {
      setSuggestions([])
    }
  }, [debouncedInput, fetchSuggestions])

  // Debug: log suggestions changes
  useEffect(() => {
    console.log('📋 Suggestions state updated:', suggestions.length, suggestions)
  }, [suggestions])

  // Format address from Photon feature
  const formatAddress = (feature: PhotonFeature): string => {
    const p = feature.properties
    const parts = [
      p.street,
      p.housenumber,
      p.postcode,
      p.city,
      p.country,
    ].filter(Boolean)

    return parts.join(', ')
  }

  // Handle selection
  const handleSelect = (key: React.Key | null) => {
    if (!key) return

    const selectedId = String(key)
    const feature = suggestions.find(
      (f) => String(f.properties.osm_id) === selectedId
    )

    if (feature) {
      const address = formatAddress(feature)
      const [lng, lat] = feature.geometry.coordinates

      setInputValue(address)
      onChange(address, lat, lng)
    }
  }

  // Handle input change
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange(newValue) // Update parent with text-only value
  }

  // Prepare items for ComboBox
  const items: AddressItem[] = suggestions.map((feature) => ({
    id: String(feature.properties.osm_id),
    address: formatAddress(feature),
    city: feature.properties.city,
    feature,
  }))

  return (
    <ComboBox
      allowsCustomValue
      allowsEmptyCollection
      fullWidth={fullWidth}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onSelectionChange={handleSelect}
      menuTrigger="focus"
      items={items}
    >
      <Label className="sr-only">{ariaLabel || placeholder}</Label>
      <ComboBox.InputGroup>
        <Input
          placeholder={placeholder}
          fullWidth={fullWidth}
        />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox
          renderEmptyState={() => (
            <EmptyState>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Spinner size="sm" />
                  <span className="text-sm text-default-400">Поиск адресов...</span>
                </div>
              ) : inputValue.length < 3 ? (
                <div className="py-4 text-center text-sm text-default-400">
                  Введите минимум 3 символа для поиска
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-default-400">
                  Адреса не найдены
                </div>
              )}
            </EmptyState>
          )}
        >
          {(item: AddressItem) => (
            <ListBox.Item key={item.id} id={item.id} textValue={item.address}>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 text-default-400 shrink-0" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm truncate">{item.address}</span>
                  {item.city && (
                    <span className="text-xs text-default-400 truncate">
                      {item.city}
                    </span>
                  )}
                </div>
              </div>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  )
}

export default AddressAutocomplete
