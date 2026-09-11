import { requireAdmin } from '@/modules/moderation/guards'
import { getAdminDataSubjectRequests } from '@/modules/privacy/dal'
import { LGPD_RIGHTS } from '@/modules/privacy/types'

export const dynamic = 'force-dynamic'

export default async function AdminPrivacyPage() {
  await requireAdmin()
  const requests = await getAdminDataSubjectRequests({ limit: 50 })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">
            Privacidade &amp; Solicitações LGPD
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Painel operacional para acompanhamento de direitos dos titulares (Lei 13.709/2018).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300">
            Total de Solicitações: {requests.length}
          </span>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
        <h2 className="text-sm font-semibold text-neutral-200">Direitos Técnicos Suportados</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {LGPD_RIGHTS.map((right) => (
            <span
              key={right}
              className="rounded bg-neutral-800/80 px-2 py-0.5 text-xs text-neutral-300 font-mono"
            >
              {right}
            </span>
          ))}
        </div>
      </div>

      {/* Requests Ledger Table */}
      <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
        <div className="px-4 py-3 border-b border-neutral-800 font-medium text-sm text-neutral-300">
          Registro Canônico de Solicitações (DSR Ledger)
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            Nenhuma solicitação de privacidade registrada até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="border-b border-neutral-800 bg-neutral-900/50 text-neutral-400 uppercase">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Tipo de Direito</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Titular (Hash/ID)</th>
                  <th className="px-4 py-3">Criado em</th>
                  <th className="px-4 py-3">Resolução</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-neutral-900/30">
                    <td className="px-4 py-3 font-mono text-neutral-400">
                      {req.id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 font-semibold text-neutral-200">
                      {req.request_type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          req.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : req.status === 'RECEIVED'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : req.status === 'IN_REVIEW' || req.status === 'PROCESSING'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-400">
                      {req.requester_account_user_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {new Date(req.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {req.resolution_code || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
