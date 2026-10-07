'use strict';

/* =========================================================================
   Datas e horários do site.

   O banco guarda tudo em UTC, no formato "AAAA-MM-DD HH:MM:SS". As autoras
   escrevem e leem em horário de Brasília. Desde 2019 o Brasil não tem mais
   horário de verão, então o deslocamento é fixo: três horas a menos que UTC.

   Sem esta conversão, um post agendado para as 10h sairia às 7h, e um texto
   publicado às 22h apareceria com a data do dia seguinte.
   ========================================================================= */

const DESLOCAMENTO_MIN = -3 * 60; // America/Sao_Paulo

/** "2026-10-07T10:00" (campo datetime-local, em Brasília) → "2026-10-07 13:00:00" (UTC). */
function deBrasiliaParaUtc(valorLocal) {
  if (!valorLocal) return null;
  const texto = String(valorLocal).trim().replace(' ', 'T');
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(texto);
  if (!m) return null;
  const [, a, me, d, h, mi, s] = m;
  const comoSeFosseUtc = Date.UTC(+a, +me - 1, +d, +h, +mi, +(s || 0));
  const utc = new Date(comoSeFosseUtc - DESLOCAMENTO_MIN * 60_000);
  return utc.toISOString().slice(0, 19).replace('T', ' ');
}

/** Objeto Date a partir do texto UTC do banco. */
function dataUtc(valorBanco) {
  if (!valorBanco) return null;
  const texto = String(valorBanco).trim();
  const d = new Date(texto.length <= 10 ? `${texto}T00:00:00Z` : `${texto.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Partes da data já deslocadas para Brasília: { ano, mes (1-12), dia, hora, minuto }. */
function partesBrasilia(valorBanco) {
  const d = dataUtc(valorBanco);
  if (!d) return null;
  const local = new Date(d.getTime() + DESLOCAMENTO_MIN * 60_000);
  return {
    ano: local.getUTCFullYear(),
    mes: local.getUTCMonth() + 1,
    dia: local.getUTCDate(),
    hora: local.getUTCHours(),
    minuto: local.getUTCMinutes(),
  };
}

/** Texto UTC do banco → valor para um campo datetime-local ("2026-10-07T10:00"). */
function paraCampoLocal(valorBanco) {
  const p = partesBrasilia(valorBanco);
  if (!p) return '';
  const z = (n) => String(n).padStart(2, '0');
  return `${p.ano}-${z(p.mes)}-${z(p.dia)}T${z(p.hora)}:${z(p.minuto)}`;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** "7 de outubro de 2026" — para o site. */
function dataPorExtenso(valorBanco) {
  const p = partesBrasilia(valorBanco);
  if (!p) return valorBanco ? String(valorBanco) : '';
  return `${p.dia} de ${MESES[p.mes - 1]} de ${p.ano}`;
}

/** "07/10/2026 10:00" — para o painel. */
function dataCurta(valorBanco, comHora = true) {
  const p = partesBrasilia(valorBanco);
  if (!p) return valorBanco ? String(valorBanco) : '';
  const z = (n) => String(n).padStart(2, '0');
  const data = `${z(p.dia)}/${z(p.mes)}/${p.ano}`;
  return comHora ? `${data} ${z(p.hora)}:${z(p.minuto)}` : data;
}

/** Agora, em UTC, no formato do banco. */
function agoraUtc() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/** ISO 8601 com o deslocamento de Brasília, para <time datetime> e feeds. */
function iso(valorBanco) {
  const d = dataUtc(valorBanco);
  return d ? d.toISOString() : '';
}

module.exports = {
  deBrasiliaParaUtc,
  paraCampoLocal,
  dataPorExtenso,
  dataCurta,
  agoraUtc,
  iso,
  partesBrasilia,
};
