'use client'

import React, { useEffect, useState, useCallback, memo, useRef, useMemo } from 'react'
import {
  Button,
  Card,
  Collection,
  ComboBox,
  EmptyState,
  Form,
  Input,
  InputGroup,
  Label,
  ListBox,
  ListBoxLoadMoreItem,
  Separator,
  Spinner,
  Surface,
  TextField,
} from '@heroui/react'
import { Client } from '@/types/scheduling'
import { CountriesHelper } from '@/lib/countries'
import { useScheduling } from '@/contexts/SchedulingContext'
import dynamic from 'next/dynamic'
import { appRouterContext } from 'next/dist/server/route-modules/app-route/shared-modules'
import { isOutputType } from 'graphql'
import { useAsyncList } from '@react-stately/data'
import { i } from 'framer-motion/client'

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
  const [isStreetInvalid, setIsStreetInvalid] = useState(false)
  const [isCountryInvalid, setIsCountryInvalid] = useState(false)
  const [isHouseInvalid, setIsHouseInvalid] = useState(false)

  const isChanged =
    addressData.street !== (client.street || '') ||
    addressData.city !== (client.city || '') ||
    addressData.zipCode !== (client.postalCode || '') ||
    addressData.houseNumber !== (client.houseNumber || '') ||
    addressData.country !== (client.country || '') ||
    addressData.district !== (client.district || '')

  // Состояние для координат адреса
  const [addressCoordinates, setAddressCoordinates] = useState<{ lat: number; lng: number } | null>(
    null
  )

  // Получаем код страны из названия или напрямую из кода
  const normalizedCountry = CountriesHelper.getNameByCode(client.country.toLowerCase())
  const [countryCode, setCountryCode] = useState(
    CountriesHelper.getCodeByName(client.country.toLowerCase()) || client.country.toLowerCase()
  )

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
  console.log('ClientAdress render with country:', country, 'code:', countryCode)
  const [cities, setCities] = useState<any[]>([])
  const [streets, setStreets] = useState<Array<{ id: number; street: string; district: string }>>(
    []
  )
  const listCities = useAsyncList<Character>({
    initialSelectedKeys: [client.city ? client.city : ''],
    initialFilterText: client.city || '',
    async load({ cursor, filterText, signal }) {
      console.log(
        'useAsyncList cities with filter:',
        filterText,
        'cursor:',
        cursor,
        'signal:',
        signal
      )
      try {
        const searchQuery = `${filterText} ${country}`
        console.log('Loading cities for:', searchQuery, 'country code:', countryCode)

        const isGermany = countryCode?.toLowerCase() === 'de'
        const baseUrl = isGermany ? '/api/photon' : 'https://photon.komoot.io/api'
        const url = `${baseUrl}?q=${encodeURIComponent(searchQuery)}&osm_tag=place&lang=de&limit=20`

        const res = await fetch(url, { signal })

        if (!res.ok) {
          console.error('❌ API response not OK:', res.status, res.statusText)
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
        /*
        const filtered = data.features.filter((f: any) => {
          const props = f.properties
          const matchesCountry = props.countrycode?.toLowerCase() === countryCode.toLowerCase()
          const isPlace =
            props.osm_key === 'place' &&
            ['city', 'town', 'village', 'municipality'].includes(props.osm_value)
          return matchesCountry && isPlace
        })
        const uniqueLocations: Character[] = [
          ...filtered
            .reduce((acc: Map<string, Character>, f: any) => {
              const name = f.properties.name
              if (!acc.has(name)) {
                acc.set(name, { name } as Character)
              }
              return acc
            }, new Map<string, Character>())
            .values(),
        ]
            */
        /*
        const uniqueCitiesMap = filtered.map((f: any) => ({ name: f.properties.name }))

        const uniqueLocationsOld: Character[] = [
          ...new Map<string, Character>( // <--- Указываем типы здесь
            uniqueCitiesMap.map((item: Character) => [item.name, item])
          ).values(),
        ]
          */
        //const uniqueLocations: Character[] = Array.from(new Map(uniqueCitiesMap.map((item: Character) => [item.name, item])).values());
        return {
          cursor: data.next,
          items: uniqueLocations,
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return { items: [] }
        }

        //  console.error('❌ Error loading cities:', error)

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

  // AbortControllers для отмены запросов
  const cityAbortController = useRef<AbortController | null>(null)
  const streetAbortController = useRef<AbortController | null>(null)

  // Флаги для предотвращения множественных одновременных запросов
  const isFetchingCities = useRef(false)
  const isFetchingStreets = useRef(false)
  const isFetchingPostcode = useRef(false)
  //const [isFetchingPostcode, setIsFetchingPostcode] = useState(false)

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
        console.log('Creating new client with address:', clientData)
        addClient(clientData)
        alert(`Client ${client.name} ${client.surname} created successfully!`)
      } else {
        console.log('Updating client with address:', clientData)
        updateClient(clientData)
        alert(`Address saved successfully for ${client.name} ${client.surname}!`)
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
        console.log(
          'Current country code for city search:',
          countryCodeValue,
          'country',
          countryName
        )
        const isGermany = countryCodeValue?.toLowerCase() === 'de'
        const baseUrl = isGermany ? '/api/photon' : 'https://photon.komoot.io/api'

        // const url = `/api/photon?q=${encodeURIComponent(searchQuery)}&osm_tag=place&lang=de&limit=20`
        const url = `${baseUrl}?q=${encodeURIComponent(searchQuery)}&osm_tag=place&lang=de&limit=20`

        const res = await fetch(url, { signal })

        if (!res.ok) {
          console.error('❌ API response not OK:', res.status, res.statusText)
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

  // 2. Явная функция для поиска улиц
  const fetchStreets = useCallback(
    async (
      streetQuery: string,
      cityName: string,
      countryName: string,
      countryCodeValue: string
    ) => {
      if (streetQuery.length < 3 || !cityName || !countryName) {
        return
      }

      // Отменяем предыдущий запрос, если он еще выполняется
      if (streetAbortController.current) {
        streetAbortController.current.abort()
      }

      // Создаем новый AbortController для этого запроса
      streetAbortController.current = new AbortController()
      const signal = streetAbortController.current.signal

      isFetchingStreets.current = true

      try {
        const searchQuery = `${streetQuery} ${cityName} ${countryName}`

        const isGermany = countryCodeValue?.toLowerCase() === 'de'
        const baseUrl = isGermany ? '/api/photon' : 'https://photon.komoot.io/api'

        // const url = `/api/photon?q=${encodeURIComponent(searchQuery)}&osm_tag=highway&lang=de&limit=50`
        const url = `${baseUrl}?q=${encodeURIComponent(searchQuery)}&osm_tag=highway&lang=de&limit=50`

        const res = await fetch(url, { signal })

        if (!res.ok) {
          console.error('❌ API response not OK:', res.status, res.statusText)
          setStreets([])
          return
        }

        const data = await res.json()

        if (!data.features || !Array.isArray(data.features)) {
          console.warn('⚠️ No features in API response for streets')
          setStreets([])
          return
        }

        const filtered = data.features.filter((f: any) => {
          const props = f.properties
          const matchesCountry = props.countrycode?.toLowerCase() === countryCodeValue.toLowerCase()
          const matchesCity = props.city?.toLowerCase() === cityName.toLowerCase()
          const isStreet = props.osm_key === 'highway' || props.street
          return matchesCountry && matchesCity && isStreet
        })

        // Преобразуем в массив объектов {id, street, district}
        const streetObjects = filtered
          .map((f: any, index: number) => {
            const name = f.properties.name || f.properties.street
            const district = f.properties.district || ''
            return name ? { id: index, street: name, district } : null
          })
          .filter(Boolean) as Array<{ id: number; street: string; district: string }>

        // Убираем дубликаты
        const uniqueStreetsMap = new Map<string, { id: number; street: string; district: string }>()
        streetObjects.forEach(obj => {
          const key = `${obj.street}|${obj.district}`
          if (!uniqueStreetsMap.has(key)) {
            uniqueStreetsMap.set(key, obj)
          }
        })
        const uniqueStreets = Array.from(uniqueStreetsMap.values())

        // Сортируем
        const searchLower = streetQuery.toLowerCase()
        uniqueStreets.sort((a, b) => {
          const aStartsWith = a.street.toLowerCase().startsWith(searchLower)
          const bStartsWith = b.street.toLowerCase().startsWith(searchLower)
          if (aStartsWith && !bStartsWith) return -1
          if (!aStartsWith && bStartsWith) return 1
          return a.street.localeCompare(b.street)
        })

        setStreets(uniqueStreets)
      } catch (error: any) {
        // Игнорируем ошибки отмены запроса
        if (error.name === 'AbortError') {
          return
        }
        // console.error('❌ Error fetching streets:', error)
        // Не показываем ошибку пользователю, просто очищаем список
        // setStreets([])
      } finally {
        isFetchingStreets.current = false
      }
    },
    []
  )

  // 3. Явная функция для получения почтового индекса
  const fetchPostalCode = useCallback(
    async (street: string, houseNumber: string, city: string, countryValue: string) => {
      console.log('Fetching postal code for:', { street, houseNumber, city, countryValue })
      if (!street || !city || !countryValue) return

      try {
        const fullAddress = houseNumber
          ? `${street} ${houseNumber}, ${city}, ${countryValue.toLowerCase() === 'de' ? 'Germany' : countryValue}`
          : `${street}, ${city}, ${countryValue}`

        const isGermany = countryValue.toLowerCase() === 'de'
        const baseUrl = isGermany ? '/api/photon' : 'https://photon.komoot.io/api'
        console.log('Url:', baseUrl, isGermany)
        const url = `${baseUrl}?q=${encodeURIComponent(fullAddress)}&limit=1`
        // const url = `/api/photon?q=${encodeURIComponent(fullAddress)}&limit=1`

        const res = await fetch(url)
        if (!res.ok) {
          console.error('❌ API response not OK:', res.status, res.statusText)
          return
        }

        const data = await res.json()
        console.log('Fetching postal code from URL:', data)

        if (data.features && data.features.length > 0) {
          const feature = data.features[0]
          const postcode = feature.properties.postcode
          const houseNumberFromAPI = feature.properties.housenumber
          console.log('✅ Found house number from API:', houseNumberFromAPI)
          if (houseNumberFromAPI) {
            setIsHouseInvalid(false)
          } else {
            setIsHouseInvalid(true)
          }

          if (postcode) {
            console.log('✅ Found postal code:', postcode)

            // Получаем координаты
            let coords = null
            if (feature.geometry && feature.geometry.coordinates) {
              const [lng, lat] = feature.geometry.coordinates
              coords = { lat, lng }
              console.log('✅ Found coordinates:', coords)
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
        //setIsFetchingPostcode(false)
        isFetchingPostcode.current = false
      }
    },
    [setAddressData, setAddressCoordinates, setIsHouseInvalid]
  )

  // Обработчики с debounce
  const handleCityInputChange = useCallback(
    (value: string) => {
      console.log('City input changed to:', value)
      if (value.length > 0) {
        setCityQuery(value)
      }

      // Очищаем предыдущий таймер
      if (citySearchTimer.current) {
        clearTimeout(citySearchTimer.current)
      }

      // Устанавливаем новый таймер с увеличенным debounce (500ms вместо 300ms)
      if (value.length >= 3 && country) {
        console.log('Scheduling city fetch for:', value)
        citySearchTimer.current = setTimeout(() => {
          fetchCities(value, country, countryCode)
        }, 500)
      } else {
        setCities([])
      }
    },
    [cityQuery, country, countryCode, fetchCities]
  )
  const handleCityOpenChange = useCallback(
    (isOpen: Boolean) => {
      console.log('isOpenChange:', isOpen)
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
        return
      }

      setStreetQuery(value)

      // Очищаем предыдущий таймер
      if (streetSearchTimer.current) {
        clearTimeout(streetSearchTimer.current)
      }

      // Устанавливаем новый таймер с увеличенным debounce (500ms вместо 300ms)
      if (value.length >= 3 && addressData.city && country) {
        streetSearchTimer.current = setTimeout(() => {
          fetchStreets(value, addressData.city, country, countryCode)
        }, 500)
      }
    },
    [addressData.city, addressData.street, country, countryCode, fetchStreets]
  )

  const handleCitySelection = useCallback(
    (key: React.Key | null) => {
      if (!key) return
      const keyString = String(key)

      /*
      console.log('!!Selected city key:', key, 'cities:', listCities.items)
      const selectedFoo = listCities.items.find(c => c.name === key)
      console.log('Selected city object:', selectedFoo)
      const selected = cities.find(c => c.properties.osm_id === key)
      */
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
        setStreets([])
      }
    },
    [cities, addressData.city]
  )

  const handleStreetSelection = useCallback(
    (key: React.Key | null) => {
      if (!key) return

      const selected = streets.find(s => s.id === Number(key))
      if (selected) {
        const streetName = selected.street
        setStreetQuery(streetName)
        setAddressData(prev => ({
          ...prev,
          street: streetName,
          district: selected.district || prev.district,
        }))
      }
    },
    [streets]
  )

  const handleCountrySelection = useCallback(
    (key: React.Key | null) => {
      if (key) {
        const countryName = key.toString()
        const countryCodeValue = CountriesHelper.getCodeByName(countryName) || ''

        if (countryCodeValue !== addressData.country.toLowerCase()) {
          setCountryCode(countryCodeValue)
          setCountry(countryName)
          setCityQuery('')
          setStreetQuery('')
          setCities([])
          setStreets([])
          setAddressData(prev => ({
            ...prev,
            country: countryName,
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
      //setIsFetchingPostcode(true)
      isFetchingPostcode.current = true
      console.log('House number changed to:', e.target.value)
      setAddressData(prev => ({ ...prev, houseNumber: e.target.value }))
      // Очищаем предыдущий таймер

      if (postalCodeTimer.current) {
        clearTimeout(postalCodeTimer.current)
      }

      // Если zipCode уже есть, не запрашиваем повторно (только если пользователь изменил другие поля)
      if (addressData.street && addressData.city && country && e.target.value) {
        postalCodeTimer.current = setTimeout(() => {
          fetchPostalCode(addressData.street, e.target.value, addressData.city, addressData.country)
        }, 1000) // 1 секунда debounce
        return () => {
          if (postalCodeTimer.current) {
            clearTimeout(postalCodeTimer.current)
          }
        }
      } else {
        // Если не хватает данных для запроса, сбрасываем почтовый индекс
        console.log('Если не хватает данных для запроса, сбрасываем почтовый индекс')
        console.log('e.target.value', e.target.value)
        console.log(
          'addressData.street',
          addressData.street,
          'addressData.houseNumber',
          addressData.houseNumber,
          'addressData.city',
          addressData.city,
          'addressData.country',
          addressData.country
        )
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
    // Очищаем предыдущий таймер
    /*
    if (postalCodeTimer.current) {
      clearTimeout(postalCodeTimer.current)
    }
      */
    /*
    // Если zipCode уже есть, не запрашиваем повторно (только если пользователь изменил другие поля)
    if (addressData.street && addressData.city && country && addressData.houseNumber) {
      postalCodeTimer.current = setTimeout(() => {
        fetchPostalCode(
          addressData.street,
          addressData.houseNumber,
          addressData.city,
          addressData.country
        )
      }, 1000) // 1 секунда debounce
    }
*/
    if (addressData.latitude && addressData.longitude) {
      setAddressCoordinates({ lat: addressData.latitude, lng: addressData.longitude })
    }
    return () => {
      /* if (postalCodeTimer.current) {
        clearTimeout(postalCodeTimer.current)
      }*/
    }
  }, [addressData.street, addressData.houseNumber, addressData.city, country, fetchPostalCode])

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
  }, [client])

  return (
    <Card
      className={`w-full max-w-md border border-gray-200  dark:border-gray-700 ${className || ''}`}
    >
      <Card.Header>
        <Card.Title>
          <span className="text-xl md:text-xl uppercase">
            {isCreateNew ? 'New Client Address' : 'Address'}
          </span>
        </Card.Title>
        <Card.Description>wo Dienstleistungen erbracht werden</Card.Description>
      </Card.Header>
      <Form onSubmit={onSubmit} autoComplete="off">
        <Card.Content>
          <div className="flex flex-col gap-4 ">
            <div className="flex items-center justify-center flex-row gap-2 w-full">
              {/* Город */}
              <ComboBox
                key="cityQuery"
                className="w-2/5 min-w-0 "
                inputValue={listCities.filterText}
                onInputChange={value => {
                  console.log('City input change to:', value)
                  if (value.length > 0) {
                    listCities.setFilterText(value)
                  }
                }}
                // inputValue={cityQuery}
                //  onOpenChange={handleCityOpenChange}
                //onInputChange={handleCityInputChange}
                onSelectionChange={handleCitySelection}
                items={cities}
                isDisabled={!country}
                isRequired
                isInvalid={isCityInvalid}
                aria-label="city Select"
              >
                <Label className="text-lg md:text-base">Stadt </Label>
                <ComboBox.InputGroup>
                  <Input
                    placeholder={country ? 'Type city name...' : 'Select country first'}
                    autoComplete="new-password"
                    className="text-lg md:text-base"
                  />
                  <ComboBox.Trigger />
                </ComboBox.InputGroup>
                <ComboBox.Popover>
                  <ListBox renderEmptyState={() => <EmptyState />}>
                    {listCities.filterText.length < 2 ? (
                      <ListBox.Item key="empty" textValue="Type at least 2 characters">
                        Type at least 2 characters...
                      </ListBox.Item>
                    ) : listCities.items.length === 0 ? (
                      <ListBox.Item key="no-results" textValue="No results">
                        No cities found
                      </ListBox.Item>
                    ) : (
                      <Collection items={listCities.items}>
                        {item => (
                          <ListBox.Item id={item.name} textValue={item.name}>
                            <span className="text-xl md:text-base">{item.name}</span>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        )}
                      </Collection>
                    )}

                    <ListBoxLoadMoreItem
                      isLoading={listCities.loadingState === 'loadingMore'}
                      onLoadMore={listCities.loadMore}
                    >
                      <div className="flex items-center justify-center gap-2 py-2">
                        <Spinner size="sm" />
                        <span className="muted text-sm">Loading more...</span>
                      </div>
                    </ListBoxLoadMoreItem>
                  </ListBox>
                </ComboBox.Popover>
              </ComboBox>

              {/* Улица */}
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
                <Label className="text-lg md:text-base">Hausnummer</Label>
                <InputGroup>
                  <InputGroup.Input
                    placeholder="e.g. 12A"
                    value={addressData.houseNumber}
                    onChange={handleHouseSelection}
                    className="text-lg md:text-base h-10"
                  />
                  <InputGroup.Suffix>
                    {isFetchingPostcode.current && <Spinner className="size-4" />}
                  </InputGroup.Suffix>
                </InputGroup>
              </TextField>
              <TextField name="apartment" className="w-1/3 min-w-0" type="text">
                <Label className="text-lg md:text-base">Apt</Label>
                <Input
                  placeholder="e.g. 102"
                  value={addressData.apartment}
                  onChange={e => setAddressData(prev => ({ ...prev, apartment: e.target.value }))}
                  className="text-lg md:text-base h-10"
                />
              </TextField>
              {/* Почтовый индекс */}
              <TextField name="zipCode" className="w-1/3 min-w-0" type="text">
                <Label className="text-lg md:text-base">PLZ</Label>
                <Input
                  placeholder="12345"
                  value={addressData.zipCode}
                  onChange={e => setAddressData(prev => ({ ...prev, zipCode: e.target.value }))}
                  className="text-lg md:text-base h-10"
                />
              </TextField>
            </div>
            <div className="flex items-center flex-row gap-2 w-full">
              {/* Район/округ */}
              <TextField name="district" type="text" className="w-1/2 min-w-0">
                <Label className="text-lg md:text-base">Bezirk</Label>
                <Input
                  placeholder="e.g. Bad Godesberg"
                  value={addressData.district}
                  onChange={e => setAddressData(prev => ({ ...prev, district: e.target.value }))}
                  autoComplete="off"
                  className="text-lg md:text-base"
                />
              </TextField>

              {/* Страна - Native Select */}
              <TextField className="w-1/2 min-w-0" isRequired>
                <Label className="text-lg md:text-base">Land</Label>
                <select
                  name="country"
                  value={country}
                  onChange={e => {
                    const countryName = e.target.value
                    const countryCodeValue = CountriesHelper.getCodeByName(countryName) || ''
                    if (countryCodeValue !== addressData.country.toLowerCase()) {
                      setCountryCode(countryCodeValue)
                      setCountry(countryName)
                      setAddressData(prev => ({ ...prev, country: countryCodeValue }))
                    }
                  }}
                  className="w-full h-10 px-3 text-lg md:text-base bg-gray-100 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl outline-none cursor-pointer transition-colors"
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
              </TextField>
            </div>
            {/* Карта адреса */}
            <div
              className={`w-full ${addressCoordinates && addressData.zipCode ? 'block' : 'hidden'}`}
            >
              <Label className="mb-2 block">Address Location / Standort</Label>
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
                    Reset
                  </Button>
                )}
                <Button className="w-full max-w-50" type="submit">
                  {isCreateNew ? 'Create' : 'Save'}
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
                  <ListBox>
                    
                    {cities.length > 0 ? (
                      cities.map(item => (
                        <ListBox.Item
                          key={item.properties.osm_id}
                          id={item.properties.osm_id}
                          textValue={item.properties.name}
                        >
                          {item.properties.name}{' '}
                          {item.properties.postcode && `(${item.properties.postcode})`}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))
                    ) : isFetchingCities.current ? (
                      <ListBox.Item key="empty" textValue="loading">
                        Loading cities...
                        <Spinner className="size-4 ml-2" />
                      </ListBox.Item>
                    ) : <ListBox.Item key="empty" textValue="No results">
                        {cityQuery.length < 2 ? 'Type at least 2 characters...' : 'No cities found'}
                      </ListBox.Item>}
                  </ListBox>

*/
