# R4.4 — Bounded public-profile media preview

The public profile renders a bounded preview, not the complete media archive.
Up to ten photo thumbnails are rendered for desktop and CSS limits the mobile
preview to four. The lightbox receives the complete unique photo collection,
so every item remains intentionally accessible without making profile height
grow linearly with media count.

Future video records should join the same bounded media model with explicit
structured types, poster thumbnails, a play affordance, no autoplay and lazy
player loading. No video data or playback is implemented in R4.4.

Future reviews belong after Media and before Trust/Safety. They must follow the
same bounded-preview rule: aggregate context, two or three review previews and
a localized View all action. Ratings, reviews and review schema are not part of
this release.

Services, audience and availability also remain structured domain data feeding
compact information rows; they must never be inferred from biography prose.

## R4.5 future-ready boundary

The permanent desktop media preview is capped at eight micro thumbnails and the
mobile preview at six. Reviews have a presentation-only boundary directly after
Media and before Trust/Safety. R4.6 renders a compact localized empty state when
there is no approved review source. Five outline stars communicate the unrated
state without displaying a numeric zero or implying a real rating.

Future reviews remain bounded to at most three inline previews whether the
collection contains 3, 37 or 500 records. Ratings, review persistence, schema,
JSON-LD and database work remain explicitly outside this release.

Before real reviews ship, product policy must define who may review, the star
range, whether comments are optional, uniqueness rules, moderation and
reporting, professional responses, reviewer privacy, abuse/spam protection,
edit/deletion history, and what—if anything—qualifies as a verified
experience. No verified-review claim is made by the presentation layer.

Future services, audiences and availability continue to fit the compact
structured information system above Media.
