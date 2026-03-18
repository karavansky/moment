#!/usr/bin/env python3
import sys
import json
import math

# Read OSRM response from stdin
data = json.load(sys.stdin)

if data['code'] != 'Ok':
    print(f'Error: {data}', file=sys.stderr)
    sys.exit(1)

route = data['routes'][0]
coords = route['geometry']['coordinates']

print(f'Original points: {len(coords)}', file=sys.stderr)
print(f'Total distance: {route["distance"]:.1f}m', file=sys.stderr)
print(f'Total duration: {route["duration"]:.1f}s', file=sys.stderr)

# Calculate distance between two points (Haversine formula)
def haversine(lon1, lat1, lon2, lat2):
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return R * c

# Interpolate points every ~16.66 meters (for 30 km/h with 2s GPS updates)
# Speed: 30 km/h = 8.33 m/s
# GPS interval: 2 seconds
# Distance per interval: 8.33 m/s × 2s = 16.66 meters
target_interval = 16.66  # meters
interpolated = []

for i in range(len(coords) - 1):
    lon1, lat1 = coords[i]
    lon2, lat2 = coords[i + 1]

    # Add first point
    if i == 0:
        interpolated.append({'lng': lon1, 'lat': lat1})

    # Calculate distance between points
    dist = haversine(lon1, lat1, lon2, lat2)

    # Number of segments needed
    num_segments = max(1, int(round(dist / target_interval)))

    # Add intermediate points
    for j in range(1, num_segments + 1):
        t = j / num_segments
        lng = lon1 + (lon2 - lon1) * t
        lat = lat1 + (lat2 - lat1) * t
        interpolated.append({'lng': lng, 'lat': lat})

print(f'Interpolated points: {len(interpolated)}', file=sys.stderr)
print(f'Average interval: {route["distance"] / len(interpolated):.1f}m', file=sys.stderr)

# Output JSON
output = {
    'name': 'Burgstraße 156 → 69 → 156',
    'description': 'Test route with proper GPS interval (30 km/h @ 2s = ~16.66m between points)',
    'speedKmh': 30,
    'updateIntervalMs': 2000,
    'points': interpolated
}

print(json.dumps(output, indent=2))
