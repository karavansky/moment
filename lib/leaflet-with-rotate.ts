// Import Leaflet first
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Then import leaflet-rotate to patch Leaflet
// This adds setBearing(), getBearing() methods to L.Map
import 'leaflet-rotate'

// Export the patched Leaflet
export default L
