export interface ProfileInformationFact {
  label: string
  value: string
}

export interface ProfileInformationListItem {
  id: string
  label: string
  annotation?: string
}

interface ProfileInformationProps {
  title: string
  facts: ProfileInformationFact[]
  serviceAreas: ProfileInformationListItem[]
  serviceAreasLabel: string
}

/**
 * Presentation-only grouping for structured public profile data.
 * Future capabilities should arrive as explicit domain fields and groups rather
 * than being inferred from biography prose.
 */
export function ProfileInformation({
  title,
  facts,
  serviceAreas,
  serviceAreasLabel,
}: ProfileInformationProps) {
  if (!facts.length && !serviceAreas.length) return null

  return (
    <section className="profile-information-system" aria-labelledby="profile-information-title">
      <h2 id="profile-information-title" className="sr-only">{title}</h2>

      {facts.length ? (
        <dl className="profile-information profile-information-facts">
          {facts.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {serviceAreas.length ? (
        <div className="profile-information-list-group">
          <h3>{serviceAreasLabel}</h3>
          <ul>
            {serviceAreas.map(({ id, label, annotation }) => (
              <li key={id}>
                <span>{label}</span>
                {annotation ? <b>{annotation}</b> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
