import { useState } from 'react'
import { useSSEConnection } from '../../hooks/useSSEConnection'
import { DriverLocationEventSchema } from '../../types/events'
import type { DriverLocation } from '../../types/models'
import type { DriverLocationEvent } from '../../types/events'

export function useDeliveryStream(orderId: string, enabled = true): DriverLocation | null {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null)

  useSSEConnection(
    `/api/sse/delivery/${orderId}`,
    DriverLocationEventSchema,
    (event: DriverLocationEvent) => {
      setDriverLocation({
        driverId: event.driverId,
        lat: event.lat,
        lng: event.lng,
        updatedAt: event.updatedAt,
      })
    },
    { enabled }
  )

  return driverLocation
}
