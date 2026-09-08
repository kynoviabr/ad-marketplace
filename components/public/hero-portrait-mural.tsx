import React from 'react'
import Image from 'next/image'

export interface MuralImageItem {
  id: string
  src: string
  aspectRatio: string
  objectPosition?: string
}

export const HERO_MURAL_COLUMNS: MuralImageItem[][] = [
  // Column 1 (8 synthetic adult fashion portraits)
  [
    { id: 'mural-01', src: '/images/hero-mural/mural-01.jpg', aspectRatio: '3/4', objectPosition: '50% 20%' },
    { id: 'mural-02', src: '/images/hero-mural/mural-02.jpg', aspectRatio: '4/5', objectPosition: '50% 25%' },
    { id: 'mural-03', src: '/images/hero-mural/mural-03.jpg', aspectRatio: '2/3', objectPosition: '50% 20%' },
    { id: 'mural-04', src: '/images/hero-mural/mural-04.jpg', aspectRatio: '3/4', objectPosition: '50% 22%' },
    { id: 'mural-05', src: '/images/hero-mural/mural-05.jpg', aspectRatio: '4/5', objectPosition: '50% 18%' },
    { id: 'mural-06', src: '/images/hero-mural/mural-06.jpg', aspectRatio: '3/4', objectPosition: '50% 25%' },
    { id: 'mural-07', src: '/images/hero-mural/mural-07.jpg', aspectRatio: '2/3', objectPosition: '50% 20%' },
    { id: 'mural-08', src: '/images/hero-mural/mural-08.jpg', aspectRatio: '3/4', objectPosition: '50% 22%' },
  ],
  // Column 2 (8 synthetic adult fashion portraits)
  [
    { id: 'mural-09', src: '/images/hero-mural/mural-09.jpg', aspectRatio: '4/5', objectPosition: '50% 20%' },
    { id: 'mural-10', src: '/images/hero-mural/mural-10.jpg', aspectRatio: '3/4', objectPosition: '50% 22%' },
    { id: 'mural-11', src: '/images/hero-mural/mural-11.jpg', aspectRatio: '2/3', objectPosition: '50% 25%' },
    { id: 'mural-12', src: '/images/hero-mural/mural-12.jpg', aspectRatio: '4/5', objectPosition: '50% 20%' },
    { id: 'mural-13', src: '/images/hero-mural/mural-13.jpg', aspectRatio: '3/4', objectPosition: '50% 18%' },
    { id: 'mural-14', src: '/images/hero-mural/mural-14.jpg', aspectRatio: '2/3', objectPosition: '50% 22%' },
    { id: 'mural-15', src: '/images/hero-mural/mural-15.jpg', aspectRatio: '4/5', objectPosition: '50% 25%' },
    { id: 'mural-16', src: '/images/hero-mural/mural-16.jpg', aspectRatio: '3/4', objectPosition: '50% 20%' },
  ],
  // Column 3 (8 synthetic adult fashion portraits)
  [
    { id: 'mural-17', src: '/images/hero-mural/mural-17.jpg', aspectRatio: '2/3', objectPosition: '50% 25%' },
    { id: 'mural-18', src: '/images/hero-mural/mural-18.jpg', aspectRatio: '3/4', objectPosition: '50% 20%' },
    { id: 'mural-19', src: '/images/hero-mural/mural-19.jpg', aspectRatio: '4/5', objectPosition: '50% 22%' },
    { id: 'mural-20', src: '/images/hero-mural/mural-20.jpg', aspectRatio: '3/4', objectPosition: '50% 18%' },
    { id: 'mural-21', src: '/images/hero-mural/mural-21.jpg', aspectRatio: '2/3', objectPosition: '50% 24%' },
    { id: 'mural-22', src: '/images/hero-mural/mural-22.jpg', aspectRatio: '4/5', objectPosition: '50% 20%' },
    { id: 'mural-23', src: '/images/hero-mural/mural-23.jpg', aspectRatio: '3/4', objectPosition: '50% 22%' },
    { id: 'mural-24', src: '/images/hero-mural/mural-24.jpg', aspectRatio: '2/3', objectPosition: '50% 25%' },
  ],
  // Column 4 (8 synthetic adult fashion portraits)
  [
    { id: 'mural-25', src: '/images/hero-mural/mural-25.jpg', aspectRatio: '3/4', objectPosition: '50% 20%' },
    { id: 'mural-26', src: '/images/hero-mural/mural-26.jpg', aspectRatio: '4/5', objectPosition: '50% 22%' },
    { id: 'mural-27', src: '/images/hero-mural/mural-27.jpg', aspectRatio: '2/3', objectPosition: '50% 18%' },
    { id: 'mural-28', src: '/images/hero-mural/mural-28.jpg', aspectRatio: '3/4', objectPosition: '50% 25%' },
    { id: 'mural-29', src: '/images/hero-mural/mural-29.jpg', aspectRatio: '4/5', objectPosition: '50% 20%' },
    { id: 'mural-30', src: '/images/hero-mural/mural-30.jpg', aspectRatio: '2/3', objectPosition: '50% 22%' },
    { id: 'mural-31', src: '/images/hero-mural/mural-31.jpg', aspectRatio: '3/4', objectPosition: '50% 20%' },
    { id: 'mural-32', src: '/images/hero-mural/mural-32.jpg', aspectRatio: '4/5', objectPosition: '50% 24%' },
  ],
  // Column 5 (8 synthetic adult fashion portraits)
  [
    { id: 'mural-33', src: '/images/hero-mural/mural-33.jpg', aspectRatio: '4/5', objectPosition: '50% 20%' },
    { id: 'mural-34', src: '/images/hero-mural/mural-34.jpg', aspectRatio: '2/3', objectPosition: '50% 25%' },
    { id: 'mural-35', src: '/images/hero-mural/mural-35.jpg', aspectRatio: '3/4', objectPosition: '50% 20%' },
    { id: 'mural-36', src: '/images/hero-mural/mural-36.jpg', aspectRatio: '4/5', objectPosition: '50% 22%' },
    { id: 'mural-37', src: '/images/hero-mural/mural-37.jpg', aspectRatio: '2/3', objectPosition: '50% 18%' },
    { id: 'mural-38', src: '/images/hero-mural/mural-38.jpg', aspectRatio: '3/4', objectPosition: '50% 24%' },
    { id: 'mural-39', src: '/images/hero-mural/mural-39.jpg', aspectRatio: '4/5', objectPosition: '50% 20%' },
    { id: 'mural-40', src: '/images/hero-mural/mural-40.jpg', aspectRatio: '2/3', objectPosition: '50% 22%' },
  ],
]

export const TOTAL_HERO_MURAL_ASSETS = HERO_MURAL_COLUMNS.reduce(
  (sum, col) => sum + col.length,
  0
)

export function HeroPortraitMural() {
  return (
    <div
      className="velvet-hero-mural"
      aria-hidden="true"
      role="presentation"
    >
      <div className="velvet-mural-columns">
        {HERO_MURAL_COLUMNS.map((col, colIdx) => (
          <div
            key={`col-${colIdx}`}
            className={`velvet-mural-column velvet-mural-column--${colIdx + 1}`}
          >
            <div className="velvet-mural-track">
              {/* Primary Sequence */}
              <div className="velvet-mural-group">
                {col.map((item, itemIdx) => (
                  <div
                    key={item.id}
                    className="velvet-mural-tile"
                    style={{ aspectRatio: item.aspectRatio }}
                  >
                    <Image
                      src={item.src}
                      alt=""
                      fill
                      sizes="(max-width: 700px) 140px, (max-width: 1200px) 160px, 190px"
                      priority={colIdx < 2 && itemIdx < 2}
                      className="velvet-mural-img"
                      style={{ objectPosition: item.objectPosition || '50% 20%' }}
                    />
                  </div>
                ))}
              </div>

              {/* Loop Duplicate Sequence */}
              <div
                className="velvet-mural-group velvet-mural-group--clone"
                aria-hidden="true"
              >
                {col.map((item) => (
                  <div
                    key={`${item.id}-clone`}
                    className="velvet-mural-tile"
                    style={{ aspectRatio: item.aspectRatio }}
                  >
                    <Image
                      src={item.src}
                      alt=""
                      fill
                      sizes="(max-width: 700px) 140px, (max-width: 1200px) 160px, 190px"
                      className="velvet-mural-img"
                      style={{ objectPosition: item.objectPosition || '50% 20%' }}
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
