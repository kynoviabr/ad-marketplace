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
}

function ProfileSelect({ id, label, value, options, error }: { id: string; label: string; value: string | null; options: Array<[string, string]>; error?: string }) {
  return (
    <div className="onboarding-field">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} name={id} defaultValue={value ?? ''} className={`onboarding-select ${error ? 'input--error' : ''}`} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined}>
        <option value="">Prefiro não informar</option>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
      {error && <p id={`${id}-error`} className="input-error" role="alert">{error}</p>}
    </div>
  )
}

export function PublicPresentationForm({ initial }: PublicPresentationFormProps) {
  const [state, formAction, isPending] = useActionState(savePublicPresentationProfileAction, initialState)
  const [bioLength, setBioLength] = useState(initial.bio.length)
  const fieldErrors = !state.success ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="onboarding-form onboarding-profile-form" noValidate>
      {!state.success && state.error && !fieldErrors && <FormMessage type="error" message={state.error} />}

      <div className="onboarding-field">
        <Label htmlFor="headline" required>Título do perfil</Label>
        <Input id="headline" name="headline" defaultValue={initial.headline} maxLength={120} placeholder="Uma frase que apresenta você" error={fieldErrors?.headline?.[0]} required />
        <p className="field-note">Uma frase curta exibida junto ao seu nome público.</p>
      </div>

      <div className="onboarding-field">
        <Label htmlFor="bio" required>Conte um pouco sobre você</Label>
        <textarea id="bio" name="bio" defaultValue={initial.bio} minLength={20} maxLength={2000} rows={7} className={`onboarding-textarea ${fieldErrors?.bio ? 'input--error' : ''}`} aria-invalid={fieldErrors?.bio ? 'true' : undefined} aria-describedby={`bio-note bio-counter${fieldErrors?.bio ? ' bio-error' : ''}`} onChange={(event) => setBioLength(event.currentTarget.value.length)} required />
        <div className="field-note-row"><p id="bio-note" className="field-note">Fale com naturalidade sobre sua personalidade e seu jeito de receber.</p><span id="bio-counter" aria-live="polite">{bioLength}/2000</span></div>
        {fieldErrors?.bio?.[0] && <p id="bio-error" className="input-error" role="alert">{fieldErrors.bio[0]}</p>}
      </div>

      <fieldset className="onboarding-fieldset">
        <legend>Informações públicas</legend>
        <div className="onboarding-field-grid onboarding-field-grid--three">
          <div className="onboarding-field">
            <Label htmlFor="public_age">Idade pública</Label>
            <Input id="public_age" name="public_age" type="number" inputMode="numeric" min={18} max={99} defaultValue={initial.publicAge ?? ''} error={fieldErrors?.public_age?.[0]} />
            <label className="onboarding-privacy-toggle"><input type="checkbox" name="show_age" defaultChecked={initial.showAge} /> Exibir idade</label>
          </div>
          <div className="onboarding-field">
            <Label htmlFor="height_cm">Altura</Label>
            <div className="measurement-input"><Input id="height_cm" name="height_cm" type="number" inputMode="numeric" min={100} max={250} defaultValue={initial.heightCm ?? ''} error={fieldErrors?.height_cm?.[0]} /><span>cm</span></div>
            <label className="onboarding-privacy-toggle"><input type="checkbox" name="show_height" defaultChecked={initial.showHeight} /> Exibir altura</label>
          </div>
          <div className="onboarding-field">
            <Label htmlFor="weight_kg">Peso</Label>
            <div className="measurement-input"><Input id="weight_kg" name="weight_kg" type="number" inputMode="numeric" min={30} max={300} defaultValue={initial.weightKg ?? ''} error={fieldErrors?.weight_kg?.[0]} /><span>kg</span></div>
            <label className="onboarding-privacy-toggle"><input type="checkbox" name="show_weight" defaultChecked={initial.showWeight} /> Exibir peso</label>
          </div>
        </div>
        <p className="field-note">Campos opcionais. Você decide se idade, altura e peso aparecem publicamente.</p>
      </fieldset>

      <fieldset className="onboarding-fieldset">
        <legend>Características</legend>
        <div className="onboarding-field-grid">
          <ProfileSelect id="hair_color" label="Cor do cabelo" value={initial.hairColor} options={hairColors} error={fieldErrors?.hair_color?.[0]} />
          <ProfileSelect id="hair_length" label="Comprimento do cabelo" value={initial.hairLength} options={hairLengths} error={fieldErrors?.hair_length?.[0]} />
          <ProfileSelect id="eye_color" label="Cor dos olhos" value={initial.eyeColor} options={eyeColors} error={fieldErrors?.eye_color?.[0]} />
          <ProfileSelect id="body_type" label="Tipo físico" value={initial.bodyType} options={bodyTypes} error={fieldErrors?.body_type?.[0]} />
        </div>
      </fieldset>

      <button type="submit" className="onboarding-primary" disabled={isPending}>
        {isPending ? 'Salvando…' : 'Salvar e continuar'}<span aria-hidden="true">→</span>
      </button>
    </form>
  )
}
