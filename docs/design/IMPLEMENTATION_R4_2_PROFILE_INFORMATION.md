# R4.2 — Structured profile information presentation

`components/public/profile-information.tsx` is the presentation boundary for
compact public profile facts and list groups. It currently receives only data
already exposed by the canonical public DTO: visible characteristics and
canonical service areas.

Future capabilities—services offered, audience served, party availability and
travel availability—must be modeled as explicit structured domain data before
they are added to this component. The same structured source may later support
Search filters, profile editing and WhatsApp AI context. These capabilities
must not be inferred from biography prose.
