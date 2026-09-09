import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { localizePathname } from "@/lib/i18n/routing"

const ROOT = join(__dirname, "../..")
const read = (relPath: string) => readFileSync(join(ROOT, relPath), "utf-8")

describe("Global Language Selector Consistency & Canonical Enforcement", () => {
  describe("1. Canonical Component Source of Truth", () => {
    const selectorFile = read("components/i18n/language-selector.tsx")

    it("defines LanguageSelector with popover as universal default variant", () => {
      expect(selectorFile).toContain("variant = 'popover'")
      expect(selectorFile).toContain("BrazilFlag")
      expect(selectorFile).toContain("UsaFlag")
      expect(selectorFile).toContain("ChevronDownIcon")
      expect(selectorFile).toContain("CheckIcon")
      expect(selectorFile).toContain("velvet-language-popover")
      expect(selectorFile).toContain("aria-haspopup=\"listbox\"")
    })

    it("does NOT contain obsolete raw inline PT / EN branch", () => {
      expect(selectorFile).not.toContain(">PT<")
      expect(selectorFile).not.toContain(">EN<")
      expect(selectorFile).not.toContain("{expanded ? t('common.portuguese') : 'PT'}")
      expect(selectorFile).not.toContain("{expanded ? t('common.english') : 'EN'}")
    })

    it("renders natural locale names \"Português\" and \"English\"", () => {
      expect(selectorFile).toContain("<span>Português</span>")
      expect(selectorFile).toContain("<span>English</span>")
    })
  })

  describe("2. Onboarding Surface Consistency", () => {
    const onboardingShell = read("components/onboarding/onboarding-shell.tsx")
    const globalsCss = read("app/globals.css")

    it("onboarding shell imports and renders canonical popover LanguageSelector", () => {
      expect(onboardingShell).toContain("import { LanguageSelector } from '@/components/i18n'")
      expect(onboardingShell).toMatch(/<LanguageSelector[^>]*variant="popover"/)
      expect(onboardingShell).toContain("showLabel")
    })

    it("groups LanguageSelector and exit button inside .onboarding-header-actions", () => {
      expect(onboardingShell).toContain("<div className=\"onboarding-header-actions\">")
      expect(onboardingShell).toContain("onboarding-exit")
      expect(globalsCss).toContain(".onboarding-header-actions")
    })

    it("does not render raw PT / EN anywhere in OnboardingShell or review page", () => {
      const reviewPage = read("app/(dashboard)/onboarding/revisar/page.tsx")
      expect(onboardingShell).not.toMatch(/>\s*PT\s*\/\s*EN\s*</)
      expect(reviewPage).not.toMatch(/>\s*PT\s*\/\s*EN\s*</)
    })
  })

  describe("3. Public & Auth Surfaces Consistency", () => {
    it("public desktop navigation uses canonical popover LanguageSelector", () => {
      const desktopNav = read("components/public/public-desktop-navigation.tsx")
      expect(desktopNav).toMatch(/<LanguageSelector[^>]*variant="popover"/)
    })

    it("public footer uses canonical popover LanguageSelector with dark theme", () => {
      const footer = read("components/public/public-footer.tsx")
      expect(footer).toMatch(/<LanguageSelector[^>]*variant="popover"/)
      expect(footer).toContain("theme=\"dark\"")
    })

    it("auth layout uses canonical popover LanguageSelector", () => {
      const authLayout = read("app/(auth)/layout.tsx")
      expect(authLayout).toMatch(/<LanguageSelector[^>]*variant="popover"/)
      expect(authLayout).toContain("showLabel")
    })

    it("public mobile navigation uses canonical popover LanguageSelector", () => {
      const mobileNav = read("components/public/mobile-navigation.tsx")
      expect(mobileNav).toMatch(/<LanguageSelector[^>]*variant="popover"/)
    })
  })

  describe("4. Professional App, Client & Admin Surfaces Consistency", () => {
    it("professional dashboard header uses canonical popover LanguageSelector", () => {
      const dashHeader = read("components/dashboard/professional-dashboard-header.tsx")
      expect(dashHeader).toMatch(/<LanguageSelector[^>]*variant="popover"/)
    })

    it("client area header uses canonical popover LanguageSelector", () => {
      const clientPage = read("app/(dashboard)/cliente/page.tsx")
      expect(clientPage).toMatch(/<LanguageSelector[^>]*variant="popover"/)
    })

    it("admin navbar uses canonical popover LanguageSelector with dark theme", () => {
      const adminNav = read("components/admin/admin-navbar.tsx")
      expect(adminNav).toMatch(/<LanguageSelector[^>]*variant="popover"/)
      expect(adminNav).toContain("theme=\"dark\"")
    })
  })

  describe("5. Locale Routing & State Safety", () => {
    it("preserves onboarding review route when switching from pt-BR to en", () => {
      expect(localizePathname("/onboarding/revisar", "en")).toBe("/en/onboarding/revisar")
    })

    it("preserves onboarding review route when switching from en to pt-BR", () => {
      expect(localizePathname("/en/onboarding/revisar", "pt-BR")).toBe("/onboarding/revisar")
    })

    it("preserves other onboarding steps during locale changes", () => {
      expect(localizePathname("/onboarding/fotos", "en")).toBe("/en/onboarding/fotos")
      expect(localizePathname("/onboarding/onde-atende", "en")).toBe("/en/onboarding/onde-atende")
      expect(localizePathname("/onboarding/verificacao", "en")).toBe("/en/onboarding/verificacao")
      expect(localizePathname("/onboarding/seu-perfil", "en")).toBe("/en/onboarding/seu-perfil")
    })

    it("preserves dashboard and client routes during locale changes", () => {
      expect(localizePathname("/dashboard", "en")).toBe("/en/dashboard")
      expect(localizePathname("/cliente", "en")).toBe("/en/cliente")
      expect(localizePathname("/login", "en")).toBe("/en/login")
    })
  })

  describe("6. Scan for Legacy Raw Selector Patterns Across Components", () => {
    function getTsxFiles(dir: string): string[] {
      const files = []
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry)
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          if (!["node_modules", ".next", ".git"].includes(entry)) {
            files.push(...getTsxFiles(fullPath))
          }
        } else if (fullPath.endsWith(".tsx")) {
          files.push(fullPath)
        }
      }
      return files
    }

    it("zero user-facing components render raw PT / EN or PT | EN strings", () => {
      const componentFiles = [
        ...getTsxFiles(join(ROOT, "components")),
        ...getTsxFiles(join(ROOT, "app")),
      ]

      const rawPtEnRegex = />\s*PT\s*[/|]\s*EN\s*</i

      for (const file of componentFiles) {
        const content = readFileSync(file, "utf-8")
        expect(
          rawPtEnRegex.test(content),
          "Found raw PT/EN in component: " + file
        ).toBe(false)
      }
    })
  })
})
