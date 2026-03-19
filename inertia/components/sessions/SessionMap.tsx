import 'leaflet/dist/leaflet.css'
import React, { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Popup, useMap, CircleMarker } from 'react-leaflet'
import type { LatLngBounds } from 'leaflet'
import L from 'leaflet'
import type { DataPoint, GpsPoint } from '../../../app/domain/value_objects/run_metrics'
import { useTranslation } from '~/hooks/use_translation'

// Fix Leaflet default icon issue with Vite
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl })

type ColorMode = 'pace' | 'hr' | 'none'

interface SessionMapProps {
  gpsTrack: GpsPoint[]
  heartRateCurve?: DataPoint[]
  paceCurve?: DataPoint[]
  altitudeCurve?: DataPoint[]
}

/** Interpole entre bleu (0) et rouge (1) */
function lerp(t: number): string {
  const r = Math.round(t * 255)
  const b = Math.round((1 - t) * 255)
  return `rgb(${r},0,${b})`
}

/** Trouve la valeur la plus proche dans une courbe DataPoint au temps donné */
function findNearestValue(curve: DataPoint[], time: number): number | null {
  if (!curve.length) return null
  let nearest = curve[0]
  let minDiff = Math.abs(curve[0].time - time)
  for (const pt of curve) {
    const diff = Math.abs(pt.time - time)
    if (diff < minDiff) {
      minDiff = diff
      nearest = pt
    }
  }
  return nearest.value
}

/** Formatte une allure en min/km depuis valeur en min/km décimale */
function formatPace(paceMinKm: number): string {
  const min = Math.floor(paceMinKm)
  const sec = Math.round((paceMinKm % 1) * 60)
    .toString()
    .padStart(2, '0')
  return `${min}'${sec}/km`
}

/** Calcule la distance cumulée jusqu'à l'index i (en km) via formule Haversine simplifiée */
function computeCumDistKm(track: GpsPoint[], idx: number): number {
  let dist = 0
  for (let i = 1; i <= idx; i++) {
    const p1 = track[i - 1]
    const p2 = track[i]
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
    const dLon = ((p2.lon - p1.lon) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2
    dist += 6371 * 2 * Math.asin(Math.sqrt(a))
  }
  return dist
}

/** Composant interne qui applique fitBounds après le mount de la map */
function FitBounds({ bounds }: { bounds: LatLngBounds }) {
  const map = useMap()
  React.useEffect(() => {
    map.fitBounds(bounds, { padding: [20, 20] })
  }, [map, bounds])
  return null
}

interface PopupData {
  lat: number
  lon: number
  km: number
  pace: number | null
  hr: number | null
  altitude: number | null
}

export default function SessionMap({
  gpsTrack,
  heartRateCurve = [],
  paceCurve = [],
}: SessionMapProps) {
  const { t } = useTranslation()
  const hasPace = paceCurve.length > 0
  const hasHr = heartRateCurve.length > 0

  const defaultMode: ColorMode = hasPace ? 'pace' : hasHr ? 'hr' : 'none'
  const [colorMode, setColorMode] = useState<ColorMode>(defaultMode)
  const [popupData, setPopupData] = useState<PopupData | null>(null)

  const bounds = useMemo(() => {
    const lats = gpsTrack.map((p) => p.lat)
    const lons = gpsTrack.map((p) => p.lon)
    return L.latLngBounds(
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)]
    )
  }, [gpsTrack])

  // Valeurs min/max pour normalisation du gradient
  const { minVal, maxVal } = useMemo(() => {
    if (colorMode === 'pace' && hasPace) {
      const vals = paceCurve.map((p) => p.value)
      return { minVal: Math.min(...vals), maxVal: Math.max(...vals) }
    }
    if (colorMode === 'hr' && hasHr) {
      const vals = heartRateCurve.map((p) => p.value)
      return { minVal: Math.min(...vals), maxVal: Math.max(...vals) }
    }
    return { minVal: 0, maxVal: 1 }
  }, [colorMode, paceCurve, heartRateCurve, hasPace, hasHr])

  /** Couleur du i-ème segment */
  function segmentColor(i: number): string {
    if (colorMode === 'none') return '#6366f1'
    const pt = gpsTrack[i]
    let raw: number | null = null
    if (colorMode === 'pace' && hasPace) {
      raw = findNearestValue(paceCurve, pt.time)
    } else if (colorMode === 'hr' && hasHr) {
      raw = findNearestValue(heartRateCurve, pt.time)
    }
    if (raw === null || maxVal === minVal) return lerp(0.5)
    return lerp(Math.max(0, Math.min(1, (raw - minVal) / (maxVal - minVal))))
  }

  function handleSegmentClick(idx: number) {
    const pt = gpsTrack[idx]
    const km = computeCumDistKm(gpsTrack, idx)
    const pace = hasPace ? findNearestValue(paceCurve, pt.time) : null
    const hr = hasHr ? findNearestValue(heartRateCurve, pt.time) : null
    setPopupData({ lat: pt.lat, lon: pt.lon, km, pace, hr, altitude: pt.ele ?? null })
  }

  const start = gpsTrack[0]
  const end = gpsTrack[gpsTrack.length - 1]

  const btnClass = (active: boolean) =>
    `cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'bg-muted text-muted-foreground hover:bg-muted/80'
    }`

  return (
    <div className="space-y-2">
      {/* Toggles couleur (uniquement si données disponibles) */}
      {(hasPace || hasHr) && (
        <div className="flex gap-2">
          {hasPace && (
            <button
              type="button"
              onClick={() => setColorMode('pace')}
              className={btnClass(colorMode === 'pace')}
            >
              {t('sessions.show.mapColorPace')}
            </button>
          )}
          {hasHr && (
            <button
              type="button"
              onClick={() => setColorMode('hr')}
              className={btnClass(colorMode === 'hr')}
            >
              {t('sessions.show.mapColorHr')}
            </button>
          )}
        </div>
      )}

      <MapContainer
        style={{ height: '320px', width: '100%', borderRadius: '0.5rem' }}
        center={[start.lat, start.lon]}
        zoom={13}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bounds={bounds} />

        {/* Polyline segmentée par gradient */}
        {gpsTrack.slice(0, -1).map((pt, i) => (
          <Polyline
            key={`${colorMode}-${i}`}
            positions={[
              [pt.lat, pt.lon],
              [gpsTrack[i + 1].lat, gpsTrack[i + 1].lon],
            ]}
            pathOptions={{ color: segmentColor(i), weight: 4 }}
            eventHandlers={{ click: () => handleSegmentClick(i) }}
          />
        ))}

        {/* Marqueur départ */}
        <CircleMarker
          center={[start.lat, start.lon]}
          radius={7}
          pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1, weight: 2 }}
        />

        {/* Marqueur arrivée */}
        <CircleMarker
          center={[end.lat, end.lon]}
          radius={7}
          pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 1, weight: 2 }}
        />

        {/* Popup interactif */}
        {popupData && (
          <Popup position={[popupData.lat, popupData.lon]} onClose={() => setPopupData(null)}>
            <div className="text-sm space-y-0.5">
              <p>
                <span className="font-medium">Km :</span> {popupData.km.toFixed(2)} km
              </p>
              {popupData.pace !== null && (
                <p>
                  <span className="font-medium">Allure :</span> {formatPace(popupData.pace)}
                </p>
              )}
              {popupData.hr !== null && (
                <p>
                  <span className="font-medium">FC :</span> {Math.round(popupData.hr)} bpm
                </p>
              )}
              {popupData.altitude !== null && (
                <p>
                  <span className="font-medium">Altitude :</span> {Math.round(popupData.altitude)} m
                </p>
              )}
            </div>
          </Popup>
        )}
      </MapContainer>
    </div>
  )
}
