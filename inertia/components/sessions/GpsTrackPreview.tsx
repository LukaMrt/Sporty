import React from 'react'

interface GpsPoint {
  lat: number
  lon: number
}

interface GpsTrackPreviewProps {
  track: GpsPoint[]
  label?: string
  className?: string
}

/**
 * Affiche un aperçu SVG du tracé GPS.
 * Projette les coordonnées lat/lon en SVG par normalisation min-max.
 */
export default function GpsTrackPreview({ track, label, className = '' }: GpsTrackPreviewProps) {
  if (track.length < 2) return null

  const WIDTH = 300
  const HEIGHT = 200
  const PADDING = 10

  const lats = track.map((p) => p.lat)
  const lons = track.map((p) => p.lon)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)

  const latRange = maxLat - minLat || 1
  const lonRange = maxLon - minLon || 1

  // Respecter le ratio d'aspect pour éviter la distorsion
  const scaleX = (WIDTH - 2 * PADDING) / lonRange
  const scaleY = (HEIGHT - 2 * PADDING) / latRange
  const scale = Math.min(scaleX, scaleY)
  const offsetX = (WIDTH - lonRange * scale) / 2
  const offsetY = (HEIGHT - latRange * scale) / 2

  const toX = (lon: number) => offsetX + (lon - minLon) * scale
  // Inverser l'axe Y car SVG a y=0 en haut
  const toY = (lat: number) => HEIGHT - offsetY - (lat - minLat) * scale

  const points = track
    .filter((_, i) => i % Math.ceil(track.length / 500) === 0)
    .map((p) => `${toX(p.lon).toFixed(1)},${toY(p.lat).toFixed(1)}`)
    .join(' ')

  const start = track[0]
  const end = track[track.length - 1]

  return (
    <div className={`rounded-lg border bg-muted/30 overflow-hidden ${className}`}>
      {label && <p className="text-xs text-muted-foreground px-3 pt-2 font-medium">{label}</p>}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }}
        aria-label={label}
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />
        {/* Marqueur de départ */}
        <circle cx={toX(start.lon)} cy={toY(start.lat)} r={4} className="fill-green-500" />
        {/* Marqueur d'arrivée */}
        <circle cx={toX(end.lon)} cy={toY(end.lat)} r={4} className="fill-destructive" />
      </svg>
    </div>
  )
}
