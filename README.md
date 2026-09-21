# Sob a luz da ciência

Site e blog do projeto de divulgação científica de **Maria Cristina dos Santos Sobreira de Sampaio** e
**Sonia Bonduki**. Duas autoras, com painel administrativo próprio. Não depende de
WordPress, de serviços pagos nem de conexão com a internet para funcionar: todo o
conteúdo fica em um único arquivo de banco de dados dentro da pasta `data/`.

Cada publicação, projeto, orientação, disciplina, linha de pesquisa e post do
blog pertence a uma das duas. Todas as listagens mostram as duas por padrão e
aceitam `?quem=<slug>` para filtrar (`maria-cristina-dos-santos`,
`sonia-bonduki`).

## Como rodar na sua máquina

```bash
npm install      # só na primeira vez
npm run instalar # cria o banco e carrega os dois currículos
npm run fotos    # baixa as fotos de exemplo (opcional, precisa de internet)
npm start        # sobe o site
```

- **Site:** http://localhost:3000
- **Painel:** http://localhost:3000/admin

Sem nenhuma configuração, o projeto sobe um **PostgreSQL embutido**
(PGlite, em WebAssembly) dentro de `data/pg/`. Não é preciso instalar banco
nenhum. Uma ressalva: ele aceita **um processo por vez** — pare o servidor
antes de rodar `npm run seed`, senão as gravações se perdem.

A senha inicial é gerada na instalação e gravada em `data/PRIMEIRO-ACESSO.txt`.
Troque-a no painel, em **Ajustes → Trocar senha**, e apague esse arquivo.

Para desenvolver com recarga automática: `npm run dev`.
Para conferir a instalação a qualquer momento: `npm run setup`.

## Como publicar (Supabase + Vercel)

O banco fica no Supabase, as imagens no Supabase Storage e o site no Vercel.

**1. Supabase.** Crie um projeto em [supabase.com](https://supabase.com).
Em *Project Settings → Database → Connection string*, copie a do
**Transaction pooler** (porta 6543) — é a indicada para ambiente serverless;
a conexão direta esgota o limite. Em *Project Settings → API*, copie a
**Project URL** e a chave **service_role**.

**2. Variáveis.** Copie `.env.example` para `.env` e preencha. Depois:

```bash
npm run setup     # confere a conexão e cria o bucket das imagens
npm run instalar  # cria as tabelas e carrega o conteúdo
```

**3. Vercel.** Conecte o repositório do GitHub. Em *Settings → Environment
Variables*, repita as mesmas variáveis do `.env` (`DATABASE_URL`,
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET` e, se quiser,
`SITE_URL`, `ANTHROPIC_API_KEY` e `CRON_SECRET`). O `vercel.json` já cuida
do resto: manda todo o tráfego para `api/index.js` e agenda `/api/cron` uma vez por dia (limite do plano Hobby); além disso, o
site confere os posts programados a cada visita, no máximo a cada 5 minutos.

> A chave **service_role** ignora as regras de acesso do Supabase. Ela só
> pode existir no servidor — nunca no navegador nem no repositório.

### Por que não dá para usar só arquivos

A primeira versão deste site guardava tudo num arquivo SQLite e gravava as
imagens em `public/uploads/`. No Vercel isso não funciona: o disco é somente
leitura e cada requisição pode cair numa instância diferente. Comentários,
contador de leituras, sessões de login e envio de imagens quebrariam. Daí o
Postgres (Supabase) e o Storage.

## O que o site tem

**Lado do público**

| Página | Endereço | Conteúdo |
|---|---|---|
| Início | `/` | Apresentação, destaques, números da carreira e linhas de pesquisa |
| Blog | `/blog` | Lista com busca, filtro por categoria e por assunto |
| Post | `/blog/<endereço>` | Texto, galeria de fotos, índice lateral, fonte citada e comentários |
| Quem somos | `/sobre` | As duas, lado a lado, e as três maneiras de escrever do projeto |
| Perfil | `/sobre/<pessoa>` | Ficha Lattes, formação, atuação, gestão, docência, prêmios |
| Pesquisa | `/pesquisa` | Linhas de pesquisa e atuação, agrupadas por autora |
| Publicações | `/publicacoes` | Artigos, livros e capítulos, agrupados por década |
| Orientações | `/orientacoes` | Teses, dissertações, TCCs e iniciações científicas |
| Extensão | `/extensao` | MEDensina, coleta seletiva, SNAA e a Scientia Amazonia |
| Contato | `/contato` | Formulário que chega na caixa de entrada do painel |

Também gera `/feed.xml` (RSS), `/sitemap.xml` e `/robots.txt`.

**Lado do administrador**

- **Visão geral** — leituras dos últimos 14 dias, fila de moderação, mais lidos
  e sugestões de pauta geradas a partir do que já foi publicado.
- **Posts** — editor com barra de Markdown, pré-visualização e agendamento.
- **Comentários** — aprovar, responder publicamente, marcar spam.
- **Imagens** — biblioteca com descrição de acessibilidade e crédito por foto.
- **Conteúdo acadêmico** — cadastro de publicações, projetos, orientações,
  disciplinas, linhas de pesquisa, trajetória, prêmios e categorias do blog.
  Cada registro tem o campo *De quem é este registro*, e cada seção tem abas
  para filtrar por autora.
- **Mensagens** — contatos recebidos e lista de inscritos.
- **Ajustes** — identidade do site, links, política de comentários, senha e backup.

O nome do projeto, a frase de apoio e a descrição para buscadores ficam em
**Ajustes → Identidade**; mudar ali reflete no cabeçalho, no `<title>`, nas prévias
de compartilhamento, no RSS e no rodapé.

## O editor inteligente

Enquanto elas escrevem, o painel da direita recalcula sozinho — **sem internet e
sem custo**:

- **Nota editorial de 0 a 100** com um checklist do que falta.
- **Resumo automático** do texto (escolhe as frases mais representativas).
- **Sugestão de tags e de categoria** a partir de um vocabulário da área delas
  (Imunologia, animais peçonhentos, antivenenos, arraias, plantas medicinais,
  psiconeuroimunologia, Amazônia…).
- **Tempo de leitura, contagem de palavras e legibilidade** (índice Flesch
  adaptado ao português).
- **Verificação de SEO**: tamanho do título, descrição, capa, subtítulos.
- **Endereço (slug) gerado** a partir do título.

Na moderação, cada comentário recebe uma **pontuação de risco de spam** com o
motivo (links demais, termos suspeitos, excesso de maiúsculas, envio rápido
demais, campo-armadilha preenchido). Acima de 60% vai direto para spam.

### Assistente de IA (opcional)

Com a variável `ANTHROPIC_API_KEY` definida, aparecem no editor botões para
revisar, simplificar, encurtar ou desenvolver o texto, gerar resumo/tags/títulos
e **escrever um rascunho a partir de um link que elas leram**. Sem a variável, tudo
o que está descrito acima continua funcionando normalmente.

```bash
export ANTHROPIC_API_KEY="sua-chave"
npm start
```

As chamadas só acontecem quando elas clicam em um botão — nada é enviado
automaticamente. O assistente é instruído a nunca inventar dados, autores ou
referências: onde falta informação, ele escreve `[verificar no artigo original]`.

## Fotos

Todo post do blog tem **uma imagem de capa** (a análise marca como erro se
faltar) e pode ter **quantas fotos adicionais quiser** numa galeria própria.

No editor, em **Fotos deste post**: clique em *Escolher da galeria*, selecione
quantas fotos quiser e escreva a legenda e o crédito de cada uma. As setas ↑ ↓
reordenam. No site, elas aparecem em "Imagens deste texto", no fim do post, com
legenda e crédito visíveis.

O `npm run fotos` baixa 11 fotos das espécies que a Maria Cristina estuda —
*Bothrops atrox*, *Potamotrygon motoro*, *Crotalus durissus*, *Micrurus*,
tambaqui, Melastomataceae, floresta amazônica e laboratório — todas do Wikimedia
Commons, com licença livre (CC BY, CC BY-SA, CC0 ou domínio público) e o crédito
do autor gravado junto. **Para publicar de verdade, o ideal é trocar por fotos
próprias do laboratório e do campo**: basta enviá-las em *Imagens*.

## Backup

Em **Ajustes → Baixar backup completo** sai um arquivo JSON com posts,
comentários, currículo e configurações. Para um backup completo, guarde também a
pasta `data/` (banco) e `public/uploads/` (fotos).

## O visual

A linguagem visual foi adaptada do template **React Native Starter**, da
Flatlogic (licença MPL 2.0): tipografia Lato, cartões arredondados com sombra
difusa, botões em cápsula em maiúsculas, cabeçalhos e faixas de números em
gradiente, avatares circulares e gaveta de navegação no celular. A paleta roxa do
original foi trocada pelo verde de floresta e pelo verde-água, e cada autora tem
sua própria cor de destaque (`--accent`), que tinge o perfil, a assinatura dos
posts e as fichas de filtro.

Nenhum código do template foi copiado — ele é um app React Native, sem HTML nem
CSS, e o `public/css/site.css` daqui foi escrito do zero. O que veio de lá são as
**fontes Lato**, distribuídas sob a SIL Open Font License 1.1 e independentes da
licença do template. Elas ficam em `public/fonts/`, em subconjunto latino woff2 —
228 KB no total, servidas pelo próprio site. **Nenhuma requisição sai para
servidores de terceiros** quando alguém abre uma página.

## Como está organizado

```
server.js              sobe o servidor na máquina local
api/index.js           ponto de entrada no Vercel
api/cron.js            publica os posts agendados (tarefa do Vercel)
vercel.json            rotas e agenda da plataforma
src/
  app.js               monta o aplicativo Express (local e Vercel)
  db.js                PostgreSQL: esquema, consultas e busca textual
  storage.js           imagens: Supabase Storage ou disco local
  rota.js              Router que captura erros de rotas assíncronas
  setup.js             confere conexão, esquema e bucket
  auth.js              senhas (scrypt), sessões, CSRF, limite de tentativas
  intel.js             a "inteligência": resumo, tags, legibilidade, SEO, spam
  ai.js                assistente opcional sobre a API da Claude
  markdown.js          Markdown → HTML e índice do post
  seed.js              conteúdo inicial (estrutura + posts de exemplo)
  seed-lattes.js       currículo da Maria Cristina
  seed-pessoas.js      cria as duas autoras e distribui o conteúdo entre elas
  lattes/              os currículos transcritos, um arquivo por bloco
  fotos.js             baixa e credita as fotos de licença livre
  routes/public.js     páginas do site
  routes/admin.js      painel administrativo
views/                 templates EJS (public/, partials/ e admin/)
public/css/            site.css (público) e admin.css (painel)
public/fonts/          Lato em woff2, servida localmente
public/uploads/        retratos e fotos enviadas
data/pg/               Postgres embutido (só na máquina local)
documentos/            PDFs e originais de onde o conteúdo foi transcrito
```

## Segurança

Senhas com `scrypt` e sal por usuário; sessões em cookie `httpOnly`; proteção
CSRF em todos os formulários; bloqueio após 5 tentativas de login; comentários
sempre escapados (sem HTML); upload restrito a imagens de até 8 MB;
`/admin` marcado como `noindex` e bloqueado no `robots.txt`.

Antes de publicar na internet, rode atrás de HTTPS e defina uma senha forte.
