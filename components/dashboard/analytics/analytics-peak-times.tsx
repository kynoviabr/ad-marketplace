import type { PeakTimesMetric } from '@/modules/analytics/types'

interface AnalyticsPeakTimesProps {
  peakTimes: PeakTimesMetric
  locale: string
}

const ptDayNames: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
}

const enDayNames: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

export function AnalyticsPeakTimes({ peakTimes, locale }: AnalyticsPeakTimesProps) {
  const isPt = locale === 'pt-BR'
  const dayNames = isPt ? ptDayNames : enDayNames

  const bestDay = peakTimes.bestDayOfWeek
  const bestHour = peakTimes.bestHourOfDay

  const maxHourContacts = Math.max(...peakTimes.hourlyDistribution.map((h) => h.contacts || 0), ...peakTimes.hourlyDistribution.map((h) => h.views || 0), 1)
  const maxDayContacts = Math.max(...peakTimes.dayOfWeekDistribution.map((d) => d.contacts || 0), ...peakTimes.dayOfWeekDistribution.map((d) => d.views || 0), 1)

  return (
    <section className="analytics-peak-section" aria-labelledby="analytics-peak-title">
      <div className="analytics-section-heading">
        <div>
          <p className="dashboard-eyebrow">{isPt ? 'DIAS E HORÁRIOS' : 'PEAK TIMES'}</p>
          <h2 id="analytics-peak-title">
            {isPt ? 'Melhores horários e dias de interesse.' : 'Peak days and hours of engagement.'}
          </h2>
        </div>
        <p>
          {isPt
            ? 'Entenda os momentos da semana em que visitantes mais visualizam seu perfil e clicam para entrar em contato.'
            : 'Understand the moments of the week when visitors most frequently view your profile and click to contact you.'}
        </p>
      </div>

      {/* Highlight Cards */}
      <div className="analytics-peak-highlights">
        <div className="analytics-peak-card">
          <span className="analytics-peak-card-eyebrow">{isPt ? 'DIA COM MAIOR ATIVIDADE' : 'MOST ACTIVE DAY'}</span>
          <strong className="analytics-peak-card-value">
            {bestDay ? (dayNames[bestDay.dayOfWeek] || bestDay.dayName) : (isPt ? 'Sem dados' : 'No data')}
          </strong>
          <p className="analytics-peak-card-desc">
            {bestDay && bestDay.contacts > 0
              ? (isPt ? `${bestDay.contacts} cliques no WhatsApp neste dia.` : `${bestDay.contacts} WhatsApp clicks on this day.`)
              : (isPt ? 'Baseado no histórico do período.' : 'Based on period activity.')}
          </p>
        </div>

        <div className="analytics-peak-card">
          <span className="analytics-peak-card-eyebrow">{isPt ? 'HORÁRIO COM MAIOR ATIVIDADE' : 'MOST ACTIVE HOUR'}</span>
          <strong className="analytics-peak-card-value">
            {bestHour ? bestHour.label : (isPt ? 'Sem dados' : 'No data')}
          </strong>
          <p className="analytics-peak-card-desc">
            {bestHour && bestHour.contacts > 0
              ? (isPt ? `${bestHour.contacts} intenções de contato neste horário.` : `${bestHour.contacts} contact clicks during this hour.`)
              : (isPt ? 'Baseado no histórico do período.' : 'Based on period activity.')}
          </p>
        </div>
      </div>

      {/* Hourly Distribution (24h) */}
      <div className="analytics-distribution-block">
        <h3 className="analytics-distribution-title">
          {isPt ? 'Distribuição por hora do dia (00:00 – 23:00)' : 'Hourly distribution (00:00 – 23:00)'}
        </h3>
        <div className="analytics-bars-hourly">
          {peakTimes.hourlyDistribution.map((item) => {
            const heightPct = Math.max(4, Math.round(((item.contacts || item.views || 0) / maxHourContacts) * 100))
            const isTop = bestHour && bestHour.hour === item.hour && item.contacts > 0
            return (
              <div
                key={item.hour}
                className={`analytics-bar-col ${isTop ? 'analytics-bar-col--top' : ''}`}
                title={`${item.label}: ${item.contacts} ${isPt ? 'cliques' : 'clicks'}, ${item.views} ${isPt ? 'visitas' : 'visits'}`}
              >
                <div className="analytics-bar-track">
                  <div
                    className="analytics-bar-fill"
                    style={{ height: `${heightPct}%` }}
                    aria-hidden="true"
                  />
                </div>
                <span className="analytics-bar-label">
                  {item.hour % 3 === 0 ? item.label.slice(0, 2) : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day of Week Distribution */}
      <div className="analytics-distribution-block">
        <h3 className="analytics-distribution-title">
          {isPt ? 'Distribuição por dia da semana' : 'Day of week distribution'}
        </h3>
        <div className="analytics-bars-days">
          {peakTimes.dayOfWeekDistribution.map((item) => {
            const heightPct = Math.max(6, Math.round(((item.contacts || item.views || 0) / maxDayContacts) * 100))
            const isTop = bestDay && bestDay.dayOfWeek === item.dayOfWeek && item.contacts > 0
            return (
              <div
                key={item.dayOfWeek}
                className={`analytics-bar-col-day ${isTop ? 'analytics-bar-col-day--top' : ''}`}
                title={`${item.dayName}: ${item.contacts} ${isPt ? 'cliques' : 'clicks'}, ${item.views} ${isPt ? 'visitas' : 'visits'}`}
              >
                <div className="analytics-bar-track">
                  <div
                    className="analytics-bar-fill"
                    style={{ height: `${heightPct}%` }}
                    aria-hidden="true"
                  />
                </div>
                <span className="analytics-bar-day-name">{item.dayName}</span>
                <span className="analytics-bar-day-count">{item.contacts}</span>
              </div>
            )
          })}
        </div>
      </div>

      <p className="analytics-timezone-note">
        <span aria-hidden="true">ℹ </span>
        {isPt
          ? 'Horários calculados com base no fuso de Brasília (America/Sao_Paulo). Reflete momentos com maior volume de atividade registrada.'
          : 'Times calculated based on Brasília timezone (America/Sao_Paulo). Indicates intervals with highest recorded activity.'}
      </p>
    </section>
  )
}
