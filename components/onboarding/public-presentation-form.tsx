'use client'

import { useActionState, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormMessage } from '@/components/ui/form-message'
import {
  savePublicPresentationProfileAction,
  type PublicPresentationActionState,
} from '@/modules/profiles/actions'
import type { BodyType, EyeColor, HairColor, HairLength } from '@/modules/profiles/types'
import { useI18n } from '@/components/i18n'
import { OFFERING_GROUPS, OFFERING_OPTIONS, type OfferingGroup, type OfferingStatusMap } from '@/modules/offerings/types'

const initialState: PublicPresentationActionState = { success: false, error: '' }

const eyeColors: Array<[EyeColor, string]> = [['BLACK', 'Pretos'], ['BROWN', 'Castanhos'], ['GREEN', 'Verdes'], ['BLUE', 'Azuis'], ['HAZEL', 'Mel'], ['OTHER', 'Outro']]
const hairColors: Array<[HairColor, string]> = [['BLACK', 'Preto'], ['BRUNETTE', 'Castanho'], ['BLONDE', 'Loiro'], ['REDHEAD', 'Ruivo'], ['OTHER', 'Outro']]
const hairLengths: Array<[HairLength, string]> = [['SHORT', 'Curto'], ['MEDIUM', 'Médio'], ['LONG', 'Longo'], ['VERY_LONG', 'Muito longo'], ['BALD', 'Raspado / sem cabelo']]
const bodyTypes: Array<[BodyType, string]> = [['SLIM', 'Magra'], ['ATHLETIC', 'Atlética'], ['CURVY', 'Curvilínea'], ['AVERAGE', 'Média'], ['PLUS_SIZE', 'Plus size'], ['OTHER', 'Outro']]

interface PublicPresentationFormProps {
  initial: {
    headline: string
    bio: string
    publicAge: number | null
    heightCm: number | null
    weightKg: number | null
    eyeColor: EyeColor | null
    hairColor: HairColor | null
    hairLength: HairLength | null
    bodyType: BodyType | null
    showAge: boolean
    showHeight: boolean
    showWeight: boolean
  }
  initialOfferings: OfferingStatusMap
}

const groupTranslation: Record<OfferingGroup, string> = { AUDIENCE: 'offering.group.audience', SERVICES: 'offering.group.services', LOCATIONS: 'offering.group.locations', AVAILABILITY: 'offering.group.availability' }

function ProfileSelect({ id, label, value, options, error }: { id: string; label: string; value: string | null; options: Array<[string, string]>; error?: string }) {
  const { t } = useI18n()
  return (
    <div className="onboarding-field">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} name={id} defaultValue={value ?? ''} className={`onboarding-select ${error ? 'input--error' : ''}`} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined}>
        <option value="">{t('profileForm.preferNot')}</option>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
      {error && <p id={`${id}-error`} className="input-error" role="alert">{error}</p>}
    </div>
  )
}

export function PublicPresentationForm({ initial, initialOfferings }: PublicPresentationFormProps) {
  const { locale, t } = useI18n()
  const offeringText = (key: string) => t(key as Parameters<typeof t>[0])
  const localizedEyeColors = locale === 'en' ? [['BLACK', 'Black'], ['BROWN', 'Brown'], ['GREEN', 'Green'], ['BLUE', 'Blue'], ['HAZEL', 'Hazel'], ['OTHER', 'Other']] : eyeColors
  const localizedHairColors = locale === 'en' ? [['BLACK', 'Black'], ['BRUNETTE', 'Brown'], ['BLONDE', 'Blonde'], ['REDHEAD', 'Red'], ['OTHER', 'Other']] : hairColors
  const localizedHairLengths = locale === 'en' ? [['SHORT', 'Short'], ['MEDIUM', 'Medium'], ['LONG', 'Long'], ['VERY_LONG', 'Very long'], ['BALD', 'Shaved / no hair']] : hairLengths
  const localizedBodyTypes = locale === 'en' ? [['SLIM', 'Slim'], ['ATHLETIC', 'Athletic'], ['CURVY', 'Curvy'], ['AVERAGE', 'Average'], ['PLUS_SIZE', 'Plus size'], ['OTHER', 'Other']] : bodyTypes
  const [state, formAction, isPending] = useActionState(savePublicPresentationProfileAction, initialState)
  const [bioLength, setBioLength] = useState(initial.bio.length)
  const fieldErrors = !state.success ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="onboarding-form onboarding-profile-form" noValidate>
      {!state.success && state.error && !fieldErrors && <FormMessage type="error" message={state.error} />}

      <div className="onboarding-field">
        <Label htmlFor="headline" required>{t('profileForm.headline')}</Label>
        <Input id="headline" name="headline" defaultValue={initial.headline} maxLength={120} placeholder={t('profileForm.headlinePlaceholder')} error={fieldErrors?.headline?.[0]} required />
        <p className="field-note">{t('profileForm.headlineNote')}</p>
      </div>

      <div className="onboarding-field">
        <Label htmlFor="bio" required>{t('profileForm.bio')}</Label>
        <textarea id="bio" name="bio" defaultValue={initial.bio} minLength={20} maxLength={2000} rows={7} className={`onboarding-textarea ${fieldErrors?.bio ? 'input--error' : ''}`} aria-invalid={fieldErrors?.bio ? 'true' : undefined} aria-describedby={`bio-note bio-counter${fieldErrors?.bio ? ' bio-error' : ''}`} onChange={(event) => setBioLength(event.currentTarget.value.length)} required />
        <div className="field-note-row"><p id="bio-note" className="field-note">{t('profileForm.bioNote')}</p><span id="bio-counter" aria-live="polite">{bioLength}/2000</span></div>
        {fieldErrors?.bio?.[0] && <p id="bio-error" className="input-error" role="alert">{fieldErrors.bio[0]}</p>}
      </div>

      <fieldset className="onboarding-fieldset">
        <legend>{t('profileForm.publicInfo')}</legend>
        <div className="onboarding-field-grid onboarding-field-grid--three">
          <div className="onboarding-field">
            <Label htmlFor="public_age">{t('profileForm.publicAge')}</Label>
            <Input id="public_age" name="public_age" type="number" inputMode="numeric" min={18} max={99} defaultValue={initial.publicAge ?? ''} error={fieldErrors?.public_age?.[0]} />
            <label className="onboarding-privacy-toggle"><input type="checkbox" name="show_age" defaultChecked={initial.showAge} /> {t('profileForm.showAge')}</label>
          </div>
          <div className="onboarding-field">
            <Label htmlFor="height_cm">{t('profileForm.height')}</Label>
            <div className="measurement-input"><Input id="height_cm" name="height_cm" type="number" inputMode="numeric" min={100} max={250} defaultValue={initial.heightCm ?? ''} error={fieldErrors?.height_cm?.[0]} /><span>cm</span></div>
            <label className="onboarding-privacy-toggle"><input type="checkbox" name="show_height" defaultChecked={initial.showHeight} /> {t('profileForm.showHeight')}</label>
          </div>
          <div className="onboarding-field">
            <Label htmlFor="weight_kg">{t('profileForm.weight')}</Label>
            <div className="measurement-input"><Input id="weight_kg" name="weight_kg" type="number" inputMode="numeric" min={30} max={300} defaultValue={initial.weightKg ?? ''} error={fieldErrors?.weight_kg?.[0]} /><span>kg</span></div>
            <label className="onboarding-privacy-toggle"><input type="checkbox" name="show_weight" defaultChecked={initial.showWeight} /> {t('profileForm.showWeight')}</label>
          </div>
        </div>
        <p className="field-note">{t('profileForm.optionalNote')}</p>
      </fieldset>

      <fieldset className="onboarding-fieldset offering-editor">
        <legend>{t('offering.editor.title')}</legend>
        <p className="field-note">{t('offering.editor.help')}</p>
        {OFFERING_GROUPS.map((group, index) => (
          <details key={group} className="offering-editor-group" open={index === 0}>
            <summary>{offeringText(groupTranslation[group])}</summary>
            <div className="offering-editor-options">
              {OFFERING_OPTIONS.filter((option) => option.group === group).map((option) => (
                <label key={option.code} className="offering-editor-option">
                  <span>{offeringText(`offering.option.${option.code}`)}</span>
                  <select name={`offering_${option.code}`} defaultValue={initialOfferings[option.code]} aria-label={`${offeringText(`offering.option.${option.code}`)} — ${t('offering.editor.status')}`}>
                    <option value="UNSPECIFIED">{t('offering.status.unspecified')}</option>
                    <option value="OFFERED">{t('offering.status.offered')}</option>
                    <option value="NOT_OFFERED">{t('offering.status.notOffered')}</option>
                  </select>
                </label>
              ))}
            </div>
          </details>
        ))}
      </fieldset>

      <fieldset className="onboarding-fieldset">
        <legend>{t('profileForm.characteristics')}</legend>
        <div className="onboarding-field-grid">
          <ProfileSelect id="hair_color" label={t('profileForm.hairColor')} value={initial.hairColor} options={localizedHairColors as Array<[string, string]>} error={fieldErrors?.hair_color?.[0]} />
          <ProfileSelect id="hair_length" label={t('profileForm.hairLength')} value={initial.hairLength} options={localizedHairLengths as Array<[string, string]>} error={fieldErrors?.hair_length?.[0]} />
          <ProfileSelect id="eye_color" label={t('profileForm.eyeColor')} value={initial.eyeColor} options={localizedEyeColors as Array<[string, string]>} error={fieldErrors?.eye_color?.[0]} />
          <ProfileSelect id="body_type" label={t('profileForm.bodyType')} value={initial.bodyType} options={localizedBodyTypes as Array<[string, string]>} error={fieldErrors?.body_type?.[0]} />
        </div>
      </fieldset>

      <button type="submit" className="onboarding-primary" disabled={isPending}>
        {isPending ? t('onboarding.saving') : t('onboarding.saveContinue')}<span aria-hidden="true">→</span>
      </button>
    </form>
  )
}
