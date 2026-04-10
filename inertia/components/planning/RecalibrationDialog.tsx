import React from 'react'
import { router } from '@inertiajs/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/AlertDialog'
import { useTranslation } from '~/hooks/use_translation'

interface Props {
  open: boolean
  currentVdot: number
  proposedVdot: number
  onClose: () => void
}

export default function RecalibrationDialog({ open, currentVdot, proposedVdot, onClose }: Props) {
  const { t } = useTranslation()

  function handleConfirm() {
    router.post('/planning/vdot-down-proposal', { action: 'confirm' }, { onSuccess: onClose })
  }

  function handleDismiss() {
    router.post('/planning/vdot-down-proposal', { action: 'dismiss' }, { onSuccess: onClose })
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('planning.recalibration.vdotDownTitle') ?? 'Ajustement VDOT suggéré'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('planning.recalibration.vdotDownDesc', {
              current: currentVdot,
              proposed: proposedVdot,
            }) ??
              `Vos 3 dernières séances qualité semblent sous les objectifs. Le système suggère de ramener votre VDOT de ${currentVdot} à ${proposedVdot} pour mieux correspondre à votre forme actuelle.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>
            {t('planning.recalibration.keepAsIs') ?? 'Garder tel quel'}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            {t('planning.recalibration.confirm') ?? 'Ajuster le plan'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
