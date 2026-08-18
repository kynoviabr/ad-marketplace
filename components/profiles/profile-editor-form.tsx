'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ProfessionalProfile } from '@/modules/profiles/types'
import type { UpdateProfileInput } from '@/modules/profiles/schemas'
import { createProfileDraftAction, updateProfileDraftAction } from '@/modules/profiles/actions'
import { evaluateProfileCompleteness } from '@/modules/profiles/completeness'
import { ProfilePreviewCard } from './profile-preview-card'
import type { Location, ProfileLocation } from '@/modules/locations/types'
import { LocationSelector } from '@/components/locations/location-selector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProfileEditorFormProps {
  initialProfile: ProfessionalProfile | null
  availableLocations?: Location[]
  initialSelectedLocations?: ProfileLocation[]
}

export function ProfileEditorForm({
  initialProfile,
  availableLocations = [],
  initialSelectedLocations = [],
}: ProfileEditorFormProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfessionalProfile | null>(initialProfile)
  const [stageNameInput, setStageNameInput] = useState(initialProfile?.stage_name || '')
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  // Form State initialized from profile or defaults
  const [formData, setFormData] = useState<UpdateProfileInput>({
    stage_name: initialProfile?.stage_name || '',
    headline: initialProfile?.headline || '',
    bio: initialProfile?.bio || '',
    public_age: initialProfile?.public_age || undefined,
    height_cm: initialProfile?.height_cm || undefined,
    weight_kg: initialProfile?.weight_kg || undefined,
    bust_cm: initialProfile?.bust_cm || undefined,
    waist_cm: initialProfile?.waist_cm || undefined,
    hips_cm: initialProfile?.hips_cm || undefined,
    eye_color: initialProfile?.eye_color || undefined,
    hair_color: initialProfile?.hair_color || undefined,
    hair_length: initialProfile?.hair_length || undefined,
    body_type: initialProfile?.body_type || undefined,
    has_tattoos: initialProfile?.has_tattoos ?? false,
    has_piercings: initialProfile?.has_piercings ?? false,
    languages: initialProfile?.languages || ['Português'],
    whatsapp_phone: initialProfile?.whatsapp_phone || '',
    direct_phone: initialProfile?.direct_phone || '',
    telegram_username: initialProfile?.telegram_username || '',
    show_age: initialProfile?.show_age ?? false,
    show_height: initialProfile?.show_height ?? true,
    show_weight: initialProfile?.show_weight ?? false,
    show_measurements: initialProfile?.show_measurements ?? false,
    show_whatsapp: initialProfile?.show_whatsapp ?? true,
    show_phone: initialProfile?.show_phone ?? false,
    show_telegram: initialProfile?.show_telegram ?? false,
  })

  const completeness = evaluateProfileCompleteness(profile ? { ...profile, ...formData } : null)

  const handleCreateDraft = () => {
    setStatusMessage(null)
    setFieldErrors({})
    startTransition(async () => {
      const result = await createProfileDraftAction({ stage_name: stageNameInput })
      if (result.success) {
        setProfile(result.data)
        setFormData((prev) => ({ ...prev, stage_name: result.data.stage_name }))
        setStatusMessage({ type: 'success', text: 'Rascunho inicial criado com sucesso!' })
        router.refresh()
      } else {
        setStatusMessage({ type: 'error', text: result.error })
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      }
    })
  }

  const handleSaveProfile = () => {
    setStatusMessage(null)
    setFieldErrors({})
    startTransition(async () => {
      const result = await updateProfileDraftAction(formData)
      if (result.success) {
        setProfile(result.data)
        const isNowReady = result.data.status === 'READY_FOR_REVIEW'
        setStatusMessage({
          type: 'success',
          text: isNowReady
            ? '✓ Perfil completo salvo com sucesso (Pronto para as próximas fases)!'
            : 'Rascunho atualizado com sucesso!',
        })
        router.refresh()
      } else {
        setStatusMessage({ type: 'error', text: result.error })
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      }
    })
  }

  // Initial Creation View if Profile is NOT yet started
  if (!profile) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Iniciar Perfil Profissional</h2>
          <p className="text-sm text-gray-500 mt-1">
            Escolha seu nome artístico de exibição pública. Você poderá preencher os detalhes em seguida.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-4 rounded-lg text-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="stage_name">Nome Artístico / Exibição</Label>
            <Input
              id="stage_name"
              placeholder="Ex: Juliana Castro"
              value={stageNameInput}
              onChange={(e) => setStageNameInput(e.target.value)}
              disabled={isPending}
              className="mt-1"
            />
            {fieldErrors.stage_name && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.stage_name[0]}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Este nome será público e não precisa ser seu nome de registro civil.
            </p>
          </div>

          <Button
            onClick={handleCreateDraft}
            disabled={isPending || stageNameInput.trim().length < 2}
            className="w-full"
          >
            {isPending ? 'Criando Rascunho...' : 'Criar Perfil'}
          </Button>
        </div>
      </div>
    )
  }

  // Full Editor View
  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8 bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Editar Perfil Profissional</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Slug: <span className="font-mono text-gray-700">{profile.slug}</span>
            </p>
          </div>
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full ${
              profile.status === 'READY_FOR_REVIEW'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {profile.status === 'READY_FOR_REVIEW' ? 'Dados Completos' : 'Rascunho (DRAFT)'}
          </span>
        </div>

        {statusMessage && (
          <div
            className={`p-4 rounded-lg text-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Section 1: Identidade */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">1. Identidade</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stage_name">Nome Artístico *</Label>
              <Input
                id="stage_name"
                value={formData.stage_name}
                onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
                className="mt-1"
              />
              {fieldErrors.stage_name && (
                <p className="text-xs text-rose-600 mt-1">{fieldErrors.stage_name[0]}</p>
              )}
            </div>

            <div>
              <Label htmlFor="public_age">Idade Pública (Opcional)</Label>
              <Input
                id="public_age"
                type="number"
                placeholder="Ex: 24"
                value={formData.public_age || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    public_age: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="mt-1"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="show_age"
                  checked={formData.show_age}
                  onChange={(e) => setFormData({ ...formData, show_age: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <label htmlFor="show_age" className="text-xs text-gray-600">
                  Exibir idade publicamente
                </label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="headline">Título / Slogan *</Label>
            <Input
              id="headline"
              placeholder="Ex: Modelo fotográfica e atendimento exclusivo"
              value={formData.headline || ''}
              onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              className="mt-1"
            />
            {fieldErrors.headline && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.headline[0]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="bio">Biografia / Descrição *</Label>
            <textarea
              id="bio"
              rows={4}
              placeholder="Conte sobre sua personalidade, preferências e atendimento (mínimo 20 caracteres)..."
              value={formData.bio || ''}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full mt-1 p-3 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {fieldErrors.bio && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.bio[0]}</p>
            )}
          </div>
        </div>

        {/* Section 2: Características Físicas */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">2. Características & Medidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="height_cm">Altura (cm)</Label>
              <Input
                id="height_cm"
                type="number"
                placeholder="Ex: 170"
                value={formData.height_cm || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    height_cm: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="mt-1"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="show_height"
                  checked={formData.show_height}
                  onChange={(e) => setFormData({ ...formData, show_height: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <label htmlFor="show_height" className="text-xs text-gray-600">
                  Exibir altura
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="weight_kg">Peso (kg)</Label>
              <Input
                id="weight_kg"
                type="number"
                placeholder="Ex: 60"
                value={formData.weight_kg || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    weight_kg: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="mt-1"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="show_weight"
                  checked={formData.show_weight}
                  onChange={(e) => setFormData({ ...formData, show_weight: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <label htmlFor="show_weight" className="text-xs text-gray-600">
                  Exibir peso
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="bust_cm">Busto (cm)</Label>
              <Input
                id="bust_cm"
                type="number"
                placeholder="Ex: 90"
                value={formData.bust_cm || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bust_cm: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="waist_cm">Cintura (cm)</Label>
              <Input
                id="waist_cm"
                type="number"
                placeholder="Ex: 65"
                value={formData.waist_cm || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    waist_cm: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="hips_cm">Quadril (cm)</Label>
              <Input
                id="hips_cm"
                type="number"
                placeholder="Ex: 95"
                value={formData.hips_cm || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hips_cm: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show_measurements"
              checked={formData.show_measurements}
              onChange={(e) => setFormData({ ...formData, show_measurements: e.target.checked })}
              className="rounded text-blue-600"
            />
            <label htmlFor="show_measurements" className="text-xs text-gray-600">
              Exibir medidas corporais (busto, cintura, quadril)
            </label>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div>
              <Label htmlFor="eye_color">Olhos</Label>
              <select
                id="eye_color"
                value={formData.eye_color || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    eye_color: (e.target.value as UpdateProfileInput['eye_color']) || undefined,
                  })
                }
                className="w-full mt-1 p-2 text-sm border border-gray-300 rounded-lg"
              >
                <option value="">Selecione</option>
                <option value="BLACK">Pretos</option>
                <option value="BROWN">Castanhos</option>
                <option value="GREEN">Verdes</option>
                <option value="BLUE">Azuis</option>
                <option value="HAZEL">Mel/Avelã</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <div>
              <Label htmlFor="hair_color">Cabelo</Label>
              <select
                id="hair_color"
                value={formData.hair_color || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hair_color: (e.target.value as UpdateProfileInput['hair_color']) || undefined,
                  })
                }
                className="w-full mt-1 p-2 text-sm border border-gray-300 rounded-lg"
              >
                <option value="">Selecione</option>
                <option value="BLACK">Preto</option>
                <option value="BRUNETTE">Castanho</option>
                <option value="BLONDE">Loiro</option>
                <option value="REDHEAD">Ruivo</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <div>
              <Label htmlFor="body_type">Corpo</Label>
              <select
                id="body_type"
                value={formData.body_type || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    body_type: (e.target.value as UpdateProfileInput['body_type']) || undefined,
                  })
                }
                className="w-full mt-1 p-2 text-sm border border-gray-300 rounded-lg"
              >
                <option value="">Selecione</option>
                <option value="SLIM">Magra</option>
                <option value="ATHLETIC">Atlética</option>
                <option value="CURVY">Curvilínea</option>
                <option value="AVERAGE">Convencional</option>
                <option value="PLUS_SIZE">Plus Size</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <div>
              <Label htmlFor="hair_length">Comprimento</Label>
              <select
                id="hair_length"
                value={formData.hair_length || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hair_length: (e.target.value as UpdateProfileInput['hair_length']) || undefined,
                  })
                }
                className="w-full mt-1 p-2 text-sm border border-gray-300 rounded-lg"
              >
                <option value="">Selecione</option>
                <option value="SHORT">Curto</option>
                <option value="MEDIUM">Médio</option>
                <option value="LONG">Longo</option>
                <option value="VERY_LONG">Muito Longo</option>
                <option value="BALD">Raspado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Contatos */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">3. Contatos Profissionais</h3>
          
          <div>
            <Label htmlFor="whatsapp_phone">WhatsApp Profissional *</Label>
            <Input
              id="whatsapp_phone"
              placeholder="+5511999998888"
              value={formData.whatsapp_phone || ''}
              onChange={(e) => setFormData({ ...formData, whatsapp_phone: e.target.value })}
              className="mt-1"
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="show_whatsapp"
                checked={formData.show_whatsapp}
                onChange={(e) => setFormData({ ...formData, show_whatsapp: e.target.checked })}
                className="rounded text-blue-600"
              />
              <label htmlFor="show_whatsapp" className="text-xs text-gray-600">
                Exibir WhatsApp no perfil público
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="direct_phone">Telefone Direto (Opcional)</Label>
            <Input
              id="direct_phone"
              placeholder="+5511988887777"
              value={formData.direct_phone || ''}
              onChange={(e) => setFormData({ ...formData, direct_phone: e.target.value })}
              className="mt-1"
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="show_phone"
                checked={formData.show_phone}
                onChange={(e) => setFormData({ ...formData, show_phone: e.target.checked })}
                className="rounded text-blue-600"
              />
              <label htmlFor="show_phone" className="text-xs text-gray-600">
                Exibir telefone
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="telegram_username">Telegram (Opcional)</Label>
            <Input
              id="telegram_username"
              placeholder="username (sem @)"
              value={formData.telegram_username || ''}
              onChange={(e) => setFormData({ ...formData, telegram_username: e.target.value })}
              className="mt-1"
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="show_telegram"
                checked={formData.show_telegram}
                onChange={(e) => setFormData({ ...formData, show_telegram: e.target.checked })}
                className="rounded text-blue-600"
              />
              <label htmlFor="show_telegram" className="text-xs text-gray-600">
                Exibir Telegram
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Localização de Atendimento */}
        {availableLocations.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold text-gray-800 pb-2">4. Regiões de Atendimento</h3>
            <LocationSelector
              availableLocations={availableLocations}
              initialSelectedLocations={initialSelectedLocations}
              onSaved={() => router.refresh()}
            />
          </div>
        )}

        <div className="pt-4 border-t flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {completeness.isComplete ? (
              <span className="text-emerald-600 font-semibold">✓ Todos os campos obrigatórios preenchidos</span>
            ) : (
              <span className="text-amber-600">
                Pendências para conclusão: {completeness.missingFields.join(', ')}
              </span>
            )}
          </div>
          <Button onClick={handleSaveProfile} disabled={isPending}>
            {isPending ? 'Salvando...' : completeness.isComplete ? 'Concluir Perfil' : 'Salvar Rascunho'}
          </Button>
        </div>
      </div>

      {/* Right Column: Live Profile Preview */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Pré-visualização do Perfil</h3>
        <p className="text-xs text-gray-500">
          Esta é a visualização aproximada de como seu perfil será apresentado aos clientes, respeitando suas configurações de visibilidade.
        </p>
        <ProfilePreviewCard data={formData} />
      </div>
    </div>
  )
}
