import { PrismaClient, UserRole, ServiceType, RiskLevel, PricingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding profitOS database...');

  const company = await prisma.company.upsert({
    where: { slug: 'demo-agency' },
    update: {},
    create: {
      name: 'Demo Agency', slug: 'demo-agency', plan: 'PRO',
      settings: { create: { defaultTaxRate: 6.0, defaultMargin: 50.0, hoursPerMonth: 160, timezone: 'America/Sao_Paulo' } },
    },
  });

  const hash = (p: string) => bcrypt.hash(p, 12);

  const demoUsers = [
    { email: 'admin@demo.com',    name: 'Administrador', role: UserRole.OWNER   }
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { companyId: company.id, name: u.name, email: u.email, passwordHash: await hash('Demo@2026'), role: u.role },
    });
  }

  // Default categories
  const expCats = ['Remuneração PJ','Licença de software','Antecipação de Lucros','Pró-labore','Empréstimos','Telefonia','Honorários Contábeis','BPO Financeiro','Eventos','Plano de Saúde'];
  for (const name of expCats) {
    await prisma.category.upsert({ where:{ companyId_name_type:{ companyId:company.id, name, type:'EXPENSE' } }, update:{}, create:{ companyId:company.id, name, type:'EXPENSE', isDefault:true } });
  }
  await prisma.category.upsert({ where:{ companyId_name_type:{ companyId:company.id, name:'Receita de Serviços', type:'INCOME' } }, update:{}, create:{ companyId:company.id, name:'Receita de Serviços', type:'INCOME', isDefault:true } });

  // Clients from real spreadsheet
  const clients = [
    { name:'IRMAOS SOARES S/A',           serviceType:ServiceType.ECOMMERCE_MANAGEMENT, gross:13476.46, risk:RiskLevel.MEDIUM },
    { name:'AGUAS PRATA LTDA',            serviceType:ServiceType.ECOMMERCE_MANAGEMENT, gross:7446.81,  risk:RiskLevel.LOW    },
    { name:'ALIANCA METALURGICA S.A.',    serviceType:ServiceType.ECOMMERCE_MANAGEMENT, gross:9574.47,  risk:RiskLevel.LOW    },
    { name:'CALCADOS BOTTERO LTDA',       serviceType:ServiceType.ECOMMERCE_MANAGEMENT, gross:957.48,   risk:RiskLevel.HIGH   },
    { name:'Komfort House Sofas',         serviceType:ServiceType.WEB_DEVELOPMENT,      gross:12384.20, risk:RiskLevel.LOW,   recurring:false },
    { name:'Grupo Líder',                 serviceType:ServiceType.ECOMMERCE_MANAGEMENT, gross:14440.23, risk:RiskLevel.LOW    },
    { name:'AMG GROUP IMPORTAÇÃO',        serviceType:ServiceType.PERFORMANCE_MEDIA,    gross:7987.23,  risk:RiskLevel.LOW    },
    { name:'ZANON SOCIEDADE EMPRESARIA',  serviceType:ServiceType.ECOMMERCE_MANAGEMENT, gross:31949.47, risk:RiskLevel.CRITICAL},
    { name:'FERRAGENS FLORESTA',          serviceType:ServiceType.ECOMMERCE_MANAGEMENT, gross:8194.84,  risk:RiskLevel.MEDIUM },
    { name:'BEN IMPORTS',                 serviceType:ServiceType.PERFORMANCE_MEDIA,    gross:12979.26, risk:RiskLevel.LOW    },
    { name:'ARAUJO CASA E CONSTRUCAO',    serviceType:ServiceType.SEO_CONTENT,          gross:6888.46,  risk:RiskLevel.LOW    },
    { name:'MONTSERRAT COMERCIAL',        serviceType:ServiceType.STRATEGIC_CONSULTING,  gross:17971.28, risk:RiskLevel.LOW,   recurring:false },
    { name:'ONLY BABY',                   serviceType:ServiceType.ECOMMERCE_MANAGEMENT, gross:7765.96,  risk:RiskLevel.LOW    },
    { name:'CASA DO PICA-PAU',            serviceType:ServiceType.ECOMMERCE_MANAGEMENT, gross:12765.96, risk:RiskLevel.LOW    },
    { name:'J7S SINALIZACAO',             serviceType:ServiceType.WEB_DEVELOPMENT,      gross:4904.00,  risk:RiskLevel.LOW,   recurring:false },
    { name:'NOVA FARMAIS FRANCHISING',    serviceType:ServiceType.CRM_AUTOMATION,        gross:8510.64,  risk:RiskLevel.LOW,   recurring:false },
    { name:'Ferragens Floresta 2',        serviceType:ServiceType.ECOMMERCE_MANAGEMENT, gross:2872.34,  risk:RiskLevel.HIGH   },
    { name:'Casa das Alianças',           serviceType:ServiceType.ECOMMERCE_MANAGEMENT, gross:2659.57,  risk:RiskLevel.HIGH   },
    { name:'Practory',                    serviceType:ServiceType.PERFORMANCE_MEDIA,    gross:12765.96, risk:RiskLevel.HIGH   },
    { name:'Benete',                      serviceType:ServiceType.ECOMMERCE_MANAGEMENT, gross:12765.96, risk:RiskLevel.MEDIUM },
  ];

  for (const c of clients) {
    const net = c.gross * 0.94;
    await prisma.client.create({ data: { companyId:company.id, name:c.name, serviceType:c.serviceType, grossRevenue:c.gross, taxRate:6, netRevenue:net, isRecurring:c.recurring!==false, totalInstallments:12, currentInstallment:2, startDate:new Date('2026-01-01'), dueDay:15, status: 'ACTIVE', riskLevel:c.risk } });
  }

  // Sample pricing
  const pricing = await prisma.pricing.create({ data: { companyId:company.id, name:'Full Service E-commerce — Exemplo', clientName:'Cliente Exemplo LTDA', status:PricingStatus.DRAFT, taxRate:15, marginRate:50, hoursPerMonth:160, totalCost:54683.94, totalSale:7752.23, notes:'Proposta baseada na planilha Almah' } });

  const items = [
    {srv:'Inbound Marketing',ppl:5,ch:38.28,pct:0,hrs:0,sort:1},
    {srv:'Performance / Mídia Paga',ppl:2,ch:54.09,pct:0.31,hrs:0,sort:2},
    {srv:'CRM / Automação',ppl:2,ch:37.44,pct:0.31,hrs:0,sort:3},
    {srv:'Comercial / SDR',ppl:2,ch:20.80,pct:0.05,hrs:0,sort:4},
    {srv:'Desenvolvimento Web',ppl:8,ch:56.17,pct:0.31,hrs:30,sort:5},
    {srv:'CRO',ppl:2,ch:46.76,pct:0,hrs:30,sort:6},
    {srv:'SEO / Conteúdo',ppl:1,ch:83.21,pct:0,hrs:25,sort:7},
    {srv:'Outsourcing',ppl:2,ch:70.73,pct:0,hrs:0,sort:8},
  ];

  for (const it of items) {
    const m=0.5,t=0.15,hpm=160;
    const fhc=it.ch*hpm, pph=it.ch*(1+m), pwt=pph*(1+t), tmc=pwt*hpm*it.ppl, pr=tmc*it.pct, sv=it.hrs*pph;
    await prisma.pricingItem.create({ data:{ companyId:company.id, pricingId:pricing.id, serviceName:it.srv, peopleCount:it.ppl, costPerHour:it.ch, projectPct:it.pct, hoursAllocated:it.hrs, fullHourCost:fhc, pricePerHour:pph, priceWithTax:pwt, teamMonthlyCost:tmc, projectRevenue:pr, saleByHour:sv, sortOrder:it.sort } });
  }

  console.log('✅ Seed concluído!');
  console.log('');
  console.log('Credenciais demo (todos com senha Demo@2026):');
  console.log('  admin@demo.com   → Proprietário (acesso total)');
  console.log('  admin2@demo.com  → Administrador');
  console.log('  gerente@demo.com → Gerente');
  console.log('  membro@demo.com  → Membro');
  console.log('  viewer@demo.com  → Visualizador (somente leitura)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
