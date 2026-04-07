# profitOS — Manual do Usuário

**Versão:** 2.0  
**Suporte:** suporte@profitos.com.br

---

## Índice

1. [Primeiros passos](#1-primeiros-passos)
2. [Dashboard](#2-dashboard)
3. [Clientes](#3-clientes)
4. [Precificação de projetos](#4-precificação-de-projetos)
5. [Meta de clientes](#5-meta-de-clientes)
6. [Análise de churn](#6-análise-de-churn)
7. [Perguntas do CEO](#7-perguntas-do-ceo)
8. [Simulador estratégico](#8-simulador-estratégico)
9. [Importar planilhas](#9-importar-planilhas)
10. [Configurações](#10-configurações)
11. [Filtro de período](#11-filtro-de-período)
12. [Perguntas frequentes](#12-perguntas-frequentes)

---

## 1. Primeiros passos

### Criando sua conta

1. Acesse o endereço do profitOS no seu navegador
2. Clique em **"Criar empresa"**
3. Preencha:
   - **Nome da empresa** — razão social ou nome fantasia
   - **Seu nome** — seu nome completo
   - **E-mail** — será usado para login
   - **Senha** — mínimo 8 caracteres
4. Clique em **"Criar conta grátis"**
5. Você será redirecionado para a tela de login
6. Entre com seu e-mail e senha recém-criados

> **Dica:** Ao criar a conta, você se torna **Owner** (proprietário) da empresa. Você poderá convidar outros usuários posteriormente nas Configurações.

### Fazendo login

1. Acesse a URL do profitOS
2. Digite seu e-mail e senha
3. Clique em **"Entrar"**
4. Você será levado diretamente ao Dashboard

**Esqueceu a senha?** Clique em "Esqueceu a senha?" na tela de login e insira seu e-mail para receber um link de redefinição.

---

## 2. Dashboard

O Dashboard é a tela principal do profitOS. Ele mostra um panorama completo da saúde financeira da sua empresa em tempo real, com base nos clientes cadastrados.

### O que você vê no dashboard

**Linha 1 — Resultado do período:**
| Card | O que significa |
|------|-----------------|
| Entradas (período) | Soma da receita líquida de todos os clientes ativos, multiplicada pelos meses do período selecionado |
| Saídas (período) | Custos totais lançados no período |
| Resultado (período) | Entradas menos Saídas. Verde = lucro, Vermelho = déficit |
| Ticket médio líquido | Receita líquida média por cliente ativo/mês |

**Linha 2 — Indicadores de saúde:**
| Card | O que significa |
|------|-----------------|
| Receita bruta/mês | Valor emitido nas notas fiscais (antes de descontar impostos) |
| Folha PJ / saídas | % que a folha de PJ representa nas saídas totais. Acima de 50%: atenção |
| Clientes ativos | Quantos clientes estão com status "Ativo" |
| Receita recorrente | Soma dos clientes com contrato recorrente — é a base garantida do mês |

**Alertas automáticos:** O sistema identifica automaticamente situações críticas (déficit, clientes em risco) e exibe alertas coloridos.

**Gráficos:**
- **Receita por cliente:** ranking visual dos 6 maiores clientes
- **Clientes em risco:** lista com os clientes de risco Alto ou Crítico

**Atalhos rápidos:** Na parte inferior do dashboard, 4 botões de acesso rápido para as ações mais comuns (novo cliente, nova precificação, metas, simulador).

### Como mudar o período

Use os botões no topo da tela:

| Botão | Período |
|-------|---------|
| 90 dias | Visão trimestral |
| 6 meses | Visão semestral |
| 1 ano | Visão anual |
| 2 anos | Visão bienal |

O período selecionado afeta o Dashboard, a Meta de Clientes, a Análise de Churn, as Perguntas do CEO e o Simulador.

---

## 3. Clientes

Aqui você cadastra, edita e gerencia todos os seus clientes. Cada cliente adicionado é automaticamente integrado em todas as análises e relatórios da ferramenta.

### Cadastrando um novo cliente

Clique em **"+ Novo cliente"** no topo da tela. Preencha os campos:

**Identificação:**
- **Nome do cliente** *(obrigatório)* — razão social ou nome fantasia
- **CNPJ / CPF** — documento do cliente
- **E-mail** — contato financeiro
- **Telefone** — contato do cliente

**Dados do serviço:**
- **Tipo de serviço** *(obrigatório)* — selecione o serviço prestado:
  - Gestão de E-commerce, Performance / Mídia Paga, SEO / Conteúdo, Desenvolvimento Web, CRM / Automação, Consultoria Estratégica, Social Media, Design / UX, BPO Financeiro, Outsourcing, Outros

**Dados financeiros:**
- **Faturamento bruto (R$)** *(obrigatório)* — valor emitido na nota fiscal
- **Alíquota de imposto (%)** — padrão 6% (Simples Nacional). O sistema deduz automaticamente
- **Valor líquido** — calculado automaticamente conforme você digita
- **Status** — Ativo, Prospect, Inativo ou Churned

**Dados do contrato:**
- **Tipo de contrato** — Recorrente (mensalidade) ou Pontual (projeto único)
- **Total de parcelas** — para contratos recorrentes (0 = sem prazo definido)
- **Parcela atual** — em qual mês do contrato estamos
- **Dia de vencimento** — dia do mês em que vence (ex: 5)

**Outros:**
- **Data de início** — quando o contrato começou
- **Nível de risco** — avaliação interna: Baixo, Médio, Alto ou Crítico
- **Observações** — notas internas sobre o cliente

**Prévia financeira:** Conforme você preenche o faturamento e o imposto, uma caixa verde mostra em tempo real:
- Faturamento bruto/mês
- Imposto mensal
- Receita líquida/mês (o que entra no caixa)
- Total do contrato (parcelas × líquido)

Clique em **"Adicionar cliente"** para salvar. O cliente será imediatamente integrado no Dashboard, na Meta de Clientes, no Churn e nas Perguntas do CEO.

### Editando um cliente

Na tabela de clientes, clique em **"Editar"** na linha do cliente desejado. Faça as alterações e clique em **"Salvar alterações"**.

### Removendo um cliente

Clique em **"Remover"** na linha do cliente. Uma confirmação será exibida. Após confirmação, o cliente e seus dados são removidos permanentemente.

### Filtrando e buscando clientes

- **Busca:** Digite na barra de busca para filtrar por nome
- **Filtros rápidos:** Todos / Ativos / Prospects / Churned
- **Status de risco:** A coluna "Risco" mostra o nível em cores (verde, laranja, vermelho)

### Entendendo a tabela

| Coluna | Descrição |
|--------|-----------|
| Cliente | Nome e e-mail |
| Serviço | Tipo de serviço prestado |
| Bruto/mês | Valor da nota fiscal |
| Imposto | Dedução de imposto (com a %) |
| Líquido/mês | O que entra no caixa |
| Contrato | Recorrente ou Pontual, parcela atual e dia de vencimento |
| Status | Ativo, Prospect, Inativo, Churned |
| Risco | Baixo (verde), Médio (laranja), Alto/Crítico (vermelho) |

**Rodapé da tabela:** Mostra os totais de bruto, imposto e líquido de todos os clientes exibidos.

---

## 4. Precificação de projetos

Este módulo calcula o valor de venda de projetos com base no custo da sua equipe, margem desejada e impostos. A lógica é baseada na planilha de precificação da Almah.

### Como funciona a calculadora

A precificação segue esta lógica:

```
Custo/hora × (1 + Margem%) = Preço de venda/hora
Preço de venda/hora × (1 + Imposto%) = Preço com imposto
Preço com imposto × Horas/mês × N.º pessoas = Custo do time/mês
```

Para calcular o valor do projeto, há duas abordagens:
- **Por % de projeto:** `Custo time/mês × % do projeto dedicado ao cliente`
- **Por horas alocadas:** `Horas alocadas × Preço de venda/hora`

### Criando uma precificação

1. Clique em **"+ Nova precificação"** (botão no topo ou na lista)
2. Preencha os dados da proposta:
   - **Nome da proposta** — ex: "Full Service E-commerce — Cliente XYZ"
   - **Nome do cliente** — para quem é a proposta
   - **Margem de lucro** — percentual de margem desejado (padrão: 50%)
   - **Imposto sobre venda** — percentual de ISS + outros (padrão: 15%)
   - **Horas mensais base** — quantas horas cada pessoa trabalha por mês (padrão: 160h)

3. **Adicione os serviços do time:**  
   Clique em **"Adicionar serviço"** para incluir cada serviço. Para cada linha:
   - **Serviço** — tipo de serviço (ex: Inbound Marketing, Performance, CRO)
   - **N.º pessoas** — quantas pessoas daquele serviço
   - **Custo/h (R$)** — custo médio por hora daquele profissional
   - **% projeto** — que percentual do tempo desse time é dedicado a este cliente/projeto (0,31 = 31%)
   - **Hrs alocadas** — horas específicas alocadas (para venda por hora)

4. O sistema calcula automaticamente:
   - **Custo 160h** — custo mensal cheio (custo/h × horas/mês)
   - **Preço/h** — com a margem aplicada
   - **Com imposto** — preço/h incluindo o imposto
   - **Custo time/mês** — custo total do time daquele serviço
   - **Vr. hr. proj.** — valor do projeto por esse serviço (via % projeto)
   - **Valor venda** — valor a cobrar por horas alocadas

5. **Totais:** A linha de totais mostra:
   - **Custo total do time** — soma de todos os custo time/mês
   - **Receita por projeto** — soma de todos os valores por % projeto
   - **Venda por hora** — soma de todos os valores por hora alocada
   - **Imposto sobre projeto** — imposto calculado sobre a receita por projeto

6. Adicione **Observações** (condições comerciais, prazo de validade, escopo)
7. Clique em **"Salvar precificação"**

### Editando e gerenciando propostas

Na lista de precificações, você pode:
- **Editar** — abre o editor com todos os dados preenchidos
- **Excluir** — remove a proposta permanentemente

O status da proposta (Rascunho, Enviado, Aprovado, Rejeitado, Expirado) é exibido como etiqueta colorida.

### Exemplo prático

**Cenário:** Você tem um time de Performance com 2 pessoas, cada uma custando R$ 54/h. O cliente representa 31% do trabalho do time. Nenhuma hora avulsa.

| Campo | Valor |
|-------|-------|
| Serviço | Performance / Mídia Paga |
| N.º pessoas | 2 |
| Custo/h | R$ 54,09 |
| % projeto | 0,31 |
| Hrs alocadas | 0 |

Com margem 50% e imposto 15%:
- Preço/h = R$ 54,09 × 1,50 = R$ 81,14
- Com imposto = R$ 81,14 × 1,15 = R$ 93,31
- Custo time/mês = R$ 93,31 × 160h × 2 pessoas = R$ 29.859
- Valor do projeto = R$ 29.859 × 31% = **R$ 9.256**

---

## 5. Meta de clientes

Esta tela responde: **"Quantos clientes preciso ter para atingir minha meta financeira?"**

### Como usar

**Campos editáveis:**
- **Custo fixo mensal (R$)** — seus custos mensais totais (ex: R$ 241.856)
- **Margem de lucro alvo (%)** — a margem que você quer atingir (ex: 20%)
- **Ticket médio por cliente (R$)** — receita líquida média por cliente (calculado automaticamente com base na sua carteira)

**O sistema calcula:**
- **Receita necessária/mês** — quanto precisa faturar para cobrir custos + margem
- **Receita necessária no período** — o mesmo, mas para o período selecionado (90d, 6m, 1a ou 2a)
- **Clientes necessários** — quantos clientes com aquele ticket para atingir a meta
- **Novos a captar** — diferença entre a meta e a carteira atual
- **Gap mensal** — quanto falta de receita hoje

**Gráfico de cenários:** Mostra quantos clientes seriam necessários para diferentes tickets (R$ 5k, R$ 8k, R$ 10k, R$ 15k, R$ 20k, R$ 30k).

**Ranking de clientes:** Visualize seus clientes atuais ordenados por receita para entender a distribuição.

---

## 6. Análise de churn

Esta tela simula o impacto financeiro de diferentes taxas de cancelamento de clientes.

### Como usar

**Campos editáveis:**
- **Taxa de churn mensal (%)** — quantos clientes você perde por mês em percentual
  - Saudável: abaixo de 3%
  - Atenção: entre 3% e 8%
  - Crítico: acima de 10%
- **Clientes na carteira** — número atual (preenchido automaticamente)
- **Ticket médio líquido (R$)** — receita média por cliente (preenchido automaticamente)

**O sistema projeta:**
- Clientes perdidos por mês
- Receita perdida por mês
- Clientes no período selecionado
- Receita no período selecionado
- LTV (Lifetime Value) médio com essa taxa de churn

**Alertas de risco:** Lista os clientes cadastrados com nível de risco Alto ou Crítico — são os candidatos mais prováveis a cancelar.

**Dica:** O LTV é calculado como `ticket médio ÷ taxa de churn`. Com 5% de churn e ticket de R$ 9.835, o LTV médio é de R$ 196.700 — ou seja, cada cliente vale quase R$ 197 mil ao longo do relacionamento.

---

## 7. Perguntas do CEO

Quatro perguntas estratégicas respondidas automaticamente com base nos seus dados reais.

### As perguntas

**1. Posso contratar agora?**  
O sistema analisa o resultado atual, a folha como % das saídas e o número de clientes necessários para cobrir uma nova contratação antes de recomendar contratar.

**2. Posso fazer um investimento?**  
Analisa o resultado atual e calcula o teto seguro de investimento no período selecionado, considerando o retorno esperado.

**3. Vou ficar sem dinheiro?**  
Alerta sobre o risco de caixa zerado com base no déficit mensal e no impacto acumulado no período. Lista clientes em risco e ações urgentes.

**4. Onde estou errando?**  
Aponta os 3 principais gargalos financeiros: proporção da folha PJ, concentração de receita em poucos clientes e ticket médio abaixo do necessário.

Cada resposta muda conforme o período selecionado (90d / 6m / 1a / 2a) e conforme novos clientes são adicionados.

---

## 8. Simulador estratégico

Simule o impacto financeiro de decisões antes de tomá-las.

### Cenários disponíveis

**Contratar**
- Informe o salário/honorário mensal e o tipo (PJ ou CLT)
- Selecione o mês em que a contratação ocorre
- O sistema calcula o custo real (PJ +15% de encargos, CLT +70%) e o impacto no resultado
- Mostra quantos clientes adicionais seriam necessários para cobrir o custo

**Demitir**
- Informe o honorário e o tipo de contrato
- Selecione os meses de aviso/transição
- O sistema calcula a economia mensal, o custo do período de aviso e quando o caixa volta ao equilíbrio

**Perder cliente**
- Selecione um cliente cadastrado (o valor é preenchido automaticamente) ou digite manualmente
- Informe em qual mês a perda ocorre
- O sistema mostra o impacto em % da receita e quantos novos clientes seriam necessários para compensar

**Investimento**
- Informe o valor do investimento e o retorno mensal esperado
- O sistema calcula payback, ROI no período e se o investimento é viável com o caixa atual

**Crescimento**
- Informe quantos novos clientes e o ticket médio deles
- O sistema mostra a receita adicional, o novo resultado mensal e a margem projetada

### Gráfico de impacto

Ao preencher qualquer cenário, o gráfico mostra a comparação entre o cenário atual (linha verde sólida) e o cenário simulado (linha vermelha tracejada) ao longo dos meses do período selecionado.

---

## 9. Importar planilhas

Importe extratos bancários e planilhas de contas a pagar/receber de outros sistemas.

### Formatos suportados

- **Excel:** `.xlsx` e `.xls`
- **CSV:** `.csv`

### Como importar

1. Clique na área de upload do tipo desejado (Contas a Pagar ou Contas a Receber)
2. Arraste o arquivo até a área ou clique para selecionar
3. O sistema detecta automaticamente as colunas comuns:
   - **Data:** DATA_VENCIMENTO, data_venc, dt, date
   - **Valor:** VALOR_LIQUIDO, vlr, amount, total
   - **Descrição:** HISTORICO, descricao, memo, obs
   - **Tipo:** tipo, natureza, D/C, entrada/saída

### Colunas suportadas automaticamente

O parser reconhece os formatos mais comuns de extratos bancários e ERPs brasileiros:
- OFX/Extrato bancário
- Exportação do Conta Azul
- Exportação do Omie
- Exportação do ERP Totvs
- Planilhas manuais no padrão descrito

### Dicas para importação bem-sucedida

1. Certifique-se que a primeira linha da planilha é o cabeçalho
2. Valores devem estar em formato numérico (sem R$ ou ponto para milhar)
3. Datas preferencialmente no formato DD/MM/AAAA ou AAAA-MM-DD
4. Para separar receitas de despesas, use uma coluna "Tipo" com valores "C/D" ou "entrada/saída"

---

## 10. Configurações

Acesse clicando no seu nome no canto superior direito → Configurações.

### Minha conta

- **Nome:** seu nome cadastrado
- **E-mail:** e-mail de login
- **Função:** seu nível de acesso (Owner, Admin, Membro, Visualizador)
- **Sair da conta:** encerra a sessão

### Empresa

- **Nome da empresa:** nome cadastrado no registro
- **Plano atual:** seu plano (Gratuito, Starter, Pro, Agency)

### Parâmetros padrão

Estes valores são usados como padrão ao cadastrar novos clientes e precificações:
- Alíquota de imposto: 6% (Simples Nacional)
- Margem padrão: 50%
- Horas mensais: 160h
- Fuso horário: America/Sao_Paulo

---

## 11. Filtro de período

O filtro de período (90 dias / 6 meses / 1 ano / 2 anos) fica no topo de todas as telas de análise e afeta:

| Tela | O que muda |
|------|-----------|
| Dashboard | KPIs e gráfico se escalam para o período |
| Meta de clientes | Gap de receita calculado para o período |
| Análise de churn | Projeção de clientes e receita no período |
| Perguntas do CEO | Respostas citam o impacto acumulado no período |
| Simulador | Gráfico projeta até o período (máx. 12 meses) |

**Como usar:** Basta clicar no botão do período desejado. A tela atualiza instantaneamente.

---

## 12. Perguntas frequentes

**Como adiciono outros usuários da minha equipe?**  
Atualmente o convite de usuários está disponível no plano Pro e acima. Acesse Configurações → Usuários → Convidar. O novo usuário receberá um e-mail para criar sua senha.

**Os dados são salvos em tempo real?**  
Sim. Cada alteração (novo cliente, nova precificação, etc.) é salva imediatamente no banco de dados. Não é necessário clicar em "salvar" manual — exceto nos formulários de cadastro.

**Posso usar o profitOS em mais de uma empresa?**  
Cada conta está vinculada a uma empresa. Para gerenciar múltiplas empresas, crie uma conta para cada uma ou entre em contato para planos Agency.

**O que significa o nível de risco do cliente?**  
É uma avaliação interna que você define ao cadastrar o cliente:
- **Baixo** — cliente estável, pagamento em dia, sem sinais de cancelamento
- **Médio** — alguma atenção necessária (atraso esporádico, contrato próximo do fim)
- **Alto** — risco concreto de cancelamento ou inadimplência
- **Crítico** — iminência de churn ou inadimplência grave

Clientes de risco Alto e Crítico aparecem nos alertas do Dashboard e na Análise de Churn.

**Como funciona o cálculo de imposto?**  
O imposto é calculado como `valorBruto × (percentualImposto / 100)`. O valor líquido é `valorBruto × (1 - percentualImposto / 100)`. O padrão é 6% (Simples Nacional), mas você pode ajustar por cliente.

**Posso importar minha planilha de controle atual?**  
Sim, desde que esteja em formato .xlsx, .xls ou .csv. O sistema detecta automaticamente as colunas mais comuns. Se sua planilha usar nomes de coluna personalizados, mapeie-os para os padrões listados na tela de Importar.

**Meus dados são privados?**  
Sim. Todos os dados são isolados por empresa (multi-tenant). Nenhum usuário de outra empresa pode acessar seus dados. O acesso é protegido por autenticação JWT com expiração de 30 dias.

**Como cancelar minha conta?**  
Entre em contato pelo suporte@profitos.com.br. Seus dados ficam disponíveis por 30 dias após o cancelamento para exportação.
