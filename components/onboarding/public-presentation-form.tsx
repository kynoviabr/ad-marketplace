'use client'

import Link from 'next/link'
import { useActionState, useState, useEffect } from 'react'
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
    audienceSetting: 'PUBLIC' | 'VIP_ONLY'
  }
  initialOfferings: OfferingStatusMap
}

const groupTranslation: Record<OfferingGroup, string> = {
  AUDIENCE: 'offering.group.audience',
  SERVICES: 'offering.group.services',
  LOCATIONS: 'offering.group.locations',
  AVAILABILITY: 'offering.group.availability',
}

type SectionKey = 'audience' | 'services' | 'locations' | 'availability' | 'presentation' | 'characteristics' | 'visibility'

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

  // App Mode / Summary UX state
  const [viewMode, setViewMode] = useState<'summary' | 'form'>('form')
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null)

  useEffect(() => {
    // In standalone PWA mode, default to summary-first
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (isStandalone) {
      requestAnimationFrame(() => {
        setViewMode('summary')
      })
    }
  }, [])

  const offeringStatusLabel = (status: string) => {
    if (status === 'OFFERED') return t('offering.status.offered')
    if (status === 'NOT_OFFERED') return t('offering.status.notOffered')
    return t('offering.status.unspecified')
  }

  // Summaries calculation
  const audienceSummary = OFFERING_OPTIONS.filter((o) => o.group === 'AUDIENCE')
    .map((o) => `${offeringText(`offering.option.${o.code}`)}: ${offeringStatusLabel(initialOfferings[o.code] ?? 'UNSPECIFIED')}`)
    .join(' · ')

  const servicesOfferedCount = OFFERING_OPTIONS.filter(
    (o) => o.group === 'SERVICES' && initialOfferings[o.code] === 'OFFERED'
  ).length
  const servicesSummary = servicesOfferedCount > 0
    ? `${servicesOfferedCount} ${t('profileSummary.selectedCount')}`
    : t('profileSummary.notConfigured')

  const locationsOffered = OFFERING_OPTIONS.filter(
    (o) => o.group === 'LOCATIONS' && initialOfferings[o.code] === 'OFFERED'
  ).map((o) => offeringText(`offering.option.${o.code}`))
  const locationsSummary = locationsOffered.length > 0
    ? locationsOffered.join(' · ')
    : t('profileSummary.notConfigured')

  const availabilityOffered = OFFERING_OPTIONS.filter(
    (o) => o.group === 'AVAILABILITY' && initialOfferings[o.code] === 'OFFERED'
  ).map((o) => offeringText(`offering.option.${o.code}`))
  const availabilitySummary = availabilityOffered.length > 0
    ? availabilityOffered.join(' · ')
    : t('profileSummary.notConfigured')

  const characteristicsSummary = [
    initial.publicAge ? `${initial.publicAge} anos` : null,
    initial.heightCm ? `${initial.heightCm} cm` : null,
    initial.weightKg ? `${initial.weightKg} kg` : null,
    initial.hairColor ? localizedHairColors.find(([k]) => k === initial.hairColor)?.[1] : null,
    initial.eyeColor ? localizedEyeColors.find(([k]) => k === initial.eyeColor)?.[1] : null,
    initial.bodyType ? localizedBodyTypes.find(([k]) => k === initial.bodyType)?.[1] : null,
  ].filter(Boolean).join(' · ') || t('offering.status.unspecified')

  const visibilitySummary = initial.audienceSetting === 'VIP_ONLY'
    ? t('profileForm.audienceVipOnly')
    : t('profileForm.audiencePublic')

  // Render focused section editing form
  if (editingSection) {
    return (
      <form action={formAction} className="onboarding-form onboarding-profile-form focused-section-form" noValidate>
        <div className="focused-section-header">
          <button
            type="button"
            className="onboarding-secondary focused-back-btn"
            onClick={() => setEditingSection(null)}
          >
            ← {t('profileSummary.backToSummary')}
          </button>
        </div>

        {!state.success && state.error && !fieldErrors && <FormMessage type="error" message={state.error} />}

        {/* Section: Presentation */}
        {editingSection === 'presentation' && (
          <fieldset className="onboarding-fieldset">
            <legend>{t('profileSummary.presentation')}</legend>
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
          </fieldset>
        )}

        {/* Section: Audience */}
        {editingSection === 'audience' && (
          <fieldset className="onboarding-fieldset offering-editor">
            <legend>{t('profileSummary.audience')}</legend>
            <p className="field-note">{t('offering.editor.help')}</p>
            <div className="offering-editor-options">
              {OFFERING_OPTIONS.filter((o) => o.group === 'AUDIENCE').map((option) => (
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
          </fieldset>
        )}

        {/* Section: Services */}
        {editingSection === 'services' && (
          <fieldset className="onboarding-fieldset offering-editor">
            <legend>{t('profileSummary.services')}</legend>
            <p className="field-note">{t('offering.editor.help')}</p>
            <div className="offering-editor-options">
              {OFFERING_OPTIONS.filter((o) => o.group === 'SERVICES').map((option) => (
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
          </fieldset>
        )}

        {/* Section: Locations */}
        {editingSection === 'locations' && (
          <fieldset className="onboarding-fieldset offering-editor">
            <legend>{t('profileSummary.locations')}</legend>
            <p className="field-note">{t('offering.editor.help')}</p>
            <div className="offering-editor-options">
              {OFFERING_OPTIONS.filter((o) => o.group === 'LOCATIONS').map((option) => (
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
          </fieldset>
        )}

        {/* Section: Availability */}
        {editingSection === 'availability' && (
          <fieldset className="onboarding-fieldset offering-editor">
            <legend>{t('profileSummary.availability')}</legend>
            <p className="field-note">{t('offering.editor.help')}</p>
            <div className="offering-editor-options">
              {OFFERING_OPTIONS.filter((o) => o.group === 'AVAILABILITY').map((option) => (
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
          </fieldset>
        )}

        {/* Section: Characteristics */}
        {editingSection === 'characteristics' && (
          <>
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
          </>
        )}

        {/* Section: Visibility */}
        {editingSection === 'visibility' && (
          <fieldset className="onboarding-fieldset">
            <legend>{t('profileForm.audienceSetting')}</legend>
            <div className="onboarding-field-grid">
              <label className="onboarding-privacy-toggle">
                <input type="radio" name="audience_setting" value="PUBLIC" defaultChecked={initial.audienceSetting !== 'VIP_ONLY'} />
                {t('profileForm.audiencePublic')}
              </label>
              <label className="onboarding-privacy-toggle">
                <input type="radio" name="audience_setting" value="VIP_ONLY" defaultChecked={initial.audienceSetting === 'VIP_ONLY'} />
                {t('profileForm.audienceVipOnly')}
              </label>
            </div>
          </fieldset>
        )}

        {/* Hidden preservation inputs for all other fields */}
        {editingSection !== 'presentation' && (
          <>
            <input type="hidden" name="headline" value={initial.headline} />
            <input type="hidden" name="bio" value={initial.bio} />
          </>
        )}
        {editingSection !== 'characteristics' && (
          <>
            <input type="hidden" name="public_age" value={initial.publicAge ?? ''} />
            {initial.showAge && <input type="hidden" name="show_age" value="on" />}
            <input type="hidden" name="height_cm" value={initial.heightCm ?? ''} />
            {initial.showHeight && <input type="hidden" name="show_height" value="on" />}
            <input type="hidden" name="weight_kg" value={initial.weightKg ?? ''} />
            {initial.showWeight && <input type="hidden" name="show_weight" value="on" />}
            <input type="hidden" name="hair_color" value={initial.hairColor ?? ''} />
            <input type="hidden" name="hair_length" value={initial.hairLength ?? ''} />
            <input type="hidden" name="eye_color" value={initial.eyeColor ?? ''} />
            <input type="hidden" name="body_type" value={initial.bodyType ?? ''} />
          </>
        )}
        {editingSection !== 'visibility' && (
          <input type="hidden" name="audience_setting" value={initial.audienceSetting} />
        )}
        {/* Preserve non-edited offerings */}
        {OFFERING_OPTIONS.map((option) => {
          const isCurrentSection =
            (editingSection === 'audience' && option.group === 'AUDIENCE') ||
            (editingSection === 'services' && option.group === 'SERVICES') ||
            (editingSection === 'locations' && option.group === 'LOCATIONS') ||
            (editingSection === 'availability' && option.group === 'AVAILABILITY')
          if (isCurrentSection) return null
          return (
            <input
              key={option.code}
              type="hidden"
              name={`offering_${option.code}`}
              value={initialOfferings[option.code] ?? 'UNSPECIFIED'}
            />
          )
        })}

        <div className="onboarding-actions focused-section-actions">
          <button
            type="button"
            className="onboarding-secondary"
            onClick={() => setEditingSection(null)}
          >
            {t('common.cancel')}
          </button>
          <button type="submit" className="onboarding-primary" disabled={isPending}>
            {isPending ? t('onboarding.saving') : t('profileSummary.saveChanges')}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    )
  }

  // Render Summary View
  if (viewMode === 'summary') {
    return (
      <div className="profile-summary-view">
        <div className="profile-mode-toggle-bar">
          <button
            type="button"
            className="profile-mode-toggle-btn"
            onClick={() => setViewMode('form')}
          >
            {t('profileSummary.viewFullForm')}
          </button>
        </div>

        <div className="profile-summary-cards">
          {/* 1. Atende */}
          <article className="profile-summary-card">
            <div className="profile-summary-card-body">
              <h3 className="profile-summary-card-title">{t('profileSummary.audience')}</h3>
              <p className="profile-summary-card-desc">{audienceSummary}</p>
            </div>
            <button
              type="button"
              className="profile-summary-edit-btn"
              onClick={() => setEditingSection('audience')}
            >
              {t('profileSummary.edit')} →
            </button>
          </article>

          {/* 2. Serviços */}
          <article className="profile-summary-card">
            <div className="profile-summary-card-body">
              <h3 className="profile-summary-card-title">{t('profileSummary.services')}</h3>
              <p className="profile-summary-card-desc">{servicesSummary}</p>
            </div>
            <button
              type="button"
              className="profile-summary-edit-btn"
              onClick={() => setEditingSection('services')}
            >
              {t('profileSummary.edit')} →
            </button>
          </article>

          {/* 3. Locais */}
          <article className="profile-summary-card">
            <div className="profile-summary-card-body">
              <h3 className="profile-summary-card-title">{t('profileSummary.locations')}</h3>
              <p className="profile-summary-card-desc">{locationsSummary}</p>
            </div>
            <button
              type="button"
              className="profile-summary-edit-btn"
              onClick={() => setEditingSection('locations')}
            >
              {t('profileSummary.edit')} →
            </button>
          </article>

          {/* 4. Disponibilidade */}
          <article className="profile-summary-card">
            <div className="profile-summary-card-body">
              <h3 className="profile-summary-card-title">{t('profileSummary.availability')}</h3>
              <p className="profile-summary-card-desc">{availabilitySummary}</p>
            </div>
            <button
              type="button"
              className="profile-summary-edit-btn"
              onClick={() => setEditingSection('availability')}
            >
              {t('profileSummary.edit')} →
            </button>
          </article>

          {/* 5. Apresentação */}
          <article className="profile-summary-card">
            <div className="profile-summary-card-body">
              <h3 className="profile-summary-card-title">{t('profileSummary.presentation')}</h3>
              <p className="profile-summary-card-desc">
                {initial.headline || (locale === 'en' ? 'No headline added' : 'Nenhum título adicionado')}
              </p>
            </div>
            <button
              type="button"
              className="profile-summary-edit-btn"
              onClick={() => setEditingSection('presentation')}
            >
              {t('profileSummary.edit')} →
            </button>
          </article>

          {/* 6. Características */}
          <article className="profile-summary-card">
            <div className="profile-summary-card-body">
              <h3 className="profile-summary-card-title">{t('profileSummary.characteristics')}</h3>
              <p className="profile-summary-card-desc">{characteristicsSummary}</p>
            </div>
            <button
              type="button"
              className="profile-summary-edit-btn"
              onClick={() => setEditingSection('characteristics')}
            >
              {t('profileSummary.edit')} →
            </button>
          </article>

          {/* 7. Visibilidade */}
          <article className="profile-summary-card">
            <div className="profile-summary-card-body">
              <h3 className="profile-summary-card-title">{t('profileSummary.visibility')}</h3>
              <p className="profile-summary-card-desc">{visibilitySummary}</p>
            </div>
            <button
              type="button"
              className="profile-summary-edit-btn"
              onClick={() => setEditingSection('visibility')}
            >
              {t('profileSummary.edit')} →
            </button>
          </article>
        </div>

        <div className="onboarding-actions profile-summary-actions">
          <Link href="/onboarding/voce" className="onboarding-secondary">
            ← {t('common.back')}
          </Link>
          <Link href="/onboarding/onde-atende" className="onboarding-primary">
            {t('common.continue')} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    )
  }

  // Render Full Sequential Form (Web Mode default)
  return (
    <form action={formAction} className="onboarding-form onboarding-profile-form" noValidate>
      <div className="profile-mode-toggle-bar">
        <button
          type="button"
          className="profile-mode-toggle-btn"
          onClick={() => setViewMode('summary')}
        >
          {t('profileSummary.viewSummary')}
        </button>
      </div>

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

      <fieldset className="onboarding-fieldset">
        <legend>{t('profileForm.audienceSetting')}</legend>
        <p className="onboarding-field-note">
          {t('profileForm.audienceNote')}{' '}
          <Link
            href={locale === 'en' ? '/en/ajuda/perfil-publico-vs-vip' : '/ajuda/perfil-publico-vs-vip'}
            className="onboarding-inline-help-link"
          >
            {locale === 'en' ? 'Need help? Learn more →' : 'Precisa de ajuda? Saiba mais →'}
          </Link>
        </p>
        <div className="onboarding-field-grid">
          <label className="onboarding-privacy-toggle">
            <input
              type="radio"
              name="audience_setting"
              value="PUBLIC"
              defaultChecked={initial.audienceSetting !== 'VIP_ONLY'}
            />
            {t('profileForm.audiencePublic')}
          </label>
          <label className="onboarding-privacy-toggle">
            <input
              type="radio"
              name="audience_setting"
              value="VIP_ONLY"
              defaultChecked={initial.audienceSetting === 'VIP_ONLY'}
            />
            {t('profileForm.audienceVipOnly')}
          </label>
        </div>
      </fieldset>

      <div className="onboarding-actions">
        <Link href="/onboarding/voce" className="onboarding-secondary">
          ← {t('common.back')}
        </Link>
        <button type="submit" className="onboarding-primary" disabled={isPending}>
          {isPending ? t('onboarding.saving') : t('onboarding.saveContinue')}<span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  )
}
