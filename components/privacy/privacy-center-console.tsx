'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/components/i18n'
import type { MessageKey } from '@/lib/i18n/catalog'
import {
  LGPD_RIGHTS,
  type LgpdRight,
  type DataSubjectRequestSafeDTO,
  type DataSubjectRequestEventSafeDTO,
  type DataSubjectSummaryDTO,
} from '@/modules/privacy/types'
import {
  createDataSubjectRequestAction,
  getMyDataExportZipAction,
  getMyDsrEventsTimelineAction,
  cancelMyDataSubjectRequestAction,
} from '@/modules/privacy/actions'

export type PrivacyCenterTab = 'overview' | 'my-data' | 'requests' | 'preferences'

interface PrivacyCenterConsoleProps {
  initialSummary: DataSubjectSummaryDTO
  initialRequests: DataSubjectRequestSafeDTO[]
}

export function PrivacyCenterConsole({
  initialSummary,
  initialRequests,
}: PrivacyCenterConsoleProps) {
  const { t, locale } = useI18n()
  const isEn = locale === 'en'

  const [activeTab, setActiveTab] = useState<PrivacyCenterTab>('overview')
  const [requests, setRequests] = useState<DataSubjectRequestSafeDTO[]>(initialRequests)
  const [isExportingZip, setIsExportingZip] = useState(false)
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false)
  const [newRequestType, setNewRequestType] = useState<LgpdRight>('ACCESS')
  const [newRequestDetails, setNewRequestDetails] = useState('')
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)
  const [isCancellingId, setIsCancellingId] = useState<string | null>(null)
  const [timelineModalRequestId, setTimelineModalRequestId] = useState<string | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<DataSubjectRequestEventSafeDTO[] | null>(null)
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const summary = initialSummary
  const policyHref = isEn ? '/en/privacidade' : '/privacidade'

  // Format date helper
  const formatDate = (isoString: string | null | undefined) => {
    if (!isoString) return t('privacy.notRecorded')
    try {
      return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(isoString))
    } catch {
      return isoString
    }
  }

  // ZIP Download Handler
  const handleDownloadZip = async () => {
    setIsExportingZip(true)
    setFeedbackMessage(null)
    try {
      const res = await getMyDataExportZipAction()
      if (!res.success || !res.data) {
        setFeedbackMessage({ type: 'error', text: res.error || t('privacy.errorGeneric') })
        return
      }

      const byteCharacters = atob(res.data.base64Zip)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = res.data.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      setFeedbackMessage({ type: 'error', text: t('privacy.errorGeneric') })
    } finally {
      setIsExportingZip(false)
    }
  }

  // Submit DSR Request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingRequest(true)
    setFeedbackMessage(null)
    try {
      const res = await createDataSubjectRequestAction({
        requestType: newRequestType,
        details: newRequestDetails.trim() ? { notes: newRequestDetails.trim() } : {},
      })

      if (!res.success || !res.data) {
        const errorMsg =
          res.code === 'DUPLICATE_ACTIVE_REQUEST'
            ? t('privacy.duplicateActiveError')
            : res.error || t('privacy.errorGeneric')
        setFeedbackMessage({ type: 'error', text: errorMsg })
        return
      }

      setRequests((prev) => [res.data!, ...prev])
      setIsNewRequestModalOpen(false)
      setNewRequestDetails('')
      setFeedbackMessage({
        type: 'success',
        text: `${t('privacy.requestCreatedSuccess')} (${res.data.id.slice(0, 8)})`,
      })
      setActiveTab('requests')
    } catch {
      setFeedbackMessage({ type: 'error', text: t('privacy.errorGeneric') })
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  // Cancel Request
  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm(t('privacy.confirmCancelPrompt'))) return
    setIsCancellingId(requestId)
    setFeedbackMessage(null)
    try {
      const res = await cancelMyDataSubjectRequestAction(requestId)
      if (!res.success) {
        setFeedbackMessage({ type: 'error', text: res.error || t('privacy.errorGeneric') })
        return
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: 'CANCELLED', cancelledAt: new Date().toISOString() }
            : r
        )
      )
      setFeedbackMessage({ type: 'success', text: t('privacy.requestCancelSuccess') })
    } catch {
      setFeedbackMessage({ type: 'error', text: t('privacy.errorGeneric') })
    } finally {
      setIsCancellingId(null)
    }
  }

  // Open Timeline Modal
  const handleOpenTimeline = async (requestId: string) => {
    setTimelineModalRequestId(requestId)
    setIsLoadingTimeline(true)
    setTimelineEvents(null)
    try {
      const res = await getMyDsrEventsTimelineAction(requestId)
      if (res.success && res.data) {
        setTimelineEvents(res.data)
      } else {
        setTimelineEvents([])
      }
    } catch {
      setTimelineEvents([])
    } finally {
      setIsLoadingTimeline(false)
    }
  }

  const handleOpenCookiePreferences = () => {
    window.dispatchEvent(new Event('velvet:open-cookie-preferences'))
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      case 'IDENTITY_VERIFICATION_REQUIRED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      case 'IN_REVIEW':
      case 'PROCESSING':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30'
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      case 'REJECTED':
        return 'bg-red-500/10 text-red-400 border-red-500/30'
      case 'CANCELLED':
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                LGPD · Art. 18
              </span>
              <span className="text-xs text-zinc-400">Lei nº 13.709/2018</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-2">
              {t('privacy.pageTitle')}
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-3xl">
              {t('privacy.pageSubtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsNewRequestModalOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-500 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              {t('privacy.quickNewRequest')}
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMessage && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-4 p-4 rounded-lg border text-sm flex items-center justify-between ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-red-950/40 border-red-800 text-red-300'
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-zinc-400 hover:text-white transition-colors ml-4 text-xs font-semibold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 mt-6 border-b border-zinc-800" aria-label="Tabs">
          {(
            [
              { id: 'overview', label: t('privacy.tabOverview') },
              { id: 'my-data', label: t('privacy.tabMyData') },
              { id: 'requests', label: t('privacy.tabRequests') },
              { id: 'preferences', label: t('privacy.tabPreferences') },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-amber-500 text-amber-400 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white">{t('privacy.quickDownloadZip')}</h3>
                <p className="text-xs text-zinc-400 mt-1">{t('privacy.exportSectionDesc')}</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={isExportingZip}
                className="mt-4 w-full py-2 px-3 text-xs font-medium rounded-lg text-amber-300 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/40 transition-colors text-center disabled:opacity-50"
              >
                {isExportingZip ? t('privacy.downloadingZip') : t('privacy.downloadZipBtn')}
              </button>
            </div>

            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white">{t('privacy.quickNewRequest')}</h3>
                <p className="text-xs text-zinc-400 mt-1">{t('privacy.overviewDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewRequestModalOpen(true)}
                className="mt-4 w-full py-2 px-3 text-xs font-medium rounded-lg text-blue-300 bg-blue-950/40 border border-blue-800/60 hover:bg-blue-900/40 transition-colors text-center"
              >
                {t('privacy.newRequestBtn')}
              </button>
            </div>

            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white">{t('privacy.quickManageCookies')}</h3>
                <p className="text-xs text-zinc-400 mt-1">{t('privacy.cookiePreferencesDesc')}</p>
              </div>
              <button
                type="button"
                onClick={handleOpenCookiePreferences}
                className="mt-4 w-full py-2 px-3 text-xs font-medium rounded-lg text-purple-300 bg-purple-950/40 border border-purple-800/60 hover:bg-purple-900/40 transition-colors text-center"
              >
                {t('privacy.openCookiePreferencesBtn')}
              </button>
            </div>
          </div>

          {/* Subject Identification Card */}
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t('privacy.cardSubjectTitle')}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">{t('privacy.accountRole')}</p>
                <p className="text-sm font-medium text-zinc-200 mt-1 flex items-center gap-2">
                  <span className="inline-flex px-2 py-0.5 rounded text-xs bg-zinc-800 border border-zinc-700 font-mono">
                    {summary.role}
                  </span>
                  {summary.role === 'CLIENT' && (
                    <span className="text-xs text-amber-400">
                      {summary.clientSummary?.membershipType === 'VIP' ? t('privacy.membershipVip') : t('privacy.membershipFree')}
                    </span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">{t('privacy.accountEmail')}</p>
                <p className="text-sm font-medium text-zinc-200 mt-1 font-mono break-all">
                  {summary.email || t('privacy.notRecorded')}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">{t('privacy.accountStatus')}</p>
                <p className="text-sm font-medium text-emerald-400 mt-1">
                  {summary.status}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">{t('privacy.createdAt')}</p>
                <p className="text-sm font-medium text-zinc-200 mt-1">
                  {formatDate(summary.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500">{t('privacy.termsAccepted')}</p>
                <p className="text-xs text-zinc-300 mt-0.5">
                  {summary.legalAcceptance.termsAcceptedAt
                    ? t('privacy.acceptedOn', { date: formatDate(summary.legalAcceptance.termsAcceptedAt) })
                    : t('privacy.notRecorded')}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">{t('privacy.privacyAccepted')}</p>
                <p className="text-xs text-zinc-300 mt-0.5">
                  {summary.legalAcceptance.privacyAcceptedAt
                    ? t('privacy.acceptedOn', { date: formatDate(summary.legalAcceptance.privacyAcceptedAt) })
                    : t('privacy.notRecorded')}
                </p>
              </div>
            </div>
          </div>

          {/* Security & Integrity Commitment */}
          <div className="p-6 rounded-xl bg-amber-950/20 border border-amber-900/40">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-amber-300">
                  {t('privacy.securityNoticeTitle')}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {t('privacy.securityNoticeBody')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY DATA */}
      {activeTab === 'my-data' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{t('privacy.myDataTitle')}</h2>
                <p className="text-xs text-zinc-400 mt-1">{t('privacy.myDataDesc')}</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={isExportingZip}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg text-white bg-amber-600 hover:bg-amber-500 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {isExportingZip ? t('privacy.downloadingZip') : t('privacy.downloadZipBtn')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Category 1: Account */}
              <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                <h3 className="text-sm font-medium text-white flex items-center justify-between">
                  <span>{t('privacy.dataCategoryAccount')}</span>
                  <span className="text-xs text-emerald-400 font-mono">1 registro</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">{t('privacy.dataCategoryAccountDesc')}</p>
                <div className="mt-3 text-xs text-zinc-300 font-mono space-y-1">
                  <div>E-mail: {summary.email || t('privacy.notRecorded')}</div>
                  <div>Perfil: {summary.role}</div>
                </div>
              </div>

              {/* Category 2: Profile (if advertiser) */}
              {summary.role === 'ADVERTISER' && summary.advertiserSummary && (
                <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <h3 className="text-sm font-medium text-white flex items-center justify-between">
                    <span>{t('privacy.dataCategoryProfile')}</span>
                    <span className="text-xs text-amber-400 font-mono">
                      {t('privacy.countLocations', { count: summary.advertiserSummary.locationsCount })}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">{t('privacy.dataCategoryProfileDesc')}</p>
                  <div className="mt-3 text-xs text-zinc-300 space-y-1">
                    <div>Nome artístico: <span className="font-semibold text-white">{summary.advertiserSummary.stageName || '—'}</span></div>
                    <div>Serviços: {t('privacy.countOfferings', { count: summary.advertiserSummary.offeringsCount })}</div>
                  </div>
                </div>
              )}

              {/* Category 3: Media (if advertiser) */}
              {summary.role === 'ADVERTISER' && summary.advertiserSummary && (
                <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <h3 className="text-sm font-medium text-white flex items-center justify-between">
                    <span>{t('privacy.dataCategoryMedia')}</span>
                    <span className="text-xs text-blue-400 font-mono">
                      {t('privacy.countPhotos', { count: summary.advertiserSummary.photosCount })}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">{t('privacy.dataCategoryMediaDesc')}</p>
                  <div className="mt-3 text-xs text-zinc-300 space-y-1">
                    <div>Fotos: {t('privacy.countPhotos', { count: summary.advertiserSummary.photosCount })}</div>
                    <div>Vídeos: {t('privacy.countVideos', { count: summary.advertiserSummary.videosCount })}</div>
                  </div>
                </div>
              )}

              {/* Category 4: Commercial & Subscriptions */}
              {summary.role === 'ADVERTISER' && summary.advertiserSummary && (
                <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <h3 className="text-sm font-medium text-white flex items-center justify-between">
                    <span>{t('privacy.dataCategoryCommercial')}</span>
                    <span className="text-xs text-purple-400 font-mono">
                      {summary.advertiserSummary.subscriptionPlan
                        ? t('privacy.subscriptionActive', { plan: summary.advertiserSummary.subscriptionPlan })
                        : t('privacy.noActiveSubscription')}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">{t('privacy.dataCategoryCommercialDesc')}</p>
                  <div className="mt-3 text-xs text-zinc-300 space-y-1">
                    <div>Destaques: {t('privacy.countBoosts', { count: summary.advertiserSummary.activeBoostsCount })}</div>
                  </div>
                </div>
              )}

              {/* Category 5: Client Reviews & Membership (if client) */}
              {summary.role === 'CLIENT' && summary.clientSummary && (
                <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <h3 className="text-sm font-medium text-white flex items-center justify-between">
                    <span>{t('privacy.dataCategoryReviews')}</span>
                    <span className="text-xs text-amber-400 font-mono">
                      {t('privacy.countReviews', { count: summary.clientSummary.authoredReviewsCount })}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">{t('privacy.dataCategoryReviewsDesc')}</p>
                  <div className="mt-3 text-xs text-zinc-300 space-y-1">
                    <div>Plano: {summary.clientSummary.membershipType === 'VIP' ? t('privacy.membershipVip') : t('privacy.membershipFree')}</div>
                    <div>Avaliações escritas: {summary.clientSummary.authoredReviewsCount}</div>
                  </div>
                </div>
              )}

              {/* Category 6: Privacy Requests */}
              <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                <h3 className="text-sm font-medium text-white flex items-center justify-between">
                  <span>{t('privacy.dataCategoryDsr')}</span>
                  <span className="text-xs text-zinc-400 font-mono">{summary.totalRequestsCount} total</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">{t('privacy.dataCategoryDsrDesc')}</p>
                <div className="mt-3 text-xs text-zinc-300 space-y-1">
                  <div>Solicitações ativas: {summary.activeRequestsCount}</div>
                  <div>Histórico completo: {summary.totalRequestsCount} registro(s)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Export Bundle Card */}
          <div className="p-6 rounded-xl bg-zinc-900/30 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white">{t('privacy.exportSectionTitle')}</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl">{t('privacy.exportSanitizedNotice')}</p>
            </div>
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isExportingZip}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {isExportingZip ? t('privacy.downloadingZip') : t('privacy.downloadZipBtn')}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">{t('privacy.requestsTitle')}</h2>
              <p className="text-xs text-zinc-400 mt-1">{t('privacy.requestsDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewRequestModalOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg text-white bg-amber-600 hover:bg-amber-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              {t('privacy.newRequestBtn')}
            </button>
          </div>

          {requests.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-zinc-900/30 border border-zinc-800">
              <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-zinc-400">{t('privacy.noRequests')}</p>
              <button
                type="button"
                onClick={() => setIsNewRequestModalOpen(true)}
                className="mt-4 px-4 py-2 text-xs font-medium rounded-lg text-amber-400 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/40 transition-colors"
              >
                {t('privacy.newRequestBtn')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => {
                const isCancellable = ['RECEIVED', 'IDENTITY_VERIFICATION_REQUIRED', 'IN_REVIEW'].includes(r.status)
                const rightMessageKey = `privacy.right.${r.requestType}` as MessageKey
                const rightLabel = t(rightMessageKey)
                const statusMessageKey = `privacy.status.${r.status}` as MessageKey
                const statusLabel = t(statusMessageKey)

                return (
                  <div
                    key={r.id}
                    className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-zinc-500 font-semibold">
                          #{r.id.slice(0, 8)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(
                            r.status
                          )}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white">{rightLabel}</h3>
                      <p className="text-xs text-zinc-400">
                        {t('privacy.requestDate')}: {formatDate(r.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenTimeline(r.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                      >
                        {t('privacy.requestTimelineBtn')}
                      </button>

                      {isCancellable && (
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(r.id)}
                          disabled={isCancellingId === r.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-400 bg-red-950/40 hover:bg-red-900/40 border border-red-900/40 transition-colors disabled:opacity-50"
                        >
                          {isCancellingId === r.id ? t('privacy.cancelling') : t('privacy.requestCancelBtn')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PREFERENCES */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h2 className="text-lg font-semibold text-white">{t('privacy.preferencesTitle')}</h2>
            <p className="text-xs text-zinc-400 mt-1">{t('privacy.preferencesDesc')}</p>

            <div className="mt-6 space-y-4">
              <div className="p-5 rounded-lg bg-zinc-950/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-white">{t('privacy.cookiePreferencesTitle')}</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xl">{t('privacy.cookiePreferencesDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCookiePreferences}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-amber-300 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/40 transition-colors whitespace-nowrap"
                >
                  {t('privacy.openCookiePreferencesBtn')}
                </button>
              </div>

              <div className="p-5 rounded-lg bg-zinc-950/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-white">{t('privacy.policyLinkTitle')}</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xl">{t('privacy.policyLinkDesc')}</p>
                </div>
                <Link
                  href={policyHref}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors whitespace-nowrap"
                >
                  {t('privacy.readFullPolicy')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NEW DSR REQUEST */}
      {isNewRequestModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-dsr-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 id="modal-dsr-title" className="text-base font-semibold text-white">
                  {t('privacy.modalTitle')}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">{t('privacy.modalSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewRequestModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
                aria-label={t('privacy.closeModalBtn')}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label htmlFor="dsr-type-select" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  {t('privacy.selectRightLabel')}
                </label>
                <select
                  id="dsr-type-select"
                  value={newRequestType}
                  onChange={(e) => setNewRequestType(e.target.value as LgpdRight)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {LGPD_RIGHTS.map((r) => {
                    const labelKey = `privacy.right.${r}` as MessageKey
                    return (
                      <option key={r} value={r}>
                        {t(labelKey)}
                      </option>
                    )
                  })}
                </select>
                <p className="text-xs text-zinc-400 mt-2 p-2.5 rounded bg-zinc-950 border border-zinc-800">
                  {t(`privacy.rightDesc.${newRequestType}` as MessageKey)}
                </p>
              </div>

              <div>
                <label htmlFor="dsr-details-input" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  {t('privacy.detailsLabel')}
                </label>
                <textarea
                  id="dsr-details-input"
                  rows={3}
                  value={newRequestDetails}
                  onChange={(e) => setNewRequestDetails(e.target.value)}
                  placeholder={t('privacy.detailsPlaceholder')}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 rounded bg-amber-950/30 border border-amber-900/40 text-[11px] text-zinc-400 leading-relaxed">
                {t('privacy.securityNoticeBody')}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewRequestModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-zinc-300 hover:text-white transition-colors"
                >
                  {t('privacy.closeModalBtn')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-amber-600 hover:bg-amber-500 transition-colors disabled:opacity-50"
                >
                  {isSubmittingRequest ? t('privacy.submittingRequest') : t('privacy.submitRequestBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TIMELINE EVENTS */}
      {timelineModalRequestId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-timeline-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 id="modal-timeline-title" className="text-base font-semibold text-white">
                  {t('privacy.timelineTitle')}
                </h2>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  Protocolo: #{timelineModalRequestId.slice(0, 8)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTimelineModalRequestId(null)}
                className="text-zinc-400 hover:text-white transition-colors"
                aria-label={t('privacy.closeModalBtn')}
              >
                ✕
              </button>
            </div>

            <div className="py-2">
              {isLoadingTimeline ? (
                <p className="text-xs text-zinc-400 text-center py-6">Carregando histórico...</p>
              ) : timelineEvents && timelineEvents.length > 0 ? (
                <ol className="relative border-l border-zinc-700 ml-3 space-y-6">
                  {timelineEvents.map((event) => {
                    const eventMsgKey = `privacy.event.${event.eventType}` as MessageKey
                    const eventText = t(eventMsgKey)
                    const actorMsgKey = `privacy.timelineActor.${event.actorRole}` as MessageKey
                    const actorText = t(actorMsgKey)

                    return (
                      <li key={event.id} className="mb-6 ml-6">
                        <span className="absolute flex items-center justify-center w-6 h-6 bg-zinc-800 rounded-full -left-3 ring-4 ring-zinc-900 text-amber-400">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-zinc-200">{actorText}</span>
                          <span className="text-zinc-500">·</span>
                          <time className="text-zinc-500">{formatDate(event.createdAt)}</time>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1">{eventText}</p>
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <p className="text-xs text-zinc-400 text-center py-6">Nenhum evento registrado.</p>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setTimelineModalRequestId(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-zinc-300 hover:text-white transition-colors"
              >
                {t('privacy.closeModalBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
