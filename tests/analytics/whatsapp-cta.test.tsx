import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { WhatsAppCTA } from '@/components/search/whatsapp-cta'

describe('FASE 09 — WhatsAppCTA Component & Conversion Trigger', () => {
  it('renders WhatsApp link with target=_blank, rel=noopener noreferrer, and valid href', () => {
    const markup = renderToStaticMarkup(
      <WhatsAppCTA
        whatsappUrl="https://wa.me/5511999999999"
        analyticsPayload={{
          profileSlug: 'juliana-moema',
          citySlug: 'sao-paulo',
          placementType: 'ORGANIC',
        }}
      />
    )

    expect(markup).toContain('href="https://wa.me/5511999999999"')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('rel="noopener noreferrer"')
    expect(markup).toContain('WhatsApp')
  })

  it('renders custom children when provided', () => {
    const markup = renderToStaticMarkup(
      <WhatsAppCTA
        whatsappUrl="https://wa.me/5511999999999"
        analyticsPayload={{
          profileSlug: 'juliana-moema',
          citySlug: 'sao-paulo',
          placementType: 'SPONSORED',
          resultPage: 1,
          resultPosition: 2,
        }}
      >
        <span>Chamar no Zap</span>
      </WhatsAppCTA>
    )

    expect(markup).toContain('Chamar no Zap')
  })
})
