import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { ChevronLeft } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import SessionForm from '~/components/sessions/SessionForm'
import { useTranslation } from '~/hooks/use_translation'

interface TrainingSessionProps {
  id: number
  sportId: number
  sportName: string
  date: string
  durationMinutes: number
  distanceKm: number | null
  avgHeartRate: number | null
  perceivedEffort: number | null
  notes: string | null
}

interface Sport {
  id: number
  name: string
  slug: string
}

interface EditProps {
  session: TrainingSessionProps
  sports: Sport[]
}

export default function SessionEdit({ session, sports }: EditProps) {
  const { t } = useTranslation()

  return (
    <>
      <Head title={`${t('sessions.edit.title')} — ${session.sportName}`} />

      <div className="flex items-center justify-between p-4 md:p-6">
        <Link
          href={`/sessions/${session.id}`}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">{t('sessions.edit.back')}</span>
        </Link>
        <h1 className="text-lg font-bold text-foreground">{t('sessions.edit.title')}</h1>
        <div className="w-16" />
      </div>

      <div className="px-4 pb-8 md:px-6">
        <SessionForm
          mode="edit"
          session={{
            id: session.id,
            sportId: session.sportId,
            date: session.date,
            durationMinutes: session.durationMinutes,
            distanceKm: session.distanceKm,
            avgHeartRate: session.avgHeartRate,
            perceivedEffort: session.perceivedEffort,
            notes: session.notes,
          }}
          sports={sports}
        />
      </div>
    </>
  )
}

SessionEdit.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
