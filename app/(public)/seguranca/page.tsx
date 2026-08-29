import type { Metadata } from 'next'
import { LegalDocument, type LegalSection } from '@/components/public/legal-document'
import { buildCanonicalUrl } from '@/modules/seo/canonical'

export const metadata: Metadata = {
  title: { absolute: 'Segurança | Velvet' },
  description: 'Conheça os princípios e controles de segurança da Velvet.',
  alternates: { canonical: buildCanonicalUrl('/seguranca') },
}

export default function SecurityPage() {
  const sections: LegalSection[] = [
    { id: 'verificacao', title: 'Identidade e maioridade', content: <p>Profissionais precisam concluir verificação de identidade e confirmação de idade por fornecedor especializado antes de avançar para recursos de publicação. A Velvet é exclusivamente 18+.</p> },
    { id: 'midia', title: 'Mídia privada e publicação aprovada', content: <p>As fotos são enviadas a armazenamento não público. Apenas conteúdo aprovado no fluxo de moderação pode ser exibido, e sua entrega usa endereços temporários. Arquivos pendentes, rejeitados ou isolados para análise não são publicados.</p> },
    { id: 'acesso', title: 'Autenticação e isolamento de acesso', content: <p>Contas usam autenticação gerenciada e sessões protegidas. Ações da área profissional verificam a identidade da conta e restringem o acesso aos próprios recursos; operações privilegiadas permanecem no servidor.</p> },
    { id: 'moderacao', title: 'Moderação e prevenção', content: <p>Perfis e mídias passam por estados controlados de revisão. Denúncias podem ser analisadas e conteúdo pode ser restringido, removido ou colocado em revisão quando houver risco, violação das regras ou obrigação legal.</p> },
    { id: 'contato', title: 'Contato direto', content: <p>A Velvet não possui chat entre visitantes e profissionais. O contato ocorre diretamente pelo canal que a profissional escolheu publicar. Não envie documentos, credenciais ou dados financeiros a desconhecidos e interrompa interações suspeitas.</p> },
    { id: 'dados', title: 'Proteção e minimização de dados', content: <p>Buscamos limitar dados às finalidades do serviço. Resultados internos de verificação, analytics brutos e informações de cobrança não fazem parte do perfil público. Métricas oferecidas à profissional são agregadas.</p> },
    { id: 'responsabilidade', title: 'Uso responsável', content: <p>Use senhas exclusivas, mantenha dispositivos atualizados, confira o domínio antes de entrar e nunca compartilhe códigos de acesso. Nenhuma tecnologia elimina todos os riscos; segurança depende também das escolhas de cada pessoa.</p> },
  ]
  return <LegalDocument eyebrow="Confiança e proteção" title="Segurança na Velvet" introduction={<p>Segurança é construída em camadas: verificação, acesso controlado, mídia privada, moderação e uso responsável. Esta página apresenta os princípios do produto sem expor detalhes que possam enfraquecer esses controles.</p>} sections={sections} showContents={false} />
}
