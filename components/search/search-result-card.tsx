import React from 'react'
import type { SearchResultDTO } from '@/modules/search/types'
import { ImpressionTracker } from '@/components/analytics/impression-tracker'
import { WhatsAppCTA } from '@/components/search/whatsapp-cta'

interface SearchResultCardProps {
  profile: SearchResultDTO
  citySlug?: string
  locationSlug?: string | null
  resultPage?: number
  resultPosition?: number
}

export function SearchResultCard({
  profile,
  citySlug,
  locationSlug,
  resultPage = 1,
  resultPosition = 0,
}: SearchResultCardProps) {
  const whatsappUrl = profile.contact.whatsapp
    ? `https://wa.me/${profile.contact.whatsapp.replace(/\D/g, '')}?text=Ol%C3%A1%2C%20vi%20seu%20perfil%20no%20AD-Marketplace.`
    : null

  const resolvedCitySlug = citySlug || profile.primaryLocation?.slug || 'sao-paulo'

  const cardContent = (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between h-full">
      {/* Media Placeholder Area */}
      <div className="relative aspect-[3/4] bg-slate-100 flex flex-col items-center justify-center p-4 text-center border-b border-gray-100">
        <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-2xl font-bold mb-2">
          {profile.stageName.slice(0, 1)}
        </div>
        <span className="text-xs text-slate-500 font-medium">Fotos Verificadas</span>
        <span className="text-[10px] text-slate-400 mt-0.5">Em breve (FASE 05)</span>

        {/* Sponsored Indicator Badge */}
        {profile.isSponsored && (
          <div className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <span>★</span> Patrocinado
          </div>
        )}

        {/* Verified Badge */}
        {profile.isVerified && (
          <div className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <span>✓</span> Verificada 18+
          </div>
        )}

        {/* Primary Location Overlay */}
        {profile.primaryLocation && (
          <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded backdrop-blur-sm">
            📍 {profile.primaryLocation.name}
          </div>
        )}
      </div>

      {/* Info Content Area */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-base hover:text-blue-600 transition-colors">
              {profile.stageName}
            </h3>
            {profile.publicAge && (
              <span className="text-xs text-gray-500 font-medium">
                {profile.publicAge} anos
              </span>
            )}
          </div>

          {profile.headline && (
            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
              {profile.headline}
            </p>
          )}
        </div>

        {/* Attributes Chips */}
        <div className="flex flex-wrap gap-1 text-[11px] text-gray-600">
          {profile.attributes.heightCm && (
            <span className="bg-gray-100 px-2 py-0.5 rounded">
              {profile.attributes.heightCm} cm
            </span>
          )}
          {profile.attributes.hairColor && (
            <span className="bg-gray-100 px-2 py-0.5 rounded">
              {profile.attributes.hairColor}
            </span>
          )}
          {profile.attributes.bodyType && (
            <span className="bg-gray-100 px-2 py-0.5 rounded">
              {profile.attributes.bodyType}
            </span>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t flex items-center gap-2">
          {whatsappUrl ? (
            <WhatsAppCTA
              whatsappUrl={whatsappUrl}
              analyticsPayload={{
                profileSlug: profile.slug,
                citySlug: resolvedCitySlug,
                locationSlug: locationSlug || profile.primaryLocation?.slug || null,
                placementType: profile.placementType,
                resultPage,
                resultPosition,
              }}
            />
          ) : (
            <span className="w-full text-center py-2 px-3 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg">
              Contato indisponível
            </span>
          )}
        </div>
      </div>
    </div>
  )

  if (citySlug) {
    return (
      <ImpressionTracker
        profileSlug={profile.slug}
        citySlug={citySlug}
        locationSlug={locationSlug}
        placementType={profile.placementType}
        resultPage={resultPage}
        resultPosition={resultPosition}
      >
        {cardContent}
      </ImpressionTracker>
    )
  }

  return cardContent
}
