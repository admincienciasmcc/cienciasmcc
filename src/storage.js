'use strict';

/* =========================================================================
   Onde ficam as imagens enviadas pelo painel.

   · Com SUPABASE_URL e SUPABASE_SERVICE_KEY definidas, vão para o Supabase
     Storage — o disco do Vercel é somente leitura e some a cada implantação.
   · Sem elas, caem em public/uploads/ como sempre, para o desenvolvimento
     na máquina local continuar simples.

   As imagens que já estavam em public/uploads/ seguem sendo servidas de lá:
   o banco guarda a URL inteira, então os dois casos convivem.
   ========================================================================= */

const path = require('node:path');
const fs = require('node:fs/promises');

const { UPLOAD_DIR } = require('./db');
const intel = require('./intel');

const BUCKET = process.env.SUPABASE_BUCKET || 'imagens';

let clienteSupabase;
function supabase() {
  if (clienteSupabase !== undefined) return clienteSupabase;
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !chave) {
    clienteSupabase = null;
    return null;
  }
  const { createClient } = require('@supabase/supabase-js');
  clienteSupabase = createClient(url, chave, { auth: { persistSession: false } });
  return clienteSupabase;
}

function remoto() {
  return supabase() !== null;
}

/** Nome de arquivo previsível, sem acento e sem espaço. */
function nomeDeArquivo(original) {
  const ext = path.extname(original).toLowerCase().slice(0, 8) || '.bin';
  const base = intel.slugify(path.basename(original, ext)).slice(0, 40) || 'arquivo';
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}-${base}${ext}`;
}

/**
 * Guarda o arquivo e devolve a URL pública.
 * @param {{originalname: string, mimetype: string, buffer: Buffer}} arquivo
 */
async function guardar(arquivo) {
  const nome = nomeDeArquivo(arquivo.originalname);
  const sb = supabase();

  if (!sb) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, nome), arquivo.buffer);
    return `/uploads/${nome}`;
  }

  const { error } = await sb.storage.from(BUCKET).upload(nome, arquivo.buffer, {
    contentType: arquivo.mimetype,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(`Supabase Storage: ${error.message}`);

  const { data } = sb.storage.from(BUCKET).getPublicUrl(nome);
  return data.publicUrl;
}

/** Apaga o arquivo apontado por uma URL guardada no banco. */
async function apagar(url) {
  if (!url) return;
  const sb = supabase();

  if (url.startsWith('/uploads/')) {
    await fs.rm(path.join(UPLOAD_DIR, path.basename(url)), { force: true }).catch(() => {});
    return;
  }
  if (sb && url.includes(`/${BUCKET}/`)) {
    const nome = decodeURIComponent(url.split(`/${BUCKET}/`).pop().split('?')[0]);
    await sb.storage.from(BUCKET).remove([nome]).catch(() => {});
  }
}

/** Cria o bucket público, se ainda não existir. Chamado pelo script de setup. */
async function prepararBucket() {
  const sb = supabase();
  if (!sb) return { ok: false, motivo: 'SUPABASE_URL/SUPABASE_SERVICE_KEY não definidas' };

  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) return { ok: false, motivo: error.message };
  if (buckets.some((b) => b.name === BUCKET)) return { ok: true, criado: false, bucket: BUCKET };

  const { error: erroCriar } = await sb.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml'],
  });
  if (erroCriar) return { ok: false, motivo: erroCriar.message };
  return { ok: true, criado: true, bucket: BUCKET };
}

module.exports = { guardar, apagar, remoto, prepararBucket, BUCKET };
