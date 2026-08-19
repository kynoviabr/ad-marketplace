/**
 * Centralized factual and compliant SEO title & description templates.
 * All claims reflect real verified platform capabilities (18+ age verification & photo moderation).
 */
export const SEO_TEMPLATES = {
  city: {
    title: (cityName: string, brandName: string) => `Acompanhantes em ${cityName} - SP | ${brandName}`,
    description: (cityName: string) =>
      `Encontre acompanhantes verificadas (18+) em ${cityName}. Perfis com fotos auditadas e contato direto via WhatsApp.`,
  },
  location: {
    title: (locationName: string, cityName: string, brandName: string) =>
      `Acompanhantes em ${locationName}, ${cityName} | ${brandName}`,
    description: (locationName: string, cityName: string) =>
      `Anúncios de acompanhantes verificadas 18+ que atendem em ${locationName}, ${cityName}. Contato direto via WhatsApp.`,
  },
  profileContract: {
    title: (stageName: string, cityName: string, brandName: string) =>
      `${stageName} em ${cityName} | ${brandName}`,
    description: (stageName: string, headline?: string | null) =>
      headline || `Perfil de ${stageName} verificado (18+). Fotos auditadas e contato direto via WhatsApp.`,
  },
}
