import { requireVerifiedAdvertiser } from '@/modules/verification/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getLocationsByCitySlug, getProfileLocations } from '@/modules/locations/dal'
import { ProfileEditorForm } from '@/components/profiles/profile-editor-form'

export const metadata = {
  title: 'Perfil Profissional | AD-Marketplace',
}

export default async function ProfileOnboardingPage() {
  // Enforces Active Account + Verified Adult KYC
  const { account } = await requireVerifiedAdvertiser()
  const [profile, availableLocations] = await Promise.all([
    getProfileByAccountUserId(account.id),
    getLocationsByCitySlug('sao-paulo'),
  ])

  const initialSelectedLocations = profile
    ? await getProfileLocations(profile.id)
    : []

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8">
      <ProfileEditorForm
        initialProfile={profile}
        availableLocations={availableLocations}
        initialSelectedLocations={initialSelectedLocations}
      />
    </div>
  )
}
