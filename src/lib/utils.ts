// src/lib/utils.ts

export const BRL = (v: number) =>
  'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const BRLk = (v: number) =>
  'R$ ' + (v / 1000).toFixed(1).replace('.', ',') + 'k';

export const pct = (v: number, decimals = 1) => v.toFixed(decimals) + '%';

export function calcNetRevenue(gross: number, taxRate: number): number {
  return gross * (1 - taxRate / 100);
}

// Pricing calculations (based on Almah spreadsheet logic)
export function calcPricingItem(params: {
  costPerHour: number;
  peopleCount: number;
  marginRate: number;  // 50 = 50%
  taxRate: number;     // 15 = 15%
  hoursPerMonth: number;
  projectPct: number;  // 0.31 = 31%
  hoursAllocated: number;
}) {
  const { costPerHour, peopleCount, marginRate, taxRate, hoursPerMonth, projectPct, hoursAllocated } = params;

  const fullHourCost    = costPerHour * hoursPerMonth;
  const pricePerHour    = costPerHour * (1 + marginRate / 100);
  const priceWithTax    = pricePerHour * (1 + taxRate / 100);
  const teamMonthlyCost = priceWithTax * hoursPerMonth * peopleCount;
  const projectRevenue  = teamMonthlyCost * projectPct;
  const saleByHour      = hoursAllocated * pricePerHour;

  return { fullHourCost, pricePerHour, priceWithTax, teamMonthlyCost, projectRevenue, saleByHour };
}

export function calcPricingTotals(items: Array<{
  teamMonthlyCost: number;
  projectRevenue: number;
  saleByHour: number;
}>, taxRate: number) {
  const totalTeamCost    = items.reduce((s, i) => s + i.teamMonthlyCost, 0);
  const totalProjectRev  = items.reduce((s, i) => s + i.projectRevenue, 0);
  const totalSaleByHour  = items.reduce((s, i) => s + i.saleByHour, 0);
  const totalSale        = totalSaleByHour;
  const taxOnTotal       = totalProjectRev * (taxRate / 100);

  return { totalTeamCost, totalProjectRev, totalSaleByHour, totalSale, taxOnTotal };
}

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  ECOMMERCE_MANAGEMENT:   'Gestão de E-commerce',
  PERFORMANCE_MEDIA:      'Performance / Mídia Paga',
  SEO_CONTENT:            'SEO / Conteúdo',
  WEB_DEVELOPMENT:        'Desenvolvimento Web',
  CRM_AUTOMATION:         'CRM / Automação',
  STRATEGIC_CONSULTING:   'Consultoria Estratégica',
  SOCIAL_MEDIA:           'Social Media',
  DESIGN_UX:              'Design / UX',
  BPO_FINANCIAL:          'BPO Financeiro',
  OUTSOURCING:            'Outsourcing',
  OTHER:                  'Outros',
};

export const RISK_LABELS: Record<string, string> = {
  LOW: 'Baixo', MEDIUM: 'Médio', HIGH: 'Alto', CRITICAL: 'Crítico',
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo', INACTIVE: 'Inativo', PROSPECT: 'Prospect', CHURNED: 'Churned',
};

export const PRICING_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho', SENT: 'Enviado', APPROVED: 'Aprovado', REJECTED: 'Rejeitado', EXPIRED: 'Expirado',
};

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}
