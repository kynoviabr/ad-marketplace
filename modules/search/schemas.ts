import { z } from 'zod'
import {
  EyeColorEnum,
  HairColorEnum,
  HairLengthEnum,
  BodyTypeEnum,
} from '@/modules/profiles/schemas'

import { RESERVED_TOP_LEVEL_SLUGS, isReservedSlug } from '@/modules/seo/constants'
import { OFFERING_GROUPS, OFFERING_OPTIONS, type OfferingGroup } from '@/modules/offerings/types'

// Alias for backwards compatibility
export const RESERVED_CITY_SLUGS = RESERVED_TOP_LEVEL_SLUGS
export { isReservedSlug }

const offeringCodesByGroup = Object.fromEntries(OFFERING_GROUPS.map((group) => [group, OFFERING_OPTIONS.filter((option) => option.group === group).map(({ code }) => code)])) as Record<OfferingGroup, [string, ...string[]]>
const multiOffering = (group: OfferingGroup) => {
  const option = z.enum(offeringCodesByGroup[group])
  return z.union([option, z.array(option)]).transform((value) => [...new Set(Array.isArray(value) ? value : [value])]).optional()
}

/**
 * Parses and validates incoming search URL query parameters.
 */
export const SearchQuerySchema = z.object({
  bairro: z.string().trim().optional(),
  idade_min: z.coerce.number().int().min(18).max(99).optional(),
  idade_max: z.coerce.number().int().min(18).max(99).optional(),
  altura_min: z.coerce.number().int().min(100).max(250).optional(),
  altura_max: z.coerce.number().int().min(100).max(250).optional(),
  peso_min: z.coerce.number().int().min(30).max(300).optional(),
  peso_max: z.coerce.number().int().min(30).max(300).optional(),
  olhos: z
    .union([EyeColorEnum, z.array(EyeColorEnum)])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  cabelo: z
    .union([HairColorEnum, z.array(HairColorEnum)])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  comprimento: z
    .union([HairLengthEnum, z.array(HairLengthEnum)])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  corpo: z
    .union([BodyTypeEnum, z.array(BodyTypeEnum)])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  tatuagens: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  piercings: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  idiomas: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  atende: multiOffering('AUDIENCE'),
  servicos: multiOffering('SERVICES'),
  local: multiOffering('LOCATIONS'),
  disponibilidade: multiOffering('AVAILABILITY'),
  ordem: z.enum(['recommended', 'newest']).default('recommended'),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(20),
})

export type SearchQueryParams = z.infer<typeof SearchQuerySchema>
