import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useDeliveryStream } from '../../api/sse/useDeliveryStream'

// Fix Leaflet default marker icon path issue with Vite bundler
// @ts-expect-error accessing internal prototype method
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface DriverTrackerMapProps {
  orderId: string
}

const DEFAULT_CENTER: [number, number] = [40.7128, -74.006] // NYC fallback

export function DriverTrackerMap({ orderId }: DriverTrackerMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const driverLocation = useDeliveryStream(orderId)

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current).setView(DEFAULT_CENTER, 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  // Update marker when driver location changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !driverLocation) return

    const pos: [number, number] = [driverLocation.lat, driverLocation.lng]

    if (markerRef.current) {
      markerRef.current.setLatLng(pos)
    } else {
      markerRef.current = L.marker(pos).addTo(map)
    }

    map.setView(pos, map.getZoom())
  }, [driverLocation])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <h2 className="font-semibold mb-3">Driver Location</h2>
      <div ref={containerRef} className="h-64 rounded-lg overflow-hidden" />
    </div>
  )
}
