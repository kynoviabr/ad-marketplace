import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const iconsDir = path.join(root, 'public/icons')

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

/**
 * Generates an SVG for Velvet PWA icons.
 * Palette:
 * - Background: #3B203F (Velvet deep brand aubergine)
 * - Wordmark/Monogram: #FCFAF5 (Velvet cream surface)
 * - Signature dot: #9AA06A (Velvet olive accent)
 */
function createIconSvg(size, isMaskable = false) {
  // For maskable, content must fit comfortably within the 80% safe circle
  const scale = isMaskable ? 0.75 : 0.85
  const fontSize = Math.round(size * 0.52 * scale)
  const textY = Math.round(size * 0.5 + fontSize * 0.32)
  const textX = Math.round(size * 0.5)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#3B203F" />
    <g fill="#FCFAF5" font-family="Georgia, 'Times New Roman', serif" font-weight="500" text-anchor="middle">
      <text x="${textX}" y="${textY}" font-size="${fontSize}" letter-spacing="-0.04em">v<tspan fill="#9AA06A">.</tspan></text>
    </g>
  </svg>`
}

async function main() {
  const assets = [
    { name: 'icon-192x192.png', size: 192, maskable: false },
    { name: 'icon-512x512.png', size: 512, maskable: false },
    { name: 'icon-maskable-192x192.png', size: 192, maskable: true },
    { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
  ]

  for (const asset of assets) {
    const svg = Buffer.from(createIconSvg(asset.size, asset.maskable))
    const outPath = path.join(iconsDir, asset.name)
    await sharp(svg).png().toFile(outPath)
    const stat = fs.statSync(outPath)
    console.log(`Generated ${asset.name} (${asset.size}x${asset.size}, ${stat.size} bytes)`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
