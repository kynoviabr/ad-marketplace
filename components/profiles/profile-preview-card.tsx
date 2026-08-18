'use client'

import type { UpdateProfileInput } from '@/modules/profiles/schemas'

interface ProfilePreviewCardProps {
  data: Partial<UpdateProfileInput>
}

const EYE_LABELS: Record<string, string> = {
  BLACK: 'Pretos',
  BROWN: 'Castanhos',
  GREEN: 'Verdes',
  BLUE: 'Azuis',
  HAZEL: 'Mel/Avelã',
  OTHER: 'Outro',
}

const HAIR_COLOR_LABELS: Record<string, string> = {
  BLACK: 'Preto',
  BRUNETTE: 'Castanho',
  BLONDE: 'Loiro',
  REDHEAD: 'Ruivo',
  OTHER: 'Outro',
}

const BODY_TYPE_LABELS: Record<string, string> = {
  SLIM: 'Magra',
  ATHLETIC: 'Atlética',
  CURVY: 'Curvilínea',
  AVERAGE: 'Convencional',
  PLUS_SIZE: 'Plus Size',
  OTHER: 'Outro',
}

export function ProfilePreviewCard({ data }: ProfilePreviewCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">
            {data.stage_name || 'Nome Artístico'}
          </h3>
          {data.show_age && data.public_age && (
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full">
              {data.public_age} anos
            </span>
          )}
        </div>
        {data.headline && (
          <p className="text-sm font-medium text-gray-600 mt-1">{data.headline}</p>
        )}
      </div>

      {data.bio && (
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sobre</h4>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{data.bio}</p>
        </div>
      )}

      {/* Characteristics */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Características Públicas
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
          {data.show_height && data.height_cm && (
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500">Altura:</span> {data.height_cm} cm
            </div>
          )}
          {data.show_weight && data.weight_kg && (
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500">Peso:</span> {data.weight_kg} kg
            </div>
          )}
          {data.show_measurements && (data.bust_cm || data.waist_cm || data.hips_cm) && (
            <div className="bg-gray-50 p-2 rounded col-span-2">
              <span className="text-gray-500">Medidas:</span> {data.bust_cm || '-'} /{' '}
              {data.waist_cm || '-'} / {data.hips_cm || '-'} cm
            </div>
          )}
          {data.eye_color && (
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500">Olhos:</span> {EYE_LABELS[data.eye_color] || data.eye_color}
            </div>
          )}
          {data.hair_color && (
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500">Cabelo:</span> {HAIR_COLOR_LABELS[data.hair_color] || data.hair_color}
            </div>
          )}
          {data.body_type && (
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500">Corpo:</span> {BODY_TYPE_LABELS[data.body_type] || data.body_type}
            </div>
          )}
        </div>
      </div>

      {/* Contacts */}
      <div className="space-y-2 pt-2 border-t">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Canais de Contato
        </h4>
        <div className="space-y-1.5">
          {data.show_whatsapp && data.whatsapp_phone && (
            <div className="flex items-center text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg font-medium">
              <span>WhatsApp: {data.whatsapp_phone}</span>
            </div>
          )}
          {data.show_phone && data.direct_phone && (
            <div className="flex items-center text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg font-medium">
              <span>Telefone: {data.direct_phone}</span>
            </div>
          )}
          {data.show_telegram && data.telegram_username && (
            <div className="flex items-center text-xs text-sky-700 bg-sky-50 px-3 py-2 rounded-lg font-medium">
              <span>Telegram: @{data.telegram_username}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
