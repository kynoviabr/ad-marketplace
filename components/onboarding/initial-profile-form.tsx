'use client'

import { useActionState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormMessage } from '@/components/ui/form-message'
import {
  saveInitialProfessionalProfileAction,
  type InitialProfileActionState,
} from '@/modules/profiles/actions'
import { useI18n } from '@/components/i18n'

const initialState: InitialProfileActionState = { success: false, error: '' }

interface InitialProfileFormProps {
  initialStageName: string
  initialWhatsappPhone: string
}

export function InitialProfileForm({
  initialStageName,
  initialWhatsappPhone,
}: InitialProfileFormProps) {
  const { t } = useI18n()
  const [state, formAction, isPending] = useActionState(
    saveInitialProfessionalProfileAction,
    initialState
  )
  const fieldErrors = !state.success ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="onboarding-form" noValidate>
      {state.success && (
        <FormMessage
          type="success"
          message={t('onboarding.saved')}
        />
      )}
      {!state.success && state.error && !fieldErrors && (
        <FormMessage type="error" message={state.error} />
      )}

      <div className="onboarding-field">
        <Label htmlFor="stage_name" required>{t('onboarding.stageName')}</Label>
        <Input
          id="stage_name"
          name="stage_name"
          autoComplete="nickname"
          defaultValue={state.success ? state.data.stageName : initialStageName}
          placeholder={t('onboarding.stageNamePlaceholder')}
          error={fieldErrors?.stage_name?.[0]}
          minLength={2}
          maxLength={60}
          required
        />
        <p className="field-note">{t('onboarding.stageNameNote')}</p>
      </div>

      <div className="onboarding-field">
        <Label htmlFor="whatsapp_phone">WhatsApp</Label>
        <Input
          id="whatsapp_phone"
          name="whatsapp_phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={state.success ? state.data.whatsappPhone ?? '' : initialWhatsappPhone}
          placeholder="(11) 99999-9999"
          error={fieldErrors?.whatsapp_phone?.[0]}
        />
        <p className="field-note">{t('onboarding.whatsappOptional')}</p>
      </div>

      <button type="submit" className="onboarding-primary" disabled={isPending}>
        {isPending ? t('onboarding.saving') : state.success ? t('onboarding.saveAgain') : t('onboarding.saveContinue')}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  )
}
