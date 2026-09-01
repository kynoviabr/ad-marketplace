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
