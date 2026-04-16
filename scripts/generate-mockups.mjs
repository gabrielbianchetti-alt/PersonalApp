import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'public', 'mockups')
fs.mkdirSync(OUT, { recursive: true })

// ─── palette ────────────────────────────────────────────────────────────────
const BG     = '#1B1B1B'
const CARD   = '#323232'
const TEXT   = '#FFFFFF'
const SEC    = '#FFE7D0'
const ACC    = '#FC6E20'
const BORDER = '#444444'
const GREEN  = '#4CAF50'
const RED    = '#FF5252'
const YELLOW = '#FFB800'

// ─── shared HTML fragments ───────────────────────────────────────────────────
const ISLAND = `<div style="width:126px;height:37px;background:#000;border-radius:20px;position:absolute;top:10px;left:132px;z-index:100;"></div>`

const STATUS = `
<div style="position:absolute;top:0;left:0;right:0;height:54px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 28px 8px;z-index:99;">
  <span style="color:#fff;font-size:15px;font-weight:600;letter-spacing:-0.3px;">9:41</span>
  <div style="display:flex;align-items:center;gap:5px;">
    <svg width="17" height="11" viewBox="0 0 17 11" fill="#fff"><rect x="0" y="2" width="3" height="9" rx="1"/><rect x="4.5" y="1" width="3" height="10" rx="1"/><rect x="9" y="0" width="3" height="11" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1" opacity=".3"/></svg>
    <svg width="15" height="11" viewBox="0 0 15 11" fill="#fff"><path d="M7.5 1.8A6.5 6.5 0 0 1 12 3.8l1.2-1.2A8.2 8.2 0 0 0 7.5.3a8.2 8.2 0 0 0-5.7 2.3L3 3.8A6.5 6.5 0 0 1 7.5 1.8z"/><path d="M7.5 4.8a3.5 3.5 0 0 1 2.5 1l1.2-1.2a5.3 5.3 0 0 0-3.7-1.5 5.3 5.3 0 0 0-3.7 1.5L5 5.8a3.5 3.5 0 0 1 2.5-1z"/><circle cx="7.5" cy="9" r="1.5"/></svg>
    <div style="display:flex;align-items:center;">
      <div style="width:24px;height:12px;border:1.5px solid rgba(255,255,255,0.35);border-radius:3px;padding:1.5px;display:flex;align-items:center;">
        <div style="width:80%;height:100%;background:#fff;border-radius:1.5px;"></div>
      </div>
      <div style="width:2px;height:5px;background:rgba(255,255,255,0.35);border-radius:0 1px 1px 0;margin-left:1px;"></div>
    </div>
  </div>
</div>`

const HOME = `<div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:134px;height:5px;background:rgba(255,255,255,0.28);border-radius:3px;"></div>`

const NAV = `
<div style="padding:58px 20px 12px;display:flex;align-items:center;justify-content:space-between;">
  <div style="display:flex;align-items:center;gap:10px;">
    <div style="width:38px;height:38px;background:${ACC};border-radius:11px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;letter-spacing:-0.5px;">PH</div>
    <span style="color:#fff;font-weight:700;font-size:17px;letter-spacing:-0.3px;">PersonalHub</span>
  </div>
  <div style="width:36px;height:36px;background:${CARD};border-radius:10px;display:flex;align-items:center;justify-content:center;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${SEC}" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  </div>
</div>`

function wrap(body) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { width:390px; height:844px; overflow:hidden; background:${BG}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif; color:${TEXT}; position:relative; -webkit-font-smoothing:antialiased; }
::-webkit-scrollbar { display:none; }
</style></head><body>
${ISLAND}${STATUS}${body}${HOME}
</body></html>`
}

// ─── MOCKUP 1: DASHBOARD ────────────────────────────────────────────────────
const m1 = wrap(`
${NAV}
<div style="padding:0 20px 0;overflow:hidden;">
  <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px;">
    <span style="font-size:38px;font-weight:800;color:${ACC};letter-spacing:-1.5px;line-height:1;">12 Fev</span>
    <span style="font-size:38px;font-weight:800;color:${TEXT};letter-spacing:-1.5px;line-height:1;">08:32</span>
  </div>

  <div style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:30px;height:30px;background:rgba(252,110,32,.15);border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${ACC}" stroke-width="2.2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
      </div>
      <span style="color:${SEC};font-size:13px;font-weight:600;">3 alunos novos este mês</span>
    </div>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${SEC}" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
  </div>

  <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;">
    <span style="font-size:16px;font-weight:700;">Bom dia, Professor! 👋</span>
    <span style="color:${ACC};font-size:13px;font-weight:600;">· 5 aulas hoje</span>
  </div>

  <div style="background:${CARD};border:1px solid ${BORDER};border-radius:18px;padding:4px 16px;margin-bottom:14px;">
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #3a3a3a;opacity:.45;">
      <span style="color:${SEC};font-size:13px;font-weight:600;min-width:40px;">06:00</span>
      <div style="flex:1;"><div style="font-size:14px;font-weight:600;text-decoration:line-through;color:#aaa;">Ana Silva</div><div style="font-size:11px;color:#666;margin-top:1px;">Academia</div></div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #3a3a3a;opacity:.45;">
      <span style="color:${SEC};font-size:13px;font-weight:600;min-width:40px;">07:00</span>
      <div style="flex:1;"><div style="font-size:14px;font-weight:600;text-decoration:line-through;color:#aaa;">Pedro Costa</div><div style="font-size:11px;color:#666;margin-top:1px;">Domicílio</div></div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #3a3a3a;">
      <span style="color:${ACC};font-size:13px;font-weight:700;min-width:40px;">08:00</span>
      <div style="flex:1;"><div style="font-size:15px;font-weight:700;">Lucas Mendes</div><div style="font-size:11px;color:#888;margin-top:1px;">Academia</div></div>
      <div style="background:${ACC};color:#fff;font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;letter-spacing:.5px;white-space:nowrap;">PRÓXIMA</div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #3a3a3a;">
      <span style="color:${SEC};font-size:13px;font-weight:600;min-width:40px;">09:00</span>
      <div style="flex:1;"><div style="font-size:14px;font-weight:600;">Marina Santos</div><div style="font-size:11px;color:#888;margin-top:1px;">Academia</div></div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;">
      <span style="color:${SEC};font-size:13px;font-weight:600;min-width:40px;">10:00</span>
      <div style="flex:1;"><div style="font-size:14px;font-weight:600;">Rafael Lima</div><div style="font-size:11px;color:#888;margin-top:1px;">Academia</div></div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
    <div style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:14px;">
      <div style="font-size:10px;color:#888;margin-bottom:4px;font-weight:500;text-transform:uppercase;letter-spacing:.5px;">Alunos ativos</div>
      <div style="font-size:36px;font-weight:800;color:${ACC};letter-spacing:-1px;line-height:1;">8</div>
    </div>
    <div style="background:rgba(252,110,32,.12);border:1px solid rgba(252,110,32,.3);border-radius:16px;padding:14px;">
      <div style="font-size:10px;color:${ACC};margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Faturamento</div>
      <div style="font-size:19px;font-weight:800;color:${ACC};letter-spacing:-.5px;line-height:1.1;">R$ 7.850,00</div>
      <div style="font-size:10px;color:rgba(252,110,32,.7);margin-top:4px;">faturamento · Fev</div>
    </div>
  </div>
</div>`)

// ─── MOCKUP 2: AGENDA SEMANAL ───────────────────────────────────────────────
const m2 = wrap(`
${NAV}
<div style="padding:0 20px;overflow:hidden;">
  <div style="font-size:22px;font-weight:800;margin-bottom:14px;">Agenda</div>

  <div style="display:flex;gap:0;margin-bottom:14px;border-bottom:1px solid ${BORDER};">
    <div style="padding:8px 0 10px;margin-right:20px;border-bottom:2px solid ${ACC};"><span style="color:${ACC};font-weight:700;font-size:14px;">Grade Semanal</span></div>
    <div style="padding:8px 0 10px;"><span style="color:#666;font-weight:600;font-size:14px;">Registros</span></div>
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
    <div>
      <div style="font-size:17px;font-weight:700;">Agenda</div>
      <div style="font-size:12px;color:#888;margin-top:1px;">Semana 10/02 — 15/02</div>
    </div>
    <div style="display:flex;gap:6px;align-items:center;">
      <div style="background:${CARD};border:1px solid ${BORDER};width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </div>
      <div style="background:${CARD};border:1px solid ${BORDER};padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;">Hoje</div>
    </div>
  </div>

  <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;flex-wrap:wrap;">
    <div style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;background:${GREEN};border-radius:50%;display:inline-block;"></span><span style="font-size:10px;color:#888;">Aula</span></div>
    <div style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;background:${RED};border-radius:50%;display:inline-block;"></span><span style="font-size:10px;color:#888;">Aluno faltou</span></div>
    <div style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;background:${ACC};border-radius:50%;display:inline-block;"></span><span style="font-size:10px;color:#888;">Cancelamento</span></div>
  </div>

  <div style="display:flex;gap:4px;margin-bottom:10px;">
    <div style="padding:5px 12px;border-radius:8px;font-size:12px;font-weight:600;color:#888;background:${CARD};">Dia</div>
    <div style="padding:5px 14px;border-radius:8px;font-size:12px;font-weight:700;color:#fff;background:${ACC};">Semana</div>
  </div>

  <!-- Grid -->
  <div style="display:grid;grid-template-columns:36px repeat(5,1fr);gap:3px;font-size:10px;">
    <!-- Headers -->
    <div></div>
    <div style="text-align:center;padding:4px 0;"><div style="color:#888;">Seg</div><div style="font-weight:700;font-size:13px;">10</div></div>
    <div style="text-align:center;padding:4px 0;"><div style="color:#888;">Ter</div><div style="font-weight:700;font-size:13px;">11</div></div>
    <div style="text-align:center;padding:4px 0;"><div style="color:#888;">Qua</div><div style="font-weight:700;font-size:13px;color:${ACC};">12</div></div>
    <div style="text-align:center;padding:4px 0;"><div style="color:#888;">Qui</div><div style="font-weight:700;font-size:13px;">13</div></div>
    <div style="text-align:center;padding:4px 0;"><div style="color:#888;">Sex</div><div style="font-weight:700;font-size:13px;">14</div></div>

    <!-- 06:00 row -->
    <div style="color:#555;font-size:9px;padding-top:6px;text-align:right;padding-right:4px;">06:00</div>
    <div style="height:52px;padding:2px;">
      <div style="background:rgba(76,175,80,.2);border-left:3px solid ${GREEN};border-radius:5px;height:100%;padding:4px 5px;">
        <div style="color:${GREEN};font-size:10px;font-weight:700;line-height:1.2;">Ana</div>
        <div style="color:#666;font-size:9px;">06:00</div>
      </div>
    </div>
    <div style="height:52px;padding:2px;">
      <div style="background:rgba(76,175,80,.2);border-left:3px solid ${GREEN};border-radius:5px;height:100%;padding:4px 5px;">
        <div style="color:${GREEN};font-size:10px;font-weight:700;line-height:1.2;">Pedro</div>
        <div style="color:#666;font-size:9px;">06:00</div>
      </div>
    </div>
    <div style="height:52px;padding:2px;">
      <div style="background:rgba(255,82,82,.18);border-left:3px solid ${RED};border-radius:5px;height:100%;padding:4px 5px;">
        <div style="color:${RED};font-size:10px;font-weight:700;line-height:1.2;">Ana</div>
        <div style="color:#666;font-size:9px;">06:00</div>
      </div>
    </div>
    <div style="height:52px;padding:2px;">
      <div style="background:rgba(76,175,80,.2);border-left:3px solid ${GREEN};border-radius:5px;height:100%;padding:4px 5px;">
        <div style="color:${GREEN};font-size:10px;font-weight:700;line-height:1.2;">Lucas</div>
        <div style="color:#666;font-size:9px;">06:00</div>
      </div>
    </div>
    <div style="height:52px;padding:2px;">
      <div style="background:rgba(76,175,80,.2);border-left:3px solid ${GREEN};border-radius:5px;height:100%;padding:4px 5px;">
        <div style="color:${GREEN};font-size:10px;font-weight:700;line-height:1.2;">Ana</div>
        <div style="color:#666;font-size:9px;">06:00</div>
      </div>
    </div>

    <!-- 07:00 row -->
    <div style="color:#555;font-size:9px;padding-top:6px;text-align:right;padding-right:4px;">07:00</div>
    <div style="height:52px;padding:2px;">
      <div style="background:rgba(76,175,80,.2);border-left:3px solid ${GREEN};border-radius:5px;height:100%;padding:4px 5px;">
        <div style="color:${GREEN};font-size:10px;font-weight:700;line-height:1.2;">Pedro</div>
        <div style="color:#666;font-size:9px;">07:00</div>
      </div>
    </div>
    <div style="height:52px;"></div>
    <div style="height:52px;padding:2px;">
      <div style="background:rgba(76,175,80,.2);border-left:3px solid ${GREEN};border-radius:5px;height:100%;padding:4px 5px;">
        <div style="color:${GREEN};font-size:10px;font-weight:700;line-height:1.2;">Marina</div>
        <div style="color:#666;font-size:9px;">07:00</div>
      </div>
    </div>
    <div style="height:52px;padding:2px;">
      <div style="background:rgba(252,110,32,.2);border-left:3px solid ${ACC};border-radius:5px;height:100%;padding:4px 5px;">
        <div style="color:${ACC};font-size:10px;font-weight:700;line-height:1.2;">Avulsa</div>
        <div style="color:#666;font-size:9px;">07:30</div>
      </div>
    </div>
    <div style="height:52px;padding:2px;">
      <div style="background:rgba(76,175,80,.2);border-left:3px solid ${GREEN};border-radius:5px;height:100%;padding:4px 5px;">
        <div style="color:${GREEN};font-size:10px;font-weight:700;line-height:1.2;">Rafael</div>
        <div style="color:#666;font-size:9px;">07:00</div>
      </div>
    </div>

    <!-- 08:00 row -->
    <div style="color:#555;font-size:9px;padding-top:6px;text-align:right;padding-right:4px;">08:00</div>
    <div style="height:52px;padding:2px;">
      <div style="background:rgba(76,175,80,.2);border-left:3px solid ${GREEN};border-radius:5px;height:100%;padding:4px 5px;">
        <div style="color:${GREEN};font-size:10px;font-weight:700;line-height:1.2;">Lucas</div>
        <div style="color:#666;font-size:9px;">08:00</div>
      </div>
    </div>
    <div style="height:52px;padding:2px;">
      <div style="background:rgba(76,175,80,.2);border-left:3px solid ${GREEN};border-radius:5px;height:100%;padding:4px 5px;">
        <div style="color:${GREEN};font-size:10px;font-weight:700;line-height:1.2;">Carla</div>
        <div style="color:#666;font-size:9px;">08:15</div>
      </div>
    </div>
    <div style="height:52px;padding:2px;">
      <div style="background:rgba(76,175,80,.2);border-left:3px solid ${GREEN};border-radius:5px;height:100%;padding:4px 5px;">
        <div style="color:${GREEN};font-size:10px;font-weight:700;line-height:1.2;">Pedro</div>
        <div style="color:#666;font-size:9px;">08:00</div>
      </div>
    </div>
    <div style="height:52px;padding:2px;">
      <div style="background:rgba(76,175,80,.2);border-left:3px solid ${GREEN};border-radius:5px;height:100%;padding:4px 5px;">
        <div style="color:${GREEN};font-size:10px;font-weight:700;line-height:1.2;">Rafael</div>
        <div style="color:#666;font-size:9px;">08:00</div>
      </div>
    </div>
    <div style="height:52px;"></div>
  </div>
</div>`)

// ─── MOCKUP 3: CÁLCULO MENSAL ───────────────────────────────────────────────
const m3 = wrap(`
${NAV}
<div style="padding:0 20px;overflow:hidden;">
  <div style="font-size:22px;font-weight:800;margin-bottom:10px;">Financeiro</div>

  <div style="display:flex;gap:0;margin-bottom:14px;border-bottom:1px solid ${BORDER};">
    <div style="padding:7px 0 9px;margin-right:16px;border-bottom:2px solid ${ACC};"><span style="color:${ACC};font-weight:700;font-size:12px;">Cálculo Mensal</span></div>
    <div style="padding:7px 0 9px;margin-right:16px;"><span style="color:#666;font-size:12px;font-weight:600;">Cobrança</span></div>
    <div style="padding:7px 0 9px;"><span style="color:#666;font-size:12px;font-weight:600;">Custos e Lucro</span></div>
  </div>

  <div style="margin-bottom:14px;">
    <div style="font-size:17px;font-weight:800;">Cálculo Mensal</div>
    <div style="font-size:11px;color:#888;margin-top:2px;">Número exato de aulas e faturamento por aluno</div>
  </div>

  <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:14px;">
    <div style="width:32px;height:32px;background:${CARD};border:1px solid ${BORDER};border-radius:10px;display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${TEXT}" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
    </div>
    <div style="text-align:center;">
      <div style="font-size:20px;font-weight:800;letter-spacing:-.5px;">Fevereiro</div>
      <div style="font-size:12px;color:#888;">2026</div>
    </div>
    <div style="width:32px;height:32px;background:${CARD};border:1px solid ${BORDER};border-radius:10px;display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${TEXT}" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  </div>

  <div style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:12px 16px;margin-bottom:12px;display:grid;grid-template-columns:repeat(7,1fr);text-align:center;gap:4px;">
    <div><div style="font-size:9px;color:#888;">Seg</div><div style="font-size:13px;font-weight:700;color:${ACC};">4</div></div>
    <div><div style="font-size:9px;color:#888;">Ter</div><div style="font-size:13px;font-weight:700;color:${ACC};">4</div></div>
    <div><div style="font-size:9px;color:#888;">Qua</div><div style="font-size:13px;font-weight:700;color:${ACC};">4</div></div>
    <div><div style="font-size:9px;color:#888;">Qui</div><div style="font-size:13px;font-weight:700;color:${ACC};">4</div></div>
    <div><div style="font-size:9px;color:#888;">Sex</div><div style="font-size:13px;font-weight:700;color:${ACC};">4</div></div>
    <div><div style="font-size:9px;color:#888;">Sáb</div><div style="font-size:13px;font-weight:700;color:${ACC};">4</div></div>
    <div><div style="font-size:9px;color:#888;">Dom</div><div style="font-size:13px;font-weight:700;color:${ACC};">4</div></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
    <div style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:14px;">
      <div style="font-size:10px;color:#888;margin-bottom:6px;">Total de aulas</div>
      <div style="font-size:34px;font-weight:800;letter-spacing:-1px;color:${TEXT};line-height:1;">84</div>
      <div style="font-size:10px;color:#666;margin-top:4px;">aulas no mês</div>
    </div>
    <div style="background:rgba(252,110,32,.12);border:1px solid rgba(252,110,32,.3);border-radius:16px;padding:14px;">
      <div style="font-size:10px;color:${ACC};margin-bottom:6px;font-weight:600;">Faturamento bruto</div>
      <div style="font-size:19px;font-weight:800;color:${ACC};letter-spacing:-.5px;line-height:1.1;">R$ 7.850,00</div>
      <div style="font-size:10px;color:rgba(252,110,32,.7);margin-top:4px;">fevereiro de 2026</div>
    </div>
  </div>

  <div style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:14px 16px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <div style="width:34px;height:34px;background:rgba(252,110,32,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;color:${ACC};">AS</div>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:700;">Ana Silva</div>
        <div style="font-size:11px;color:#888;margin-top:1px;">Seg 06:00 · Qua 06:00 · Sex 06:00</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:15px;font-weight:800;color:${ACC};">R$ 980,00</div>
        <div style="font-size:10px;color:#888;margin-top:2px;">total</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid #3a3a3a;">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="background:#2a2a2a;border:1px solid ${BORDER};color:#888;font-size:10px;padding:3px 8px;border-radius:6px;">Aulas: 12</span>
      </div>
      <span style="color:${ACC};font-size:11px;font-weight:600;text-decoration:underline;">ajustar</span>
    </div>
  </div>
</div>`)

// ─── MOCKUP 4: COBRANÇA ─────────────────────────────────────────────────────
const m4 = wrap(`
${NAV}
<div style="padding:0 20px;overflow:hidden;">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
    <div style="background:rgba(252,110,32,.14);border:1px solid rgba(252,110,32,.3);border-radius:14px;padding:12px;">
      <div style="font-size:10px;color:${ACC};font-weight:600;margin-bottom:4px;">Faturamento</div>
      <div style="font-size:16px;font-weight:800;color:${ACC};">R$ 7.850,00</div>
    </div>
    <div style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:12px;">
      <div style="font-size:10px;color:#888;margin-bottom:4px;">Pendente</div>
      <div style="font-size:22px;font-weight:800;color:${TEXT};">1 <span style="font-size:12px;font-weight:500;color:#888;">cobr.</span></div>
    </div>
    <div style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:12px;">
      <div style="font-size:10px;color:#888;margin-bottom:4px;">Enviado</div>
      <div style="font-size:22px;font-weight:800;color:${TEXT};">1 <span style="font-size:12px;font-weight:500;color:#888;">cobr.</span></div>
    </div>
    <div style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:12px;">
      <div style="font-size:10px;color:#888;margin-bottom:4px;">Pago</div>
      <div style="font-size:22px;font-weight:800;color:${GREEN};">6 <span style="font-size:12px;font-weight:500;color:#888;">cobr.</span></div>
    </div>
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="width:18px;height:18px;background:${ACC};border-radius:4px;display:flex;align-items:center;justify-content:center;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <span style="font-size:13px;font-weight:600;">Selecionar todos</span>
    </div>
    <span style="font-size:12px;color:#888;">1 selecionado</span>
  </div>

  <div style="background:rgba(252,110,32,.08);border:1.5px solid rgba(252,110,32,.3);border-radius:16px;padding:14px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <div style="width:18px;height:18px;background:${ACC};border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div style="width:34px;height:34px;background:rgba(252,110,32,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;color:${ACC};flex-shrink:0;">AS</div>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:700;">Ana Silva</div>
        <div style="display:flex;gap:4px;margin-top:3px;">
          <span style="background:#333;color:#888;font-size:9px;padding:2px 6px;border-radius:4px;">Seg</span>
          <span style="background:#333;color:#888;font-size:9px;padding:2px 6px;border-radius:4px;">Qua</span>
          <span style="background:#333;color:#888;font-size:9px;padding:2px 6px;border-radius:4px;">Sex</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:5px;">
        <span style="width:8px;height:8px;background:${GREEN};border-radius:50%;display:inline-block;"></span>
        <span style="font-size:12px;font-weight:600;color:${GREEN};">Pago</span>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(252,110,32,.2);">
      <span style="font-size:12px;color:#888;">12 aulas</span>
      <span style="font-size:14px;font-weight:700;color:${ACC};">R$ 980,00</span>
    </div>
    <div style="font-size:10px;color:#888;margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;">Mensagem de cobrança</div>
    <div style="background:${CARD};border-radius:10px;padding:12px;font-size:11px;color:${SEC};line-height:1.6;font-family:monospace;">
Olá, Ana! 👋<br><br>
Segue sua cobrança referente a<br>*Fevereiro de 2026*:<br><br>
📅 Datas: dias 3, 5, 7, 10, 12...<br>
📊 Total de aulas: 12<br>
💰 Valor: *R$ 980,00*
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button style="flex:1;padding:10px;background:#2a2a2a;border:1px solid ${BORDER};border-radius:12px;color:#888;font-size:11px;font-weight:600;cursor:pointer;">🔄 Restaurar padrão</button>
      <button style="flex:1.5;padding:10px;background:${GREEN};border:none;border-radius:12px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.5 2C6.261 2 2 6.261 2 11.5c0 1.984.573 3.832 1.563 5.38L2 22l5.275-1.538A9.46 9.46 0 0011.5 21c5.239 0 9.5-4.261 9.5-9.5S16.739 2 11.5 2z"/></svg>
        Enviar WhatsApp
      </button>
    </div>
  </div>
</div>`)

// ─── MOCKUP 5: CUSTOS E LUCRO ───────────────────────────────────────────────

// Chart data
const chartData = [
  { mes: 'Set', receita: 6800, custos: 2100 },
  { mes: 'Out', receita: 7200, custos: 2200 },
  { mes: 'Nov', receita: 6500, custos: 2000 },
  { mes: 'Dez', receita: 7800, custos: 2300 },
  { mes: 'Jan', receita: 7100, custos: 2100 },
  { mes: 'Fev', receita: 8450, custos: 2300 },
]

const W = 350, H = 110
const padT = 10, padB = 22, padL = 8, padR = 8
const cW = W - padL - padR, cH = H - padT - padB
const n = chartData.length
const maxVal = 9000
const xOf = i => (padL + (i / (n - 1)) * cW).toFixed(1)
const yOf = v => (padT + cH - (v / maxVal) * cH).toFixed(1)

const linePath = getter =>
  chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(getter(d))}`).join(' ')

const areaPath = getter =>
  linePath(getter) +
  ` L ${xOf(n-1)} ${(padT+cH).toFixed(1)} L ${xOf(0)} ${(padT+cH).toFixed(1)} Z`

const chartSvg = `
<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible;">
  <path d="${areaPath(d => d.receita)}" fill="rgba(252,110,32,0.1)"/>
  <path d="${areaPath(d => d.custos)}"  fill="rgba(255,231,208,0.06)"/>
  <path d="${linePath(d => d.receita)}" fill="none" stroke="${ACC}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="${linePath(d => d.custos)}"  fill="none" stroke="${SEC}" stroke-width="2"   stroke-linejoin="round" stroke-linecap="round"/>
  ${chartData.map((d, i) => `
    <circle cx="${xOf(i)}" cy="${yOf(d.receita)}" r="3.5" fill="${ACC}" stroke="#1B1B1B" stroke-width="1.5"/>
    <circle cx="${xOf(i)}" cy="${yOf(d.custos)}"  r="3"   fill="${SEC}" stroke="#1B1B1B" stroke-width="1.5"/>
  `).join('')}
  ${chartData.map((d, i) => `
    <text x="${xOf(i)}" y="${H - 4}" text-anchor="middle" font-size="9" fill="#666" font-family="-apple-system,sans-serif">${d.mes}</text>
  `).join('')}
</svg>`

const m5 = wrap(`
${NAV}
<div style="padding:0 20px;overflow:hidden;">
  <div style="background:rgba(252,110,32,.14);border:1px solid rgba(252,110,32,.3);border-radius:16px;padding:14px;margin-bottom:10px;">
    <div style="font-size:11px;color:${ACC};font-weight:600;margin-bottom:4px;">Faturamento total</div>
    <div style="font-size:24px;font-weight:800;color:${ACC};letter-spacing:-.5px;">R$ 8.450,00</div>
    <div style="font-size:11px;color:rgba(252,110,32,.7);margin-top:4px;">Alunos: R$ 7.850,00 &nbsp; Extra: R$ 600,00</div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
    <div style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:12px;">
      <div style="font-size:10px;color:#888;margin-bottom:4px;">Total de custos</div>
      <div style="font-size:18px;font-weight:800;color:${TEXT};">R$ 2.300,00</div>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <span style="font-size:10px;color:${GREEN};">F: R$ 2.100,00</span>
      </div>
      <span style="font-size:10px;color:#40C4FF;">V: R$ 200,00</span>
    </div>
    <div style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:12px;">
      <div style="font-size:10px;color:#888;margin-bottom:4px;">Lucro líquido</div>
      <div style="font-size:18px;font-weight:800;color:${TEXT};">R$ 6.150,00</div>
      <div style="font-size:10px;color:#888;margin-top:4px;">72.8% de margem</div>
    </div>
  </div>

  <div style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:12px;margin-bottom:8px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <div style="font-size:11px;color:#888;font-weight:600;">Margem de lucro</div>
      <span style="font-size:13px;font-weight:800;color:${ACC};">72.8%</span>
    </div>
    <div style="height:6px;background:#2a2a2a;border-radius:3px;overflow:hidden;margin-bottom:4px;">
      <div style="width:72.8%;height:100%;background:${ACC};border-radius:3px;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;">
      <span style="font-size:9px;color:${RED};">0%</span>
      <span style="font-size:9px;color:${YELLOW};">30%</span>
      <span style="font-size:9px;color:${GREEN};">50%+</span>
    </div>
  </div>

  <div style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:12px;margin-bottom:8px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:12px;font-weight:700;">Histórico financeiro</span>
      <div style="display:flex;gap:10px;align-items:center;">
        <div style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;background:${ACC};border-radius:50%;display:inline-block;"></span><span style="font-size:9px;color:#888;">Receita</span></div>
        <div style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;background:${SEC};border-radius:50%;display:inline-block;"></span><span style="font-size:9px;color:#888;">Custos</span></div>
      </div>
    </div>
    ${chartSvg}
  </div>

  <div style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:12px;">
    <div style="font-size:12px;font-weight:700;margin-bottom:10px;">Custo por categoria</div>
    <div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;background:#4CAF50;border-radius:50%;display:inline-block;"></span><span style="font-size:11px;color:#aaa;">Academia</span></div>
        <span style="font-size:11px;font-weight:600;">R$ 1.200,00</span>
      </div>
      <div style="height:5px;background:#2a2a2a;border-radius:3px;"><div style="width:52%;height:100%;background:#4CAF50;border-radius:3px;"></div></div>
    </div>
    <div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;background:#40C4FF;border-radius:50%;display:inline-block;"></span><span style="font-size:11px;color:#aaa;">Transporte</span></div>
        <span style="font-size:11px;font-weight:600;">R$ 700,00</span>
      </div>
      <div style="height:5px;background:#2a2a2a;border-radius:3px;"><div style="width:30%;height:100%;background:#40C4FF;border-radius:3px;"></div></div>
    </div>
    <div>
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;background:${YELLOW};border-radius:50%;display:inline-block;"></span><span style="font-size:11px;color:#aaa;">Alimentação</span></div>
        <span style="font-size:11px;font-weight:600;">R$ 400,00</span>
      </div>
      <div style="height:5px;background:#2a2a2a;border-radius:3px;"><div style="width:18%;height:100%;background:${YELLOW};border-radius:3px;"></div></div>
    </div>
  </div>
</div>`)

// ─── screenshot ──────────────────────────────────────────────────────────────
const mockups = [
  { name: '01-dashboard', html: m1 },
  { name: '02-agenda',    html: m2 },
  { name: '03-calculo',   html: m3 },
  { name: '04-cobranca',  html: m4 },
  { name: '05-custos',    html: m5 },
]

const browser = await chromium.launch()
const page    = await browser.newPage()

for (const { name, html } of mockups) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(html, { waitUntil: 'networkidle' })
  const outPath = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: outPath, type: 'png' })
  console.log(`✓ ${name}.png`)
}

await browser.close()
console.log('\n✅ Todos os mockups gerados em public/mockups/')
