'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { HelpArticle, HelpCategory } from '@/modules/help/data'
import type { Locale } from '@/lib/i18n/config'

interface HelpCenterSearchProps {
  categories: HelpCategory[]
  articles: HelpArticle[]
  locale: Locale
}

export function HelpCenterSearch({
  categories,
  articles,
  locale,
}: HelpCenterSearchProps) {
  const isPt = locale === 'pt-BR'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null)

  const normalizedQuery = useMemo(() => {
    return searchQuery.toLowerCase().trim()
  }, [searchQuery])

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      // Category filter
      if (selectedCategory && article.categoryId !== selectedCategory) {
        return false
      }

      // Search query filter
      if (!normalizedQuery) {
        return true
      }

      const title = (isPt ? article.titlePt : article.titleEn).toLowerCase()
      const summary = (isPt ? article.summaryPt : article.summaryEn).toLowerCase()
      const content = (isPt ? article.contentPt : article.contentEn).toLowerCase()
      const keywords = article.keywords.map((k) => k.toLowerCase()).join(' ')
      const category = categories.find((c) => c.id === article.categoryId)
      const categoryTitle = (isPt ? category?.titlePt : category?.titleEn)?.toLowerCase() ?? ''

      return (
        title.includes(normalizedQuery) ||
        summary.includes(normalizedQuery) ||
        content.includes(normalizedQuery) ||
        keywords.includes(normalizedQuery) ||
        categoryTitle.includes(normalizedQuery)
      )
    })
  }, [articles, categories, selectedCategory, normalizedQuery, isPt])

  const toggleArticle = (id: string) => {
    setExpandedArticleId((current) => (current === id ? null : id))
  }

  return (
    <div className="velvet-help-interactive">
      {/* Instant Search Bar */}
      <div className="velvet-help-search-container">
        <div className="velvet-help-search-box">
          <span className="velvet-help-search-icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isPt
                ? 'Buscar dúvidas, temas ou palavras-chave…'
                : 'Search questions, topics, or keywords…'
            }
            className="velvet-help-search-input"
            aria-label={isPt ? 'Buscar na Central de Ajuda' : 'Search Help Center'}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="velvet-help-search-clear"
              aria-label={isPt ? 'Limpar busca' : 'Clear search'}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="velvet-help-categories-section">
        <div className="velvet-help-categories-header">
          <h2 className="velvet-help-categories-title">
            {isPt ? 'Categorias de atendimento' : 'Support categories'}
          </h2>
          {selectedCategory && (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="velvet-help-reset-filter"
            >
              {isPt ? 'Ver todas' : 'Show all'}
            </button>
          )}
        </div>
        <div className="velvet-help-category-pills" role="tablist" aria-label={isPt ? 'Categorias' : 'Categories'}>
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === null}
            onClick={() => setSelectedCategory(null)}
            className={`velvet-help-pill ${selectedCategory === null ? 'is-active' : ''}`}
          >
            <span>✦</span>
            <strong>{isPt ? 'Todas as dúvidas' : 'All topics'}</strong>
            <small>({articles.length})</small>
          </button>
          {categories.map((cat) => {
            const count = articles.filter((a) => a.categoryId === cat.id).length
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                className={`velvet-help-pill ${isSelected ? 'is-active' : ''}`}
              >
                <span>{cat.icon}</span>
                <strong>{isPt ? cat.titlePt : cat.titleEn}</strong>
                {count > 0 && <small>({count})</small>}
              </button>
            )
          })}
        </div>
      </div>

      {/* FAQ Article List */}
      <div className="velvet-help-results-section">
        <div className="velvet-help-results-header">
          <p className="velvet-help-results-count">
            {isPt
              ? `${filteredArticles.length} ${filteredArticles.length === 1 ? 'artigo encontrado' : 'artigos encontrados'}`
              : `${filteredArticles.length} ${filteredArticles.length === 1 ? 'article found' : 'articles found'}`}
            {selectedCategory && (
              <span>
                {' '}• {isPt ? 'Filtrado por: ' : 'Filtered by: '}
                <strong>
                  {isPt
                    ? categories.find((c) => c.id === selectedCategory)?.titlePt
                    : categories.find((c) => c.id === selectedCategory)?.titleEn}
                </strong>
              </span>
            )}
          </p>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="velvet-help-empty">
            <p className="velvet-help-empty-title">
              {isPt ? 'Nenhum artigo encontrado' : 'No articles found'}
            </p>
            <p className="velvet-help-empty-desc">
              {isPt
                ? 'Tente buscar com outros termos ou selecione outra categoria acima.'
                : 'Try searching with other terms or select a different category above.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory(null)
              }}
              className="velvet-help-empty-reset"
            >
              {isPt ? 'Limpar filtros' : 'Reset filters'}
            </button>
          </div>
        ) : (
          <div className="velvet-help-accordion">
            {filteredArticles.map((article) => {
              const isExpanded = expandedArticleId === article.id
              const category = categories.find((c) => c.id === article.categoryId)
              return (
                <article
                  key={article.id}
                  className={`velvet-help-card ${isExpanded ? 'is-expanded' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleArticle(article.id)}
                    className="velvet-help-card-trigger"
                    aria-expanded={isExpanded}
                  >
                    <div className="velvet-help-card-meta">
                      <span className="velvet-help-card-cat">
                        {isPt ? category?.titlePt : category?.titleEn}
                      </span>
                    </div>
                    <h3 className="velvet-help-card-title">
                      {isPt ? article.titlePt : article.titleEn}
                    </h3>
                    <p className="velvet-help-card-summary">
                      {isPt ? article.summaryPt : article.summaryEn}
                    </p>
                    <span className="velvet-help-card-icon" aria-hidden="true">
                      {isExpanded ? '−' : '+'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="velvet-help-card-body">
                      <div className="velvet-help-card-text">
                        {(isPt ? article.contentPt : article.contentEn)
                          .split('\n\n')
                          .map((paragraph, pIdx) => (
                            <p key={pIdx}>{paragraph}</p>
                          ))}
                      </div>

                      {article.relatedLinks && article.relatedLinks.length > 0 && (
                        <div className="velvet-help-card-links">
                          <span className="velvet-help-links-label">
                            {isPt ? 'Links relacionados:' : 'Related links:'}
                          </span>
                          <div className="velvet-help-links-group">
                            {article.relatedLinks.map((link, lIdx) => (
                              <Link
                                key={lIdx}
                                href={isPt ? link.href : `/en${link.href}`}
                                className="velvet-help-link-item"
                              >
                                {isPt ? link.labelPt : link.labelEn} →
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
