import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { SPORT_COLORS } from './shared'

export type TrackPreview = {
  id: number
  date: string
  sportSlug: string
  track: [number, number][]
}

function FitAll({ tracks }: { tracks: TrackPreview[] }) {
  const map = useMap()
  useEffect(() => {
    const points = tracks.flatMap((t) => t.track)
    if (points.length > 0) map.fitBounds(L.latLngBounds(points), { padding: [20, 20] })
  }, [map, tracks])
  return null
}

/**
 * F2 · Toutes les traces superposées, en semi-transparence : les parcours
 * les plus fréquentés ressortent par accumulation (carte de chaleur).
 */
export default function TracksMap({
  tracks,
  onSelect,
}: {
  tracks: TrackPreview[]
  onSelect?: (id: number) => void
}) {
  const visible = useMemo(() => tracks.filter((t) => t.track.length > 1), [tracks])
  if (visible.length === 0) return null
  return (
    <MapContainer
      style={{ height: '70vh', width: '100%', borderRadius: '0.75rem' }}
      center={visible[0].track[0]}
      zoom={12}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitAll tracks={visible} />
      {visible.map((t) => (
        <Polyline
          key={t.id}
          positions={t.track}
          pathOptions={{
            color: SPORT_COLORS[t.sportSlug] ?? SPORT_COLORS.other,
            weight: 3,
            opacity: 0.25,
          }}
          eventHandlers={onSelect ? { click: () => onSelect(t.id) } : undefined}
        />
      ))}
    </MapContainer>
  )
}
