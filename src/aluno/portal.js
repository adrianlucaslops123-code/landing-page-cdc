/**
 * Área do aluno: um ambiente próprio dentro do site (nada leva ao site antigo).
 *  #area-comum            biblioteca (materiais)
 *  #area-comum-videos     aba de vídeos
 *  #ler-<id>              leitor de um material (ex.: #ler-apostila-teorica)
 * Abre por cima da página com uma cortina circular a partir do clique, para a
 * rolagem da página e devolve tudo ao fechar. O progresso de leitura fica no
 * navegador de cada aluno (localStorage).
 */
import { gsap } from 'gsap'
import { MATERIAIS, VIDEOS, KIWIFY_LOGIN } from './materiais.js'
import { buscar } from './busca.js'
import { criarLeitor, preCarregarLeitor } from './leitor.js'

const CHAVE = 'cdc-aluno-v1'
const porId = Object.fromEntries(MATERIAIS.map((m) => [m.id, m]))

function lerProgresso() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}
  } catch {
    return {}
  }
}
function salvarProgresso(id, pagina, total) {
  try {
    const p = lerProgresso()
    p[id] = { pagina, total, quando: Date.now() }
    localStorage.setItem(CHAVE, JSON.stringify(p))
  } catch {}
}

const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function iniciarAreaDoAluno({ rolagem, som, reduzido, artefato }) {
  const html = document.documentElement
  const portal = document.getElementById('portal')
  if (!portal) return
  const biblioteca = portal.querySelector('.biblioteca')
  const leitorEl = portal.querySelector('.leitor')
  const grade = portal.querySelector('.biblioteca__materiais')
  const continuar = portal.querySelector('.biblioteca__continuar')
  const resultados = portal.querySelector('.biblioteca__resultados')
  const campo = portal.querySelector('#busca-materiais')
  const abas = portal.querySelectorAll('[data-aba]')
  const painelMateriais = portal.querySelector('[data-painel-de="materiais"]')
  const painelVideos = portal.querySelector('[data-painel-de="videos"]')
  const corpo = portal.querySelector('.portal__corpo')
  portal.querySelectorAll('[data-kiwify]').forEach((a) => (a.href = KIWIFY_LOGIN))

  let aberto = false
  let viaPagina = false // abriu por um clique dentro do site (há uma entrada no histórico para voltar)
  let origem = { x: innerWidth / 2, y: innerHeight / 2 }
  let focoAntes = null

  const leitor = criarLeitor({
    raiz: leitorEl,
    artefato,
    som,
    aoProgresso: (id, pagina, total) => {
      salvarProgresso(id, pagina, total)
      atualizarProgressoNaPagina()
    },
    aoVoltar: () => navegar('#area-comum'),
  })

  // ---------- biblioteca ----------
  function cartao(m, p) {
    const lido = p ? Math.round((p.pagina / (p.total || m.paginas)) * 100) : 0
    const acao = p && p.pagina > 1 ? `Continuar na pág. ${p.pagina}` : 'Ler agora'
    return `
      <article class="material" data-id="${m.id}">
        <a class="material__capa" href="#ler-${m.id}" aria-label="Ler ${escapar(m.titulo)}">
          <img src="${m.capa}" alt="" loading="lazy" decoding="async" width="280" height="${Math.round(280 * 1.35)}" />
          <span class="material__selo">PDF · ${m.paginas} pág.</span>
        </a>
        <div class="material__info">
          <p class="material__prova">${escapar(m.prova)}<span>${escapar(m.codigo || '')}</span></p>
          <h3>${escapar(m.titulo)}</h3>
          <p class="material__resumo">${escapar(m.resumo)}</p>
          <p class="material__meta">${m.paginas} páginas · ${m.tamanho}${m.pesquisavel ? ' · pesquisável' : ' · escaneado'}</p>
          <div class="material__progresso" ${p ? '' : 'hidden'}><i style="--lido:${lido}%"></i><span>${p ? `Você parou na página ${p.pagina} de ${p.total || m.paginas}` : ''}</span></div>
          <div class="material__acoes">
            <a class="botao botao--brasa" href="#ler-${m.id}">${acao}</a>
            ${m.atalho ? `<a class="botao botao--vidro" href="#ler-${m.id}-p${m.atalho.pagina}">${escapar(m.atalho.rotulo)}</a>` : ''}
            <a class="material__abrir" href="${m.arquivo}" ${artefato ? 'target="_blank" rel="noopener"' : `download="CDC - ${escapar(m.titulo)}.pdf"`}>${artefato ? 'Abrir PDF ↗' : 'Baixar PDF'}</a>
          </div>
        </div>
      </article>`
  }

  function montarBiblioteca() {
    const progresso = lerProgresso()
    grade.innerHTML = MATERIAIS.map((m) => cartao(m, progresso[m.id])).join('')
    // continuar de onde parou: o material lido por último
    const ultimo = Object.entries(progresso)
      .filter(([id]) => porId[id])
      .sort((a, b) => b[1].quando - a[1].quando)[0]
    if (ultimo) {
      const [id, p] = ultimo
      const m = porId[id]
      continuar.hidden = false
      continuar.innerHTML = `
        <a class="continuar" href="#ler-${id}-p${p.pagina}">
          <img src="${m.capa}" alt="" width="64" height="86" />
          <span class="continuar__texto"><small>Continue de onde parou</small><b>${escapar(m.titulo)}</b><span>Página ${p.pagina} de ${p.total || m.paginas}</span></span>
          <span class="continuar__barra"><i style="--lido:${Math.round((p.pagina / (p.total || m.paginas)) * 100)}%"></i></span>
          <span class="continuar__seta" aria-hidden="true">→</span>
        </a>`
    } else continuar.hidden = true
    portal.querySelector('[data-aba="materiais"] b').textContent = String(MATERIAIS.length)
    portal.querySelector('[data-aba="videos"] b').textContent = String(VIDEOS.length)
  }

  // ---------- busca em todos os materiais ----------
  let timerBusca = 0
  let consultaAtual = ''
  async function buscarTudo(texto) {
    consultaAtual = texto
    const q = texto.trim()
    if (q.length < 2) {
      resultados.hidden = true
      painelMateriais.hidden = false
      return
    }
    resultados.hidden = false
    painelMateriais.hidden = true
    resultados.innerHTML = '<p class="resultados__info">Buscando nos materiais…</p>'
    let r
    try {
      r = await buscar(q, MATERIAIS.filter((m) => m.pesquisavel).map((m) => m.id), 80)
    } catch {
      resultados.innerHTML = '<p class="resultados__info">Não foi possível carregar o índice de busca. Verifique a conexão e tente de novo.</p>'
      return
    }
    if (consultaAtual !== texto) return
    const escaneados = MATERIAIS.filter((m) => !m.pesquisavel).map((m) => m.titulo)
    const nota = escaneados.length ? `<p class="resultados__nota">${escaneados.map(escapar).join(', ')} ${escaneados.length > 1 ? 'são escaneados' : 'é escaneado'} e fica fora da busca; use o sumário dentro dele.</p>` : ''
    if (!r.achados.length) {
      resultados.innerHTML = `<p class="resultados__info">Nada encontrado para “${escapar(q)}”. Tente outra palavra.</p>${nota}`
      return
    }
    const grupos = {}
    for (const a of r.achados) (grupos[a.id] ||= []).push(a)
    resultados.innerHTML =
      `<p class="resultados__info"><b>${r.total}</b> ${r.total === 1 ? 'ocorrência' : 'ocorrências'} de “${escapar(q)}”</p>` +
      Object.entries(grupos)
        .map(
          ([id, lista]) => `
        <section class="resultados__grupo">
          <h3>${escapar(porId[id].titulo)} <span>${lista.length} ${lista.length === 1 ? 'página' : 'páginas'}</span></h3>
          <ol>${lista
            .map((a) => `<li><a href="#ler-${id}-p${a.pagina}" data-busca="${escapar(q)}"><b>pág. ${a.pagina}</b><span>${a.trecho}</span></a></li>`)
            .join('')}</ol>
        </section>`,
        )
        .join('') +
      nota
  }
  campo.addEventListener('input', () => {
    clearTimeout(timerBusca)
    timerBusca = setTimeout(() => buscarTudo(campo.value), 240)
  })
  campo.closest('form').addEventListener('submit', (e) => {
    e.preventDefault()
    clearTimeout(timerBusca)
    buscarTudo(campo.value)
  })

  // ---------- abas ----------
  function mostrarAba(aba) {
    const comBusca = campo.value.trim().length >= 2
    abas.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === aba)))
    painelVideos.hidden = aba !== 'videos'
    portal.querySelector('.biblioteca__busca').hidden = aba !== 'materiais'
    resultados.hidden = aba !== 'materiais' || !comBusca
    painelMateriais.hidden = aba !== 'materiais' || comBusca
  }
  abas.forEach((b) => b.addEventListener('click', () => navegar(b.dataset.aba === 'videos' ? '#area-comum-videos' : '#area-comum')))

  // ---------- abrir e fechar o portal ----------
  function abrirPortal() {
    if (aberto) return
    aberto = true
    focoAntes = document.activeElement
    portal.hidden = false
    html.classList.add('portal-aberto')
    rolagem.parar()
    preCarregarLeitor()
    som?.tocar('virada')
    if (!reduzido) {
      const r = Math.hypot(Math.max(origem.x, innerWidth - origem.x), Math.max(origem.y, innerHeight - origem.y))
      gsap.fromTo(portal, { clipPath: `circle(0px at ${origem.x}px ${origem.y}px)` }, { clipPath: `circle(${r}px at ${origem.x}px ${origem.y}px)`, duration: 0.9, ease: 'expo.inOut', clearProps: 'clipPath' })
      gsap.fromTo(portal.querySelectorAll('.portal__topo, .biblioteca__cabeca > *, .material, .continuar'), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.05, delay: 0.35, clearProps: 'all' })
    }
  }
  function fecharPortal() {
    if (!aberto) return
    aberto = false
    leitor.fechar()
    const fim = () => {
      portal.hidden = true
      html.classList.remove('portal-aberto')
      rolagem.seguir()
      atualizarProgressoNaPagina()
      focoAntes?.focus?.({ preventScroll: true })
    }
    if (reduzido) fim()
    else gsap.to(portal, { clipPath: `circle(0px at ${origem.x}px ${origem.y}px)`, duration: 0.6, ease: 'expo.inOut', onComplete: () => (gsap.set(portal, { clearProps: 'clipPath' }), fim()) })
  }

  // ---------- rotas ----------
  function rota(hash) {
    const h = (hash || '').replace(/^#/, '')
    if (h === 'area-comum' || h === 'area-comum-videos') {
      leitor.fechar()
      leitorEl.hidden = true
      portal.classList.remove('com-leitor')
      biblioteca.hidden = false
      montarBiblioteca()
      mostrarAba(h === 'area-comum-videos' ? 'videos' : 'materiais')
      abrirPortal()
      corpo.scrollTop = 0
      return true
    }
    const m = h.match(/^ler-(.+?)(?:-p(\d+))?$/)
    if (m && porId[m[1]]) {
      abrirPortal()
      biblioteca.hidden = true
      leitorEl.hidden = false
      portal.classList.add('com-leitor')
      const material = porId[m[1]]
      const salvo = lerProgresso()[material.id]
      const pagina = m[2] ? Number(m[2]) : salvo?.pagina || 1
      leitor.abrir(material, { pagina, busca: buscaPendente })
      buscaPendente = ''
      return true
    }
    if (aberto) fecharPortal()
    return false
  }
  let buscaPendente = ''

  // abrir o portal cria UMA entrada no histórico; dentro dele as trocas
  // substituem essa entrada. Assim o "voltar" do navegador fecha o portal.
  function navegar(hash) {
    if (location.hash === hash) {
      rota(hash)
      return
    }
    if (!aberto) {
      viaPagina = true
      location.hash = hash
    } else {
      history.replaceState(null, '', hash)
      rota(hash)
    }
  }
  addEventListener('hashchange', () => rota(location.hash))

  function sair() {
    if (viaPagina) {
      viaPagina = false
      history.back()
    } else {
      history.replaceState(null, '', location.pathname + location.search)
      rota('')
    }
  }
  portal.querySelectorAll('[data-fechar-portal]').forEach((b) => b.addEventListener('click', sair))
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !aberto) return
    if (!leitorEl.hidden) {
      if (leitorEl.classList.contains('com-painel') && innerWidth < 900) return
      navegar('#area-comum')
    } else sair()
  })

  // cliques que abrem o portal (guardam o ponto de origem da cortina)
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest('a[href^="#area-comum"], a[href^="#ler-"], [data-abrir-material]')
      if (!a) return
      e.preventDefault()
      e.stopPropagation()
      if (!aberto) origem = { x: e.clientX || innerWidth / 2, y: e.clientY || innerHeight / 2 }
      if (a.dataset.busca) buscaPendente = a.dataset.busca
      const destino = a.dataset.abrirMaterial ? `#ler-${a.dataset.abrirMaterial}` : a.getAttribute('href')
      navegar(destino)
    },
    true,
  )

  // busca na seção da página: abre o portal já com os resultados
  const buscaSecao = document.querySelector('.aluno__busca')
  buscaSecao?.addEventListener('submit', (e) => {
    e.preventDefault()
    const q = buscaSecao.querySelector('input').value
    const r = buscaSecao.getBoundingClientRect()
    origem = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    campo.value = q
    navegar('#area-comum')
    buscarTudo(q)
  })

  // pré-carrega o leitor quando a pessoa chega perto da área do aluno
  document.querySelector('#area-do-aluno')?.addEventListener('pointerenter', preCarregarLeitor, { once: true })

  // progresso também na seção da página
  function atualizarProgressoNaPagina() {
    const progresso = lerProgresso()
    document.querySelectorAll('[data-progresso-de]').forEach((el) => {
      const m = porId[el.dataset.progressoDe]
      const p = progresso[el.dataset.progressoDe]
      if (!m) return
      el.hidden = !p
      if (p) {
        el.style.setProperty('--lido', `${Math.round((p.pagina / (p.total || m.paginas)) * 100)}%`)
        el.title = `Você parou na página ${p.pagina}`
      }
    })
  }
  atualizarProgressoNaPagina()

  // link direto (#area-comum, #ler-...) ao carregar a página
  if (/^#(area-comum|ler-)/.test(location.hash)) rota(location.hash)
}
