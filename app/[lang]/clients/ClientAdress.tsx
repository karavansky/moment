'use client'

import React, { useEffect, useState, useCallback, memo, useRef, useMemo } from 'react'
import {
  Button,
  Card,
  Collection,
  ComboBox,
  EmptyState,
  FieldError,
  Form,
  Input,
  InputGroup,
  Label,
  ListBox,
  ListBoxLoadMoreItem,
  Separator,
  Spinner,
  TextField,
} from '@heroui/react'
import { Client } from '@/types/scheduling'
import { CountriesHelper } from '@/lib/countries'
import { useScheduling } from '@/contexts/SchedulingContext'
import dynamic from 'next/dynamic'
import { useAsyncList } from '@react-stately/data'
import { ChevronDown, List } from 'lucide-react'
import { useTranslation } from '@/components/Providers'

// Динамический импорт карты для избежания SSR проблем
const AddressMap = dynamic(() => import('./AddressMap'), { ssr: false })

interface ClientAdressProps {
  client: Client
  isCreateNew?: boolean
  className?: string
}

interface Character {
  name: string
}
export const ClientAdress = memo(function ClientAdress({
  client,
  isCreateNew = false,
  className,
}: ClientAdressProps) {
  const { t } = useTranslation()
  const { updateClient, addClient } = useScheduling()
  const [addressData, setAddressData] = useState({
    street: client.street || '',
    city: client.city || '',
    zipCode: client.postalCode || '',
    houseNumber: client.houseNumber || '',
    country: client.country || '',
    district: client.district || '',
    latitude: client.latitude || 0,
    longitude: client.longitude || 0,
    apartment: client.apartment || '',
  })

  const [cityQuery, setCityQuery] = useState(client.city || '')
  const [streetQuery, setStreetQuery] = useState(client.street || '')
  const [isCityInvalid, setIsCityInvalid] = useState(false)
  const [isCountryInvalid, setIsCountryInvalid] = useState(false)
  const [isHouseInvalid, setIsHouseInvalid] = useState(false)
  const [isStreetInvalid, setIsStreetInvalid] = useState(false)
  const [isStreetLeast3Chars, setIsStreetLeast3Chars] = useState(false)
  const [isCityLeast2Chars, setIsCityLeast2Chars] = useState(false)

  const isChanged =
    addressData.street !== (client.street || '') ||
    addressData.city !== (client.city || '') ||
    addressData.zipCode !== (client.postalCode || '') ||
    addressData.houseNumber !== (client.houseNumber || '') ||
    addressData.country !== (client.country || '') ||
    addressData.district !== (client.district || '')

  // Состояние для координат адреса
  // Инициализируем сразу из props, чтобы избежать лишнего рендера при монтировании
  const [addressCoordinates, setAddressCoordinates] = useState<{ lat: number; lng: number } | null>(
    client.latitude && client.longitude ? { lat: client.latitude, lng: client.longitude } : null
  )

  // Resolve country: client.country may be a code ('de') or a full name ('Germany')
  const resolvedCountryCode =
    CountriesHelper.getCountryByCode(client.country)
      ? client.country.toLowerCase()
      : CountriesHelper.getCodeByName(client.country) ?? ''
  const normalizedCountry = CountriesHelper.getNameByCode(resolvedCountryCode)
  const [countryCode, setCountryCode] = useState(resolvedCountryCode)

  const countriesList = useMemo(
    () =>
      CountriesHelper.getAllCountries().map(c => ({
        id: c.code,
        name: c.data.name,
        data: c.data,
      })),
    []
  )

  // Состояние для страны
  const [country, setCountry] = useState(normalizedCountry || '')
  const [cities, setCities] = useState<any[]>([])

  const listCities = useAsyncList<Character>({
    initialSelectedKeys: [client.city ? client.city : ''],
    initialFilterText: '', // client.city || '', - Избегаем загрузки при монтировании
    async load({ cursor, filterText, signal }) {
      // Прерываем, если фильтр пустой или слишком короткий
      if (!filterText || filterText.length < 2) {
        return { items: [] }
      }
      console.log('Fetching cities from API with query:', filterText, 'and country:', country, 'code:', countryCode)
      try {
        const isGermany = countryCode?.toLowerCase() === 'de'
        const baseUrl = isGermany ? '/api/photon' : 'https://photon.komoot.io/api'
        const url = `${baseUrl}?q=${encodeURIComponent(filterText)}&osm_tag=place&lang=de&limit=50`

        const res = await fetch(url, { signal })

        if (!res.ok) {
          console.error('API error:', res.status, await res.text())
          return { items: [] }
        }

        const data = await res.json()

        if (!data.features || !Array.isArray(data.features)) {
          console.warn('⚠️ No features in API response')
          return { items: [] }
        }
        const targetCountry = countryCode.toLowerCase()
        const placeTypes = new Set(['city', 'town', 'village', 'municipality'])
        const acc = new Map<string, Character>()

        for (const f of data.features) {
          const props = f.properties
          const name = props.name

          if (
            props.countrycode?.toLowerCase() === targetCountry &&
            props.osm_key === 'place' &&
            placeTypes.has(props.osm_value) &&
            !acc.has(name)
          ) {
            acc.set(name, { name } as Character)
          }
        }

        const uniqueLocations = Array.from(acc.values())
        console.log('Unique cities after filtering:', uniqueLocations)
        if (filterText) {
          const searchLower = filterText.toLowerCase()
          uniqueLocations.sort((a, b) => {
            const aStartsWith = a.name.toLowerCase().startsWith(searchLower)
            const bStartsWith = b.name.toLowerCase().startsWith(searchLower)
            if (aStartsWith && !bStartsWith) return -1
            if (!aStartsWith && bStartsWith) return 1
            return a.name.localeCompare(b.name)
          })
        }

        return {
          cursor: data.next,
          items: uniqueLocations,
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return { items: [] }
        }

        console.error('❌ Error loading cities:', error)

        return { items: [] }
      }
    },
  })

  const listStreets = useAsyncList<{ id: number; street: string; district: string }>({
    initialFilterText: '', // client.street || '', - Избегаем загрузки при монтировании
    async load({ signal, filterText }) {
      const streetQuery = filterText
      const cityName = addressData.city
      // Access state values that should be captured or available in render scope
      const countryName = country
      const countryCodeValue = countryCode

      // Исправленная проверка: если фильтра нет ИЛИ он короткий -> выходим
      if (!streetQuery || streetQuery.length < 3 || !cityName || !countryName) {
        return { items: [] }
      }

      try {
        const searchQuery = `${streetQuery} ${cityName} ${countryName}`
        const isGermany = countryCodeValue?.toLowerCase() === 'de'
        const baseUrl = isGermany ? '/api/photon' : 'https://photon.komoot.io/api'
        const url = `${baseUrl}?q=${encodeURIComponent(searchQuery)}&osm_tag=highway&lang=de&limit=50`

        const res = await fetch(url, { signal })

        if (!res.ok) {
          return { items: [] }
        }

        const data = await res.json()

        if (!data.features || !Array.isArray(data.features)) {
          return { items: [] }
        }
        const filtered = data.features.filter((f: any) => {
          const props = f.properties
          const matchesCountry = props.countrycode?.toLowerCase() === countryCodeValue.toLowerCase()
          const matchesCity = props.city?.toLowerCase() === cityName.toLowerCase()
          const isStreet = props.osm_key === 'highway' || props.street
          return matchesCountry && matchesCity && isStreet
        })

        const streetObjects = filtered
          .map((f: any, index: number) => {
            const name = f.properties.name || f.properties.street
            const district = f.properties.district || ''
            return name ? { id: index, street: name, district } : null
          })
          .filter(Boolean) as Array<{ id: number; street: string; district: string }>

        const uniqueStreetsMap = new Map<string, { id: number; street: string; district: string }>()
        streetObjects.forEach(obj => {
          const key = `${obj.street}|${obj.district}`
          if (!uniqueStreetsMap.has(key)) {
            uniqueStreetsMap.set(key, obj)
          }
        })
        const uniqueStreets = Array.from(uniqueStreetsMap.values())
        if (streetQuery) {
          const searchLower = streetQuery.toLowerCase()
          uniqueStreets.sort((a, b) => {
            const aStartsWith = a.street.toLowerCase().startsWith(searchLower)
            const bStartsWith = b.street.toLowerCase().startsWith(searchLower)
            if (aStartsWith && !bStartsWith) return -1
            if (!aStartsWith && bStartsWith) return 1
            return a.street.localeCompare(b.street)
          })
        }
        return { items: uniqueStreets }
      } catch (error: any) {
        return { items: [] }
      }
    },
  })

  useEffect(() => {
    //  listCities.setFilterText(addressData.city)
  }, [addressData.city])

  // Таймеры для debounce
  const citySearchTimer = useRef<NodeJS.Timeout | null>(null)
  const streetSearchTimer = useRef<NodeJS.Timeout | null>(null)
  const postalCodeTimer = useRef<NodeJS.Timeout | null>(null)

  // Дополнительный ref для отслеживания последнего запрошенного номера дома
  // чтобы избежать дублирования запросов при leading/trailing debounce
  const lastRequestedHouseNumber = useRef<string>('')
  const lastRequestedCity = useRef<string>('')
  const lastRequestedStreet = useRef<string>('')

  // AbortControllers для отмены запросов
  const cityAbortController = useRef<AbortController | null>(null)

  // Флаги для предотвращения множественных одновременных запросов
  const isFetchingCities = useRef(false)
  //const isFetchingPostcode = useRef(false)
  const [isFetchingPostcode, setIsFetchingPostcode] = useState(false)

  const streetInputRef = useRef<HTMLInputElement>(null)

  // Синхронизация состояния валидации с нативным DOM API для поддержки CSS псевдо-классов :valid/:invalid
  useEffect(() => {
    if (streetInputRef.current) {
      if (isStreetInvalid) {
        streetInputRef.current.setCustomValidity(t('clients.address.streetInvalid'))
      } else {
        streetInputRef.current.setCustomValidity('')
      }
    }
  }, [isStreetInvalid])

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      // Создаем обновленный объект клиента
      const clientData: Client = {
        ...client,
        country: addressData.country,
        city: addressData.city,
        postalCode: addressData.zipCode,
        street: addressData.street,
        houseNumber: addressData.houseNumber,
        district: addressData.district,
        // Обновляем координаты если они есть
        latitude: addressCoordinates?.lat ?? client.latitude,
        longitude: addressCoordinates?.lng ?? client.longitude,
      }

      if (isCreateNew) {
        addClient(clientData)
        alert(t('clients.address.createSuccess'))
      } else {
        updateClient(clientData)
        alert(t('clients.address.saveSuccess'))
      }
    },
    [addressData, country, client, updateClient, addClient, addressCoordinates, isCreateNew]
  )

  // 1. Явная функция для поиска городов
  const fetchCities = useCallback(
    async (query: string, countryName: string, countryCodeValue: string) => {
      if (query.length < 3 || !countryName) {
        setCities([])
        return
      }

      // Отменяем предыдущий запрос, если он еще выполняется
      if (cityAbortController.current) {
        cityAbortController.current.abort()
      }

      // Создаем новый AbortController для этого запроса
      cityAbortController.current = new AbortController()
      const signal = cityAbortController.current.signal

      isFetchingCities.current = true

      try {
        const searchQuery = `${query} ${countryName}`
        const isGermany = countryCodeValue?.toLowerCase() === 'de'
        const baseUrl = isGermany ? '/api/photon' : 'https://photon.komoot.io/api'

        // const url = `/api/photon?q=${encodeURIComponent(searchQuery)}&osm_tag=place&lang=de&limit=20`
        const url = `${baseUrl}?q=${encodeURIComponent(searchQuery)}&osm_tag=place&lang=de&limit=20`

        const res = await fetch(url, { signal })

        if (!res.ok) {
          setCities([])
          return
        }

        const data = await res.json()

        if (!data.features || !Array.isArray(data.features)) {
          console.warn('⚠️ No features in API response')
          setCities([])
          return
        }

        const filtered = data.features.filter((f: any) => {
          const props = f.properties
          const matchesCountry = props.countrycode?.toLowerCase() === countryCodeValue.toLowerCase()
          const isPlace =
            props.osm_key === 'place' &&
            ['city', 'town', 'village', 'municipality'].includes(props.osm_value)
          return matchesCountry && isPlace
        })

        setCities(filtered)
      } catch (error: any) {
        // Игнорируем ошибки отмены запроса
        if (error.name === 'AbortError') {
          return
        }
        console.error('❌ Error fetching cities:', error)
        // Не показываем ошибку пользователю, просто очищаем список
        setCities([])
      } finally {
        isFetchingCities.current = false
      }
    },
    []
  )

  // 3. Явная функция для получения почтового индекса
  const fetchPostalCode = useCallback(
    async (street: string, houseNumber: string, city: string, countryValue: string) => {
      try {
        if (!street || !city || !countryValue) {
          console.warn('⚠️ Missing required params for postal code fetch')
          return
        }

        const fullAddress = houseNumber
          ? `${street} ${houseNumber}, ${city}, ${countryValue.toLowerCase() === 'de' ? 'Germany' : countryValue}`
          : `${street}, ${city}, ${countryValue}`

        const isGermany = countryValue.toLowerCase() === 'de'
        const baseUrl = isGermany ? '/api/photon' : 'https://photon.komoot.io/api'
        const url = `${baseUrl}?q=${encodeURIComponent(fullAddress)}&limit=1`
        // const url = `/api/photon?q=${encodeURIComponent(fullAddress)}&limit=1`

        const res = await fetch(url)
        if (!res.ok) {
          return
        }

        const data = await res.json()

        if (data.features && data.features.length > 0) {
          const feature = data.features[0]
          const postcode = feature.properties.postcode
          const houseNumberFromAPI = feature.properties.housenumber
          if (houseNumberFromAPI) {
            setIsHouseInvalid(false)
          } else {
            setIsHouseInvalid(true)
          }

          if (postcode) {
            // Получаем координаты
            let coords = null
            if (feature.geometry && feature.geometry.coordinates) {
              const [lng, lat] = feature.geometry.coordinates
              coords = { lat, lng }
            }

            // Обновляем оба состояния вместе через React batching
            if (coords) {
              setAddressData(prev => ({
                ...prev,
                zipCode: postcode,
                latitude: coords.lat,
                longitude: coords.lng,
              }))
              setAddressCoordinates(coords)
            }
          }
        }
      } catch (error) {
        console.error('❌ Error fetching postal code:', error)
        // Не показываем ошибку пользователю, просто игнорируем
        setIsHouseInvalid(true)
      } finally {
        setIsFetchingPostcode(false)
        // isFetchingPostcode.current = false
      }
    },
    [setAddressData, setAddressCoordinates, setIsHouseInvalid]
  )

  // Обработчики с debounce
  const handleCityInputChange = useCallback(
    (value: string) => {
      if (value.length > 0) {
        setCityQuery(value)
      }

      // Очищаем предыдущий таймер
      if (citySearchTimer.current) {
        clearTimeout(citySearchTimer.current)
      } else {
        // Leading edge: если таймера нет, запускаем запрос немедленно
        if (value.length >= 3 && country) {
          lastRequestedCity.current = value
          listCities.setFilterText(value)
        }
      }

      // Trailing edge: запускаем таймер
      if (value.length >= 3 && country) {
        // console.log('Scheduling city fetch for:', value)
        citySearchTimer.current = setTimeout(() => {
          if (value === lastRequestedCity.current) {
            citySearchTimer.current = null
            return
          }
          lastRequestedCity.current = value
          listCities.setFilterText(value)
          citySearchTimer.current = null
        }, 500)
      } else {
        if (citySearchTimer.current) {
          clearTimeout(citySearchTimer.current)
          citySearchTimer.current = null
        }
        // setCities([]) removed
      }
    },
    [cityQuery, country, countryCode, listCities]
  )
  const handleCityOpenChange = useCallback(
    (isOpen: Boolean) => {
      /*  isFetchingCities.current = true

      // Очищаем предыдущий таймер
      if (citySearchTimer.current) {
        clearTimeout(citySearchTimer.current)
      }

      // Устанавливаем новый таймер с увеличенным debounce (500ms вместо 300ms)
      if (cityQuery.length >= 3 && country) {
        console.log('Scheduling city fetch for:', cityQuery)
        citySearchTimer.current = setTimeout(() => {
          fetchCities(cityQuery, country, countryCode)
        }, 500)
      } else {
        setCities([])
      }
        */
    },
    [cityQuery, country, countryCode, fetchCities, isFetchingCities]
  )

  const handleStreetInputChange = useCallback(
    (value: string) => {
      // Игнорируем пустое значение если улица уже выбрана
      if (!value && addressData.street) {
        //     return
      }

      setStreetQuery(value)

      if (streetSearchTimer.current) {
        clearTimeout(streetSearchTimer.current)
      } else {
        // Leading edge
        if (value) {
          lastRequestedStreet.current = value
          listStreets.setFilterText(value)
        }
      }

      streetSearchTimer.current = setTimeout(() => {
        if (value === lastRequestedStreet.current) {
          streetSearchTimer.current = null
          return
        }
        lastRequestedStreet.current = value
        listStreets.setFilterText(value)
        streetSearchTimer.current = null
      }, 500)
    },
    [addressData.street, listStreets]
  )

  const handleCitySelection = useCallback(
    (key: React.Key | null) => {
      if (!key) return
      const keyString = String(key)

      if (keyString) {
        //const p = selected.properties
        if (keyString === addressData.city) return

        //   const cityName = p.name || ''
        setAddressData(prev => ({
          ...prev,
          city: keyString,
          street: '',
          zipCode: '',
          district: '',
          houseNumber: '',
        }))
        setCityQuery(keyString)
        setStreetQuery('')
        // setStreets([]) replaced
        listStreets.setFilterText('')
      }
    },
    [cities, addressData.city]
  )

  const handleCountrySelection = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (e.target.value) {
        const countryName = e.target.value
        const countryCodeValue = CountriesHelper.getCodeByName(countryName) || ''

        if (countryCodeValue !== addressData.country.toLowerCase()) {
          setCountryCode(countryCodeValue)
          setCountry(countryName)
          setCityQuery('')
          setStreetQuery('')
          setCities([])
          // setStreets([]) replaced
          listStreets.setFilterText('')
          setAddressData(prev => ({
            ...prev,
            country: countryCodeValue,
            city: '',
            street: '',
            zipCode: '',
            district: '',
          }))
        }
      }
    },
    [addressData.country]
  )
  const handleHouseSelection = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      // Не сбрасываем индикатор жестко в false, так как может идти немедленный запрос
      // setIsFetchingPostcode(false)

      setAddressData(prev => ({ ...prev, houseNumber: val }))

      // Использование countryCodeValue вместо addressData.country, если они рассинхронизированы
      // Обычно addressData.country должен хранить код страны
      const effectiveCountryCode = addressData.country || countryCode || ''

      // Очищаем предыдущий таймер
      if (postalCodeTimer.current) {
        clearTimeout(postalCodeTimer.current)
      } else {
        // Если таймера нет, значит это начало ввода (First/Leading edge)
        // Отправляем запрос немедленно
        if (addressData.street && addressData.city && effectiveCountryCode && val) {
          lastRequestedHouseNumber.current = val
          setIsFetchingPostcode(true)
          fetchPostalCode(addressData.street, val, addressData.city, effectiveCountryCode)
        }
      }

      // Всегда устанавливаем таймер для завершения ввода (Trailing edge)
      if (addressData.street && addressData.city && effectiveCountryCode && val) {
        postalCodeTimer.current = setTimeout(() => {
          // Проверяем, не отправляли ли мы уже запрос для этого значения (в leading edge)
          if (val === lastRequestedHouseNumber.current) {
            postalCodeTimer.current = null
            return
          }

          lastRequestedHouseNumber.current = val
          setIsFetchingPostcode(true)
          fetchPostalCode(addressData.street, val, addressData.city, effectiveCountryCode)
          postalCodeTimer.current = null
        }, 1000) // 1 секунда debounce
      } else {
        // Если не хватает данных для запроса, сбрасываем почтовый индекс
        if (postalCodeTimer.current) {
          clearTimeout(postalCodeTimer.current)
          postalCodeTimer.current = null
        }
        setIsFetchingPostcode(false)
      }
    },
    [
      setAddressData,
      postalCodeTimer,
      addressData.street,
      addressData.city,
      country,
      addressData.houseNumber,
      fetchPostalCode,
    ]
  )

  // Автоматический поиск почтового индекса при изменении адреса
  useEffect(() => {
    if (addressData.latitude && addressData.longitude) {
      setAddressCoordinates(prev => {
        // Избегаем обновления состояния, если координаты не изменились
        if (prev && prev.lat === addressData.latitude && prev.lng === addressData.longitude) {
          return prev
        }
        return { lat: addressData.latitude, lng: addressData.longitude }
      })
    }
    return () => {
      /* if (postalCodeTimer.current) {
        clearTimeout(postalCodeTimer.current)
      }*/
    }
  }, [addressData.latitude, addressData.longitude, setAddressCoordinates])

  const handleReset = useCallback(() => {
    const resetCountryName = CountriesHelper.getNameByCode(client.country.toLowerCase())

    setAddressData({
      street: client.street || '',
      city: client.city || '',
      zipCode: client.postalCode || '',
      houseNumber: client.houseNumber || '',
      country: client.country || '',
      district: client.district || '',
      latitude: client.latitude || 0,
      longitude: client.longitude || 0,
      apartment: client.apartment || '',
    })
    setCountry(resetCountryName || '')
    setCityQuery(client.city || '')
    setStreetQuery(client.street || '')
  }, [
    client.country,
    client.city,
    client.street,
    client.postalCode,
    client.houseNumber,
    client.district,
    client.latitude,
    client.longitude,
    client.apartment,
  ])

  return (
    <Card
      className={`w-full max-w-md border border-gray-200  dark:border-gray-700 ${className || ''}`}
    >
      <Card.Header>
        <Card.Title className="flex items-center justify-center gap-2">
          <span className="text-xl md:text-xl  capitalize font-semibold">
            {isCreateNew ? t('clients.address.titleNew') : t('clients.address.title')}
          </span>
        </Card.Title>
        <Card.Description className="flex items-center justify-center gap-2">
          {t('clients.address.description')}
        </Card.Description>
      </Card.Header>
      <Form onSubmit={onSubmit} autoComplete="off">
        <Card.Content>
          <div className="flex flex-col gap-4 ">
            <div className="flex items-center justify-center flex-row gap-2 w-full">
              {/* Город */}
              <div className="w-2/5 min-w-0 flex flex-col gap-2">
                <TextField isRequired name="city" type="text" isInvalid={isCityInvalid}>
                  <Label className="text-base font-normal ">{t('clients.address.city')}</Label>
                  <div className="relative w-full">
                    <input
                      value={cityQuery}
                      onChange={e => {
                        const val = e.target.value
                        setCityQuery(val)

                        const selected = listCities.items.find(c => c.name === val)
                        if (selected) {
                          handleCitySelection(selected.name)
                          setIsCityInvalid(false)
                        } else {
                          setIsCityInvalid(true)
                          if (val.length < 2) {
                            setIsCityLeast2Chars(true)
                          } else {
                            setIsCityLeast2Chars(false)
                          }
                          listCities.setFilterText(val)
                        }
                      }}
                      placeholder={country ? t('clients.address.cityPlaceholder') : t('clients.address.citySelectCountryFirst')}
                      autoComplete="off"
                      list="city-options"
                      className="input input--primary text-lg md:text-base font-normal w-full pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0"
                      disabled={!country}
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-default-500">
                      <ChevronDown size={16} />
                    </div>
                    <datalist id="city-options">
                      {listCities.items.map((item, i) => (
                        <option key={i} value={item.name} />
                      ))}
                    </datalist>
                  </div>
                  <FieldError>
                    {isCityLeast2Chars
                      ? t('clients.address.cityMinChars')
                      : isCityInvalid
                        ? t('clients.address.cityInvalid')
                        : null}
                  </FieldError>
                </TextField>
              </div>

              {/* Улица */}
              <div className="w-3/5 min-w-0 flex flex-col gap-2">
                <TextField isRequired name="street" type="text" isInvalid={isStreetInvalid}>
                  <Label className="text-base font-normal ">{t('clients.address.street')}</Label>
                  <div className="relative w-full">
                    <Input
                      ref={streetInputRef}
                      value={streetQuery}
                      onChange={e => {
                        const val = e.target.value
                        // 1. Попытка найти по составному имени (для дубликатов)
                        let selected = listStreets.items.find(
                          s => s.district && `${s.street} (${s.district})` === val
                        )

                        // 2. Если не нашли, ищем по точному совпадению улицы (для уникальных)
                        if (!selected) {
                          const candidates = listStreets.items.filter(s => s.street === val)
                          if (candidates.length === 1) {
                            selected = candidates[0]
                          }
                        }

                        if (selected) {
                          // 1. Обновляем полные данные адреса (включая район)
                          setAddressData(prev => ({
                            ...prev,
                            street: selected ? selected.street : '',
                            district: (selected && selected.district) || prev.district,
                          }))

                          // 2. Визуально оставляем в поле только название улицы (без района)
                          setStreetQuery(selected.street)
                          setIsStreetInvalid(false)
                        } else {
                          // Если совпадения нет - продолжаем обычный ввод и поиск
                          setIsStreetInvalid(true)
                          if (val.length < 3) {
                            setIsStreetLeast3Chars(true)
                          } else {
                            setIsStreetLeast3Chars(false)
                          }
                          handleStreetInputChange(val)
                        }
                      }}
                      placeholder={cityQuery ? t('clients.address.streetPlaceholder') : t('clients.address.streetSelectCityFirst')}
                      autoComplete="off"
                      list="street-options"
                      className="text-lg font-normal md:text-base w-full pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0"
                      disabled={!cityQuery}
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-default-500">
                      <ChevronDown size={16} />
                    </div>
                    <datalist id="street-options">
                      {(() => {
                        const streetCounts = listStreets.items.reduce(
                          (acc, item) => {
                            acc[item.street] = (acc[item.street] || 0) + 1
                            return acc
                          },
                          {} as Record<string, number>
                        )

                        return listStreets.items.map(streetObj => {
                          const count = streetCounts[streetObj.street] || 0
                          const isDuplicate = count > 1

                          const value =
                            isDuplicate && streetObj.district
                              ? `${streetObj.street} (${streetObj.district})`
                              : streetObj.street

                          const label =
                            !isDuplicate && streetObj.district ? streetObj.district : undefined

                          return <option key={streetObj.id} value={value} label={label} />
                        })
                      })()}
                    </datalist>
                  </div>
                  <FieldError>
                    {isStreetLeast3Chars
                      ? t('clients.address.streetMinChars')
                      : isStreetInvalid
                        ? t('clients.address.streetInvalid')
                        : null}
                  </FieldError>
                </TextField>
              </div>
            </div>
            <div className="flex items-center flex-row gap-2 w-full">
              {/* Номер дома */}
              <TextField
                isRequired
                isInvalid={isHouseInvalid}
                name="houseNumber"
                className="w-1/3 min-w-0 "
                type="text"
              >
                <Label className="text-base font-normal ">{t('clients.address.houseNumber')}</Label>
                <div className="relative w-full">
                  <Input
                    placeholder={t('clients.address.houseNumberPlaceholder')}
                    value={addressData.houseNumber}
                    onChange={handleHouseSelection}
                    className="text-lg md:text-base h-10 pr-8 w-full"
                  />
                  {isFetchingPostcode && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                      <Spinner size="sm" />
                    </div>
                  )}
                </div>
              </TextField>
              <TextField name="apartment" className="w-1/3 min-w-0" type="text">
                <Label className="text-base font-normal ">{t('clients.address.apartment')}</Label>
                <Input
                  placeholder={t('clients.address.apartmentPlaceholder')}
                  value={addressData.apartment}
                  onChange={e => setAddressData(prev => ({ ...prev, apartment: e.target.value }))}
                  className="text-lg md:text-base h-10"
                />
              </TextField>
              {/* Почтовый индекс */}
              <TextField name="zipCode" className="w-1/3 min-w-0" type="text">
                <Label className="text-base font-normal ">{t('clients.address.postalCode')}</Label>
                <Input
                  placeholder={t('clients.address.postalCodePlaceholder')}
                  value={addressData.zipCode}
                  onChange={e => setAddressData(prev => ({ ...prev, zipCode: e.target.value }))}
                  className="text-lg font-normal md:text-base h-10"
                />
              </TextField>
            </div>
            <div className="flex items-center flex-row gap-2 w-full">
              {/* Район/округ */}
              <TextField name="district" type="text" className="w-1/2 min-w-0">
                <Label className="text-base font-normal ">{t('clients.address.district')}</Label>
                <Input
                  placeholder={t('clients.address.districtPlaceholder')}
                  value={addressData.district}
                  onChange={e => setAddressData(prev => ({ ...prev, district: e.target.value }))}
                  autoComplete="off"
                  className="text-lg font-normal md:text-base"
                />
              </TextField>

              {/* Страна - Native Select */}
              <TextField className="w-1/2 min-w-0 " isRequired>
                <Label className="text-base font-normal ">{t('clients.address.country')}</Label>
                <div className="surface surface--tertiary h-11 md:h-10 flex items-center rounded-xl px-2 w-full">
                  <select
                    name="country"
                    value={country}
                    onChange={handleCountrySelection}
                    className="w-full px-2 py-0 text-lg font-normal md:text-base border-0 border-transparent outline-none cursor-pointer bg-transparent"
                    required
                  >
                    {countriesList.map(item => {
                      // Конвертируем код страны в эмодзи флага
                      const flagEmoji = item.id
                        .toUpperCase()
                        .split('')
                        .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
                        .join('')
                      return (
                        <option key={item.id} value={item.name}>
                          {flagEmoji} {item.name}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </TextField>
            </div>
            {/* Карта адреса */}
            <div
              className={`w-full ${addressCoordinates && addressData.zipCode ? 'block' : 'hidden'}`}
            >
              <Label className="mb-2 block">{t('clients.address.mapLabel')}</Label>
              <AddressMap
                coordinates={addressCoordinates}
                address={`${addressData.street} ${addressData.houseNumber}, ${addressData.zipCode} ${addressData.city}, ${country}`}
              />
            </div>{' '}
          </div>
        </Card.Content>
        <Card.Footer className="mt-4 flex flex-col gap-2">
          {isChanged && (
            <>
              <Separator />
              <div className="flex gap-6 justify-end">
                {!isCreateNew && (
                  <Button
                    className="w-full max-w-50 "
                    variant="danger-soft"
                    type="reset"
                    onPress={handleReset}
                  >
                    {t('clients.address.reset')}
                  </Button>
                )}
                <Button className="w-full max-w-50" type="submit">
                  {isCreateNew ? t('clients.address.create') : t('clients.address.save')}
                </Button>
              </div>
            </>
          )}
        </Card.Footer>
      </Form>
    </Card>
  )
})

/*

//{streets.length > 0 && streetQuery.length >= 3 && (
              Улица 
              <ComboBox
                key="streetQuery"
                className="w-3/5 min-w-0"
                inputValue={streetQuery}
                onInputChange={handleStreetInputChange}
                onSelectionChange={handleStreetSelection}
                items={streets}
                isDisabled={!cityQuery}
                isRequired
                isInvalid={isStreetInvalid}
              >
                <Label className="text-lg md:text-base">Straße</Label>
                <ComboBox.InputGroup>
                  <Input
                    placeholder={cityQuery ? 'Type street name...' : 'Select city first'}
                    autoComplete="new-password"
                    className="text-lg md:text-base"
                  />
                  <ComboBox.Trigger />
                </ComboBox.InputGroup>
                <ComboBox.Popover>
                  <ListBox>
                    {streets.length > 0 ? (
                      streets.map(streetObj => {
                        const displayName = streetObj.district
                          ? `${streetObj.street} (${streetObj.district})`
                          : streetObj.street
                        return (
                          <ListBox.Item
                            key={streetObj.id}
                            id={streetObj.id.toString()}
                            textValue={streetObj.street}
                          >
                            <span className="text-xl md:text-base">{displayName}</span>

                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        )
                      })
                    ) : (
                      <ListBox.Item key="empty" textValue="No results">
                        {streetQuery.length < 3
                          ? 'Type at least 3 characters...'
                          : 'No streets found'}
                      </ListBox.Item>
                    )}
                  </ListBox>
                </ComboBox.Popover>
              </ComboBox>
*/
