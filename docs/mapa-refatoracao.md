# Mapa de refatoração — PersonalHub

> Fatia 0 do workflow de simplificação. Levantamento **somente leitura** do estado real do código, para guiar as fatias seguintes. Nenhum código foi alterado nesta etapa.
> Branch: `refactor/simplificacao` (a partir de `master`). Data do levantamento: estado atual do repositório.

---

## 1. Navegação real

### 1.1 Sidebar / menu principal
Fonte: `src/components/dashboard/Sidebar.tsx` (`NAV_ITEMS`, ~linha 81).

A navegação principal tem **5 itens** (não os "muitos módulos" que o plano original assumia):

| # | Label | Rota | Ícone |
|---|-------|------|-------|
| 1 | Dashboard | `/dashboard` | grid |
| 2 | Alunos | `/dashboard/alunos` | users |
| 3 | Agenda | `/dashboard/agenda` | calendar |
| 4 | Financeiro | `/dashboard/financeiro` | trending-up |
| 5 | Relatórios | `/dashboard/relatorios` | file |

Rodapé da sidebar: card de perfil → `/dashboard/configuracoes`, item **Admin** (só para `ADMIN_EMAILS`), **Configurações**, **Sair**.

A sidebar recebe `badges` (alunos / agenda / financeiro) calculados em `src/app/dashboard/layout.tsx` a partir de `getUserState()`. Os badges dependem de:
- `alunos` → `aprovacoesPendentesCount`
- `agenda` → `reposicoesUrgentesCount`
- `financeiro` → `cobrancasVencidasCount`

> **Conclusão:** a navegação **já está enxuta**. Cálculo e Cobrança **não são itens de menu** — vivem dentro do hub Financeiro (ver §2). Qualquer fatia que fale em "reduzir o menu a Dashboard/Alunos/Cálculo/Cobrança" precisa ser reinterpretada: o menu já está reduzido, e promover Cálculo/Cobrança a rotas de topo **desfaria** a consolidação em hubs.

### 1.2 Mobile
A mesma `Sidebar` serve mobile (drawer com `translate-x`); há também `TabBar` genérico (`src/components/dashboard/TabBar.tsx`) usado **dentro** dos hubs, e um `BottomTabBar`/`TabBar` por hub. Alvos de toque atuais variam — atenção ao mínimo de 48px nas fatias que mexem em navegação.

---

## 2. Hubs e suas abas (o que o plano chamava de "módulos")

A maioria dos "módulos" do plano original são **abas dentro de um hub**. As rotas standalone ainda existem como páginas, mas o acesso primário é a aba.

### 2.1 Financeiro — `src/app/dashboard/financeiro/FinanceiroHub.tsx`
`FinanceiroTab = 'calculo' | 'cobranca' | 'custos' | 'pacotes'` (`ALL_TABS`, ~linha 100). Cada aba é um chunk `dynamic()`:

| Aba | Label | Componente montado | Arquivo |
|-----|-------|--------------------|---------|
| `calculo` | Cálculo Mensal | `CalculoMensal` | `../calculo/CalculoMensal.tsx` |
| `cobranca` | Cobrança | `CobrancaMensal` | `../cobranca/CobrancaMensal.tsx` |
| `custos` | Custos e Lucro | `Financeiro` | `./Financeiro.tsx` |
| `pacotes` | Pacotes | `PacotesHub` | `../pacotes/PacotesHub.tsx` |

- A aba **Pacotes** só aparece quando há contexto de pacote (`hasPacoteContext`) — progressive disclosure (`FinanceiroHub.tsx:135-141`).
- Banner contextual de cobranças vencidas (`AlertBanner`) fora da aba cobrança (`:155`).
- Rotas standalone equivalentes ainda existem: `/dashboard/calculo`, `/dashboard/cobranca`, `/dashboard/pacotes`.

### 2.2 Alunos — `src/app/dashboard/alunos/AlunosHub.tsx`
`AlunosTab` (ver `alunos/page.tsx:106`): `'lista' | 'novo' | 'aprovacao' | 'suspensos' | 'termos'`. TabBar (`AlunosHub.tsx:156-159`):

| Aba | Label | Componente |
|-----|-------|-----------|
| `lista` | Lista | lista de alunos |
| `aprovacao` | Aprovações (n) | convites aguardando aprovação |
| `suspensos` | Suspensos | `Suspensoes` (`../suspensoes/Suspensoes`) |
| `termos` | Termos | `Termos` (`../termos/Termos`) |

- Rotas standalone: `/dashboard/suspensoes`, `/dashboard/termos` (ainda existem).
- O perfil do aluno é `/dashboard/alunos/[id]`.

### 2.3 Agenda — `src/app/dashboard/agenda/page.tsx` + `AgendaSemanal.tsx`
`AgendaTab = 'grade' | 'faltas'` (`page.tsx:101`).

| Aba | Conteúdo |
|-----|----------|
| `grade` | grade semanal de aulas (`AgendaSemanal`) |
| `faltas` | faltas/reposições (`../faltas/...`) |

- **Importante:** a página da Agenda roda `processVencidosAction()` no load (`page.tsx:3,24`) — marca faltas `pendente` vencidas como `vencida`. Esse efeito colateral está acoplado ao sistema atual de faltas (relevante na Fatia 7).
- Rota standalone: `/dashboard/faltas` (o perfil do aluno linka para ela — `alunos/[id]/page.tsx:215`).

### 2.4 Itens com rota própria (não-hub)
- **Relatórios** — `/dashboard/relatorios` (`RelatoriosHub.tsx` + `actions.ts`). Gera PDFs. Consome custos/lucro/margem e meta (ver §5).
- **Dashboard** — `/dashboard` (`DashboardHome.tsx`).
- **Configurações** — `/dashboard/configuracoes` (inclui preferências, assinatura/tema).

---

## 3. "Metas Financeiras" — morto na UI

Rastreamento completo da tabela `metas` e de `saveMetaAction`:

| Local | Uso |
|-------|-----|
| `src/app/dashboard/actions.ts:60` | `saveMetaAction(metaMensal)` → upsert em `metas` (`meta_mensal`). **Sem nenhum caller no `src`.** |
| `src/app/dashboard/relatorios/actions.ts:306-307` | lê `meta_mensal` da tabela `metas` |
| `src/app/dashboard/relatorios/actions.ts:348` | `metaLucro = Number(metaRow?.meta_mensal ?? 0)` — usado no relatório de projeção |

- **Não há tela** que salve ou exiba a meta. Não há card de metas no dashboard.
- Resíduo a remover na **Fatia 1**: a função `saveMetaAction` (código morto) + a leitura/uso de `meta_mensal` no relatório de projeção.
- A tabela `metas` **deve ser preservada** (não derrubar no beta).

> Conclusão: não existe "módulo Metas" para remover — só um action órfão e um consumidor no relatório de projeção.

---

## 4. Termos de Serviço

| Local | Uso |
|-------|-----|
| `alunos/AlunosHub.tsx:30-31, 158, 401-406` | aba `termos` (import dynamic `Termos`) |
| `alunos/termos/Termos.tsx` | componente da tela de termos |
| rota standalone `/dashboard/termos` | `termos/page.tsx` |
| `alunos/page.tsx:3` | `seedModelosIfNeeded()` roda no load (cria modelos padrão) |
| `alunos/page.tsx:68` | query `modelos_termo` |
| `alunos/page.tsx:73` | query `termos_enviados` |
| `alunos/page.tsx:106,122-123` | tab `'termos'` válida; props `modelos` + `historicoTermos` |
| `src/lib/demo/fixtures.ts` | `getDemoModelosTermo()`, `getDemoTermosEnviados()` |

**Tabelas Supabase:** `modelos_termo`, `termos_enviados` (preservar — não derrubar).

Para remover (Fatia 1) sem quebrar nada, tratar **todos** estes pontos: aba do hub, rota standalone, `seedModelosIfNeeded`, as duas queries + props em `alunos/page.tsx`, e as fixtures de demo órfãs.

---

## 5. Custos / Lucro / Margem — todos os consumidores

A redução do financeiro a "faturamento bruto" (Fatia 4) precisa tratar **todos** estes pontos, senão sobra lucro/margem em algum lugar:

| Consumidor | Onde | Observação |
|-----------|------|-----------|
| Aba "Custos e Lucro" | `financeiro/Financeiro.tsx` (lucro `:733`, margem `:733-734`, UI `:869-880`) | CRUD de custos + cálculo de lucro/margem |
| Server actions de custo | `financeiro/actions.ts` | `createCusto`, `updateCusto`, `deleteCusto`, `ensureFixosForMesAction` (replicação mensal), `getCustosForMes`, `getHistoricoFinanceiro`, `receitas_extras` |
| Relatórios | `relatorios/actions.ts:156` (`margemLucro`), `:37` (`margemLucro` no tipo); `RelatoriosHub.tsx:201` (card Margem de Lucro), `:825` (relatório p/ contador), `:874` (projeção com meta) | depende de custos + meta |
| Nudge do dashboard | `DashboardHome.tsx:554-562` (`nudges.cadastrarCustos`) | CTA "Cadastrar custos" → `?tab=custos` |
| Flag do nudge | `dashboard/page.tsx:227-231` (`cadastrarCustos` depende de `!userState.hasCustos`) | calcular flag deixa de fazer sentido |
| `getUserState` | `lib/user-state.ts:19,41,89-92,160` (`hasCustos`, query `custosCount`) | usado pela flag do nudge |
| Landing | `LandingPage.tsx:286-287, 691` | material de marketing — provavelmente fica (decidir) |

**Tabelas Supabase:** `custos`, `receitas_extras` — **preservar** (módulo pago futuro).

> Decisão a confirmar com o Gabriel (registrada no workflow): se ao remover lucro/margem/projeção o módulo **Relatórios** ficar sem valor, ele sai inteiro ou mantém só relatórios de faturamento/aulas/alunos?

---

## 6. A conta de aulas — confirmação da duplicação

**Confirmado:** `CalculoMensal.tsx` e `CobrancaMensal.tsx` contam aulas de forma **independente**, com implementações diferentes. Divergências documentadas:

| Aspecto | `CalculoMensal.tsx` | `CobrancaMensal.tsx` |
|--------|---------------------|----------------------|
| Aulas fixas | `getFixedAulas` (`:226`) usa `countWeekdaysInMonth(year,month)` (`:222`) e desconta feriados onde o aluno treina e o professor não marcou dar aula | `getAulasDates` (`:137`) faz loop dia-a-dia de 1..N, pulando `skipDays` (feriados) e filtrando pelos dias da grade |
| Feriados | desconto dentro de `getFixedAulas` via `decisoes` (`:231-236`) | `feriadoSkipDays` montado em `useEffect` (`:392-410`) e passado como `skipDays` |
| Extras (+1) | `extras[aluno.id]?.count` somado em `getCalculatedAulas` (`:243`) | `alunoExtras.count` somado em `buildMessage`/`calcTotal` (`:200,239`) |
| **Ajuste manual** | `adjustments` (estado local, `:113`) sobrescreve a contagem (`getAulas`, `:246`). **É client-only: não persiste no banco e não é lido pela Cobrança.** | **Não existe** mecanismo de ajuste. A cobrança sempre recalcula da grade. |
| Pacote | `pacoteAulas[aluno.id]` = aulas dadas no mês (eventos com `pacote_id`) (`:242`) | usa `pacoteMes.valor` direto; não conta aulas |
| Duplas | estado `duplas` separado, valor real (metade) somado fora da multiplicação (`:260`) | idem, `alunoDuplas` (`:199-200`) |

**Consequência prática (bug latente):** o número que o professor "ajusta" na aba Cálculo **não chega na Cobrança** — a Cobrança cobra a grade cheia. Isso é exatamente o que a fonte única (Fatia 6) resolve.

**Faltas NÃO subtraem aula:** uma falta (`faltas`) só afeta o valor cobrado se for resolvida como **`credito`** em dinheiro (`faltas/actions.ts:195-203` → `getCreditosPorAlunoAction` → `creditosPorAluno` na Cobrança). Faltas `pendente`/`vencida` não reduzem a contagem. Já as **aulas extras (+1)** vêm de `eventos_agenda` (`tipo='aula_extra'`) — caminho totalmente separado. Unificar "falta = -1 / extra = +1" (Fatia 7) exige reconciliar esses dois mecanismos sob a fonte única.

---

## 7. Divergências entre o plano original (v1) e o código real

| Fatia v1 | Premissa da v1 | Realidade | Ação |
|----------|----------------|-----------|------|
| 1 | "remover módulos Termos e Metas" | Termos = aba do hub Alunos; Metas = código morto (action sem caller) | mira ajustada (§3, §4) |
| 2 | "reduzir nav a 4 itens, promover Cálculo/Cobrança" | nav já tem 5 itens; Cálculo/Cobrança são abas de Financeiro | **reinterpretar**: não promover; Suspensões→perfil; fluxo via atalhos |
| 3 | "remover cards de metas/lucro/margem do dashboard" | esses cards **não existem** no dashboard | trabalho fino: atalhos + remover nudge de custos |
| 4 | "financeiro só faturamento" | correto, mas custos também alimentam **Relatórios** + nudge + user-state | **ampliar escopo** (§5) |
| 5 | histórico/notificações passivos | histórico já é timeline do perfil; ok | manter |
| opcional | "se contarem separado, unificar" | **confirmado** que contam separado e já divergem | **promover a obrigatória, antes das faltas** |
| 6 | faltas → ajuste ± | faltas hoje não subtraem aula; extras são outro fluxo | reconciliar dois mecanismos (§6) |

---

## 8. Pontos que dependem de decisão do Gabriel (não resolvidos nesta fatia)

1. **Renomear/reposicionar o hub "Financeiro"** depois da Fatia 4 (quando sobrar Cálculo + Cobrança + faturamento + Pacotes).
2. **Destino do módulo Relatórios** se esvaziar ao remover lucro/margem/projeção.
3. **Destino do "ajuste manual" do Cálculo** (Fatia 6): passa a persistir (virando ajuste de verdade, casando com a Fatia 7) ou é removido?
4. **Aulas extras vs. novo "ajuste +1"** (Fatia 7): o ajuste substitui o fluxo `eventos_agenda tipo='aula_extra'` ou passa a lê-lo também?

---

## Resumo

A navegação e o dashboard **já estão enxutos**; a maior parte do "cortar" das fatias 1–3 é menor do que o plano v1 imaginava (resíduos de Termos/Metas, um nudge órfão). O trabalho de real valor está em **(a)** reduzir o financeiro e reconciliar Relatórios (Fatia 4), e **(b)** unificar a contagem de aulas (Fatia 6) antes de transformar faltas/reposições em ajustes ± (Fatia 7) — onde está a única mudança de schema e o bug latente do ajuste que não persiste.
