/**
 * List of European country codes (ISO 3166-1 alpha-2)
 * Based on geographic definition of Europe
 * Source: Photon Europe database coverage
 */
export const EUROPEAN_COUNTRY_CODES = [
  // Western Europe
  'DE', // Germany
  'FR', // France
  'NL', // Netherlands
  'BE', // Belgium
  'LU', // Luxembourg
  'AT', // Austria
  'CH', // Switzerland
  'LI', // Liechtenstein
  'MC', // Monaco

  // Northern Europe
  'GB', // United Kingdom
  'IE', // Ireland
  'IS', // Iceland
  'NO', // Norway
  'SE', // Sweden
  'FI', // Finland
  'DK', // Denmark
  'EE', // Estonia
  'LV', // Latvia
  'LT', // Lithuania

  // Southern Europe
  'ES', // Spain
  'PT', // Portugal
  'IT', // Italy
  'VA', // Vatican City
  'SM', // San Marino
  'MT', // Malta
  'GR', // Greece
  'CY', // Cyprus
  'AD', // Andorra

  // Eastern Europe
  'PL', // Poland
  'CZ', // Czech Republic (Czechia)
  'SK', // Slovakia
  'HU', // Hungary
  'RO', // Romania
  'BG', // Bulgaria
  'SI', // Slovenia
  'HR', // Croatia
  'BA', // Bosnia and Herzegovina
  'RS', // Serbia
  'ME', // Montenegro
  'MK', // North Macedonia
  'AL', // Albania
  'XK', // Kosovo
  'MD', // Moldova
  'UA', // Ukraine
  'BY', // Belarus

  // Other European territories
  'GI', // Gibraltar
  'FO', // Faroe Islands
  'AX', // Åland Islands
  'SJ', // Svalbard and Jan Mayen
  'GG', // Guernsey
  'JE', // Jersey
  'IM', // Isle of Man
] as const

/**
 * Check if a country code is in Europe (case-insensitive)
 * @param countryCode ISO 3166-1 alpha-2 country code
 * @returns true if the country is in Europe
 */
export function isEuropeanCountry(countryCode: string | undefined | null): boolean {
  if (!countryCode) return false
  return EUROPEAN_COUNTRY_CODES.includes(countryCode.toUpperCase() as any)
}

/**
 * Get the appropriate geocoding API base URL based on country
 * @param countryCode ISO 3166-1 alpha-2 country code
 * @returns Local Photon API for European countries, Komoot Photon for others
 */
export function getGeocodingApiUrl(countryCode: string | undefined | null): string {
  return isEuropeanCountry(countryCode)
    ? '/api/photon'  // Local Photon instance with Europe data
    : 'https://photon.komoot.io/api'  // Komoot public API for rest of world
}
