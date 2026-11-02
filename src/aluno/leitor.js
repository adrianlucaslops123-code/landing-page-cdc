/**
 * Leitor de PDF da área do aluno (pdf.js).
 *  - rolagem contínua; cada página é desenhada só perto da tela e liberada
 *    longe dela (a apostila tem 168 páginas e precisa caber no celular);
 *  - texto selecionável (camada de texto) nos PDFs que têm texto;
 *  - zoom, ajuste à largura, ir para página, sumário, miniaturas;
 *  - busca no documento com os trechos e destaque na página;
 *  - lembra a última página lida (avisa por `aoProgresso`).
 */
import { normalizar, paginasCom } from './busca.js'

let pdfjsPromessa = null
function carregarPdfjs() {
  if (!pdfjsPromessa) {
    pdfjsPromessa = import('pdfjs-dist/legacy/build/pdf.min.mjs')
      .then((m) => {
        m.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href
        return m
      })
      .catch((e) => {
        pdfjsPromessa = null
        throw e
      })
  }
  return pdfjsPromessa
}
export const preCarregarLeitor = () => carregarPdfjs().catch(() => {})

const ZOOMS = [0.5, 0.67, 0.8, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3]
const LARGURA_MAX = 980
const ESPACO = 18 // entre páginas
const limitar = (v, a, b) => Math.min(b, Math.max(a, v))

export function criarLeitor({ raiz, artefato, som, aoProgresso, aoVoltar }) {
  const $ = (s) => raiz.querySelector(s)
  const rolo = $('.leitor__paginas')
  const trilho = $('.leitor__trilho')
  const titulo = $('.leitor__titulo')
  const codigo = $('.leitor__codigo')
  const num = $('.leitor__num')
  const total = $('.leitor__total')
  const ajuste = $('.leitor__ajuste')
  const abrirPdf = $('.leitor__abrir')
  const baixar = $('.leitor__baixar')
  const estado = $('.leitor__estado')
  const barra = $('.leitor__carga i')
  const painel = $('.leitor__painel')
  const listaSumario = $('.painel__sumario ol')
  const atalho = $('.painel__atalho')
  const grade = $('.painel__paginas')
  const campoBusca = $('.painel__busca input')
  const infoBusca = $('.painel__busca .busca__info')
  const listaBusca = $('.painel__busca ol')
  const navBusca = $('.painel__busca .busca__nav')

  if (artefato) baixar.hidden = true

  let pdfjs = null
  let doc = null
  let material = null
  let folhas = []
  let topos = []
  let proporcao = 1.414
  let larguraBase = 600
  let zoom = 1
  let atual = 1
  let geracao = 0 // invalida trabalhos de um documento anterior
  let consulta = ''
  let achados = []
  let achadoAtual = -1
  const visiveis = new Set()
  const fila = []
  let desenhando = 0

  // ---------- disposição ----------
  function medirBase() {
    const disponivel = rolo.clientWidth - (innerWidth < 700 ? 20 : 64)
    larguraBase = Math.max(240, Math.min(LARGURA_MAX, disponivel))
  }
  function aplicarTamanhos() {
    const w = Math.round(larguraBase * zoom)
    for (const f of folhas) {
      f.el.style.width = `${w}px`
      f.el.style.height = `${Math.round(w * (f.prop || proporcao))}px`
    }
    recalcularTopos()
    ajuste.textContent = `${Math.round(zoom * 100)}%`
  }
  function recalcularTopos() {
    topos = folhas.map((f) => f.el.offsetTop)
  }
  function paginaNoTopo() {
    const y = rolo.scrollTop + rolo.clientHeight * 0.3
    let a = 0
    let b = topos.length - 1
    while (a < b) {
      const m = (a + b + 1) >> 1
      if (topos[m] <= y) a = m
      else b = m - 1
    }
    return a + 1
  }

  // ---------- desenho das páginas ----------
  const chaveAtual = () => `${zoom}:${larguraBase}`

  function enfileirar(f) {
    if (f.chave === chaveAtual() || f.naFila) return
    f.naFila = true
    fila.push(f)
    // prioridade: mais perto da página atual primeiro
    fila.sort((x, y) => Math.abs(x.pagina - atual) - Math.abs(y.pagina - atual))
    processar()
  }
  function processar() {
    while (desenhando < 2 && fila.length) {
      const f = fila.shift()
      f.naFila = false
      if (!visiveis.has(f)) continue
      desenhando++
      desenhar(f)
        .catch((e) => {
          if (e?.name !== 'RenderingCancelledException') console.warn('Página', f.pagina, e)
        })
        .finally(() => {
          desenhando--
          processar()
        })
    }
  }

  async function desenhar(f) {
    const g = geracao
    const chave = chaveAtual()
    const pagina = await doc.getPage(f.pagina)
    if (g !== geracao) return
    const base = pagina.getViewport({ scale: 1 })
    const prop = base.height / base.width
    if (Math.abs(prop - (f.prop || proporcao)) > 0.004) {
      f.prop = prop
      f.el.style.height = `${Math.round(parseFloat(f.el.style.width) * prop)}px`
      recalcularTopos()
    }
    const escala = parseFloat(f.el.style.width) / base.width
    const vp = pagina.getViewport({ scale: escala })
    let razao = Math.min(devicePixelRatio || 1, 2)
    const maxPx = innerWidth < 700 ? 5e6 : 1.2e7
    if (vp.width * vp.height * razao * razao > maxPx) razao = Math.sqrt(maxPx / (vp.width * vp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(vp.width * razao)
    canvas.height = Math.floor(vp.height * razao)
    canvas.style.width = `${vp.width}px`
    canvas.style.height = `${vp.height}px`
    f.tarefa?.cancel()
    const tarefa = pagina.render({ canvas, viewport: vp, transform: razao !== 1 ? [razao, 0, 0, razao, 0, 0] : undefined })
    f.tarefa = tarefa
    await tarefa.promise
    f.tarefa = null
    if (g !== geracao || !visiveis.has(f)) {
      canvas.width = canvas.height = 0
      return
    }
    // troca sem piscar: o desenho novo entra no lugar do antigo
    if (f.canvas) {
      f.canvas.width = f.canvas.height = 0
      f.canvas.replaceWith(canvas)
    } else f.el.prepend(canvas)
    f.canvas = canvas
    f.chave = chave
    f.el.classList.add('is-desenhada')

    // texto selecionável
    if (material.pesquisavel && pdfjs.TextLayer) {
      const camada = document.createElement('div')
      camada.className = 'textLayer'
      f.el.style.setProperty('--scale-factor', String(escala))
      f.el.style.setProperty('--total-scale-factor', String(escala))
      const tl = new pdfjs.TextLayer({ textContentSource: pagina.streamTextContent(), container: camada, viewport: vp })
      await tl.render()
      if (g !== geracao) return
      f.texto?.remove()
      f.el.append(camada)
      f.texto = camada
      f.spans = tl.textDivs
      marcar(f)
    }
  }

  function liberar(f) {
    f.tarefa?.cancel()
    f.tarefa = null
    if (f.canvas) {
      f.canvas.width = f.canvas.height = 0
      f.canvas.remove()
      f.canvas = null
    }
    f.texto?.remove()
    f.texto = null
    f.spans = null
    f.chave = null
    f.el.classList.remove('is-desenhada')
  }

  // perto da tela: desenha; muito longe: libera a memória
  const perto = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        const f = e.target.__folha
        if (e.isIntersecting) {
          visiveis.add(f)
          enfileirar(f)
        } else visiveis.delete(f)
      }
    },
    { root: rolo, rootMargin: '140% 0px' },
  )
  const longe = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) if (!e.isIntersecting) liberar(e.target.__folha)
    },
    { root: rolo, rootMargin: '450% 0px' },
  )

  // ---------- destaque da busca nas páginas desenhadas ----------
  function marcar(f) {
    if (!f.spans) return
    const q = normalizar(consulta.trim())
    for (const s of f.spans) {
      const tem = q.length >= 2 && normalizar(s.textContent).includes(q)
      s.classList.toggle('achado', tem)
    }
  }
  const marcarTodas = () => folhas.forEach(marcar)

  // ---------- navegação ----------
  function irPara(p, suave = true) {
    p = limitar(Math.round(p) || 1, 1, folhas.length)
    const topo = topos[p - 1] - 10
    rolo.scrollTo({ top: topo, behavior: suave && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' })
    definirAtual(p)
  }
  let timerProgresso = 0
  function definirAtual(p) {
    if (p === atual && num.value === String(p)) return
    atual = p
    if (document.activeElement !== num) num.value = String(p)
    grade.querySelectorAll('.miniatura.is-atual').forEach((m) => m.classList.remove('is-atual'))
    grade.querySelector(`.miniatura[data-p="${p}"]`)?.classList.add('is-atual')
    clearTimeout(timerProgresso)
    timerProgresso = setTimeout(() => aoProgresso?.(material.id, atual, folhas.length), 350)
  }
  let quadroRolagem = 0
  rolo.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(quadroRolagem)
      quadroRolagem = requestAnimationFrame(() => definirAtual(paginaNoTopo()))
    },
    { passive: true },
  )

  function definirZoom(novo) {
    const antes = atual
    const dentro = rolo.scrollTop - topos[antes - 1]
    const fator = novo / zoom
    zoom = novo
    aplicarTamanhos()
    rolo.scrollTop = topos[antes - 1] + dentro * fator
    visiveis.forEach(enfileirar)
    som?.tocar('passe')
  }
  function zoomPasso(dir) {
    const alvo = dir > 0 ? (ZOOMS.find((z) => z > zoom + 0.001) ?? ZOOMS.at(-1)) : ([...ZOOMS].reverse().find((z) => z < zoom - 0.001) ?? ZOOMS[0])
    if (alvo !== zoom) definirZoom(alvo)
  }

  // ---------- painel lateral ----------
  function abrirPainel(aba) {
    painel.hidden = false
    raiz.classList.add('com-painel')
    raiz.querySelectorAll('[data-painel]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.painel === aba)))
    raiz.querySelectorAll('[data-painel-aba]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.painelAba === aba)))
    raiz.querySelector('.painel__sumario').hidden = aba !== 'sumario'
    grade.hidden = aba !== 'paginas'
    raiz.querySelector('.painel__busca').hidden = aba !== 'busca'
    if (aba === 'paginas') prepararMiniaturas()
    if (aba === 'busca') setTimeout(() => campoBusca.focus(), 50)
    recalcularTopos()
  }
  function fecharPainel() {
    painel.hidden = true
    raiz.classList.remove('com-painel')
    raiz.querySelectorAll('[data-painel]').forEach((b) => b.setAttribute('aria-pressed', 'false'))
    recalcularTopos()
  }
  raiz.querySelectorAll('[data-painel]').forEach((b) =>
    b.addEventListener('click', () => {
      const aba = b.dataset.painel
      if (!painel.hidden && b.getAttribute('aria-pressed') === 'true') fecharPainel()
      else abrirPainel(aba)
    }),
  )
  raiz.querySelectorAll('[data-painel-aba]').forEach((b) => b.addEventListener('click', () => abrirPainel(b.dataset.painelAba)))
  raiz.querySelector('.painel__fechar')?.addEventListener('click', fecharPainel)

  function montarSumario() {
    listaSumario.innerHTML = ''
    for (const [nome, p] of material.sumario || []) {
      const li = document.createElement('li')
      const b = document.createElement('button')
      b.type = 'button'
      b.innerHTML = `<span></span><b>${p}</b>`
      b.firstChild.textContent = nome
      b.addEventListener('click', () => {
        irPara(p)
        if (innerWidth < 900) fecharPainel()
      })
      li.append(b)
      listaSumario.append(li)
    }
    if (material.atalho) {
      atalho.hidden = false
      atalho.textContent = `${material.atalho.rotulo} · pág. ${material.atalho.pagina}`
      atalho.onclick = () => {
        irPara(material.atalho.pagina)
        if (innerWidth < 900) fecharPainel()
      }
    } else atalho.hidden = true
  }

  // miniaturas desenhadas sob demanda
  let miniObs = null
  function prepararMiniaturas() {
    if (grade.dataset.doc === material.id) return
    grade.dataset.doc = material.id
    grade.innerHTML = ''
    miniObs?.disconnect()
    const g = geracao
    miniObs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting || e.target.dataset.ok) continue
          e.target.dataset.ok = '1'
          const p = Number(e.target.dataset.p)
          doc.getPage(p).then((pagina) => {
            if (g !== geracao) return
            const base = pagina.getViewport({ scale: 1 })
            const vp = pagina.getViewport({ scale: (110 * Math.min(devicePixelRatio || 1, 2)) / base.width })
            const c = document.createElement('canvas')
            c.width = Math.floor(vp.width)
            c.height = Math.floor(vp.height)
            pagina.render({ canvas: c, viewport: vp }).promise.then(() => e.target.prepend(c), () => {})
          })
        }
      },
      { root: grade, rootMargin: '200px 0px' },
    )
    for (let p = 1; p <= folhas.length; p++) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'miniatura' + (p === atual ? ' is-atual' : '')
      b.dataset.p = String(p)
      b.style.aspectRatio = `1 / ${proporcao}`
      b.innerHTML = `<span>${p}</span>`
      b.addEventListener('click', () => {
        irPara(p)
        if (innerWidth < 900) fecharPainel()
      })
      grade.append(b)
      miniObs.observe(b)
    }
  }

  // ---------- busca no documento ----------
  let timerBusca = 0
  async function buscarNoDocumento(texto, irAoPrimeiro = false) {
    consulta = texto
    achados = []
    achadoAtual = -1
    listaBusca.innerHTML = ''
    navBusca.hidden = true
    marcarTodas()
    if (!material.pesquisavel) {
      infoBusca.textContent = 'Este documento foi escaneado: ele é uma imagem e não tem texto para buscar. Use o sumário ou as miniaturas.'
      return
    }
    if (texto.trim().length < 2) {
      infoBusca.textContent = 'Digite pelo menos 2 letras.'
      return
    }
    infoBusca.textContent = 'Buscando…'
    try {
      achados = await paginasCom(texto, material.id)
    } catch {
      infoBusca.textContent = 'Não foi possível carregar o índice de busca. Verifique a conexão e tente de novo.'
      return
    }
    if (consulta !== texto) return
    const ocorrencias = achados.reduce((s, a) => s + a.ocorrencias, 0)
    infoBusca.textContent = achados.length ? `${ocorrencias} ${ocorrencias === 1 ? 'ocorrência' : 'ocorrências'} em ${achados.length} ${achados.length === 1 ? 'página' : 'páginas'}` : 'Nada encontrado neste material.'
    navBusca.hidden = achados.length < 2
    for (const [i, a] of achados.entries()) {
      const li = document.createElement('li')
      const b = document.createElement('button')
      b.type = 'button'
      b.innerHTML = `<b>pág. ${a.pagina}</b><span>${a.trecho}</span>`
      b.addEventListener('click', () => irAoAchado(i))
      li.append(b)
      listaBusca.append(li)
    }
    if (irAoPrimeiro && achados.length) irAoAchado(0)
  }
  function irAoAchado(i) {
    if (!achados.length) return
    achadoAtual = (i + achados.length) % achados.length
    listaBusca.querySelectorAll('button').forEach((b, k) => b.classList.toggle('is-atual', k === achadoAtual))
    navBusca.querySelector('.busca__pos').textContent = `${achadoAtual + 1} / ${achados.length}`
    irPara(achados[achadoAtual].pagina)
    if (innerWidth < 900) fecharPainel()
  }
  campoBusca.addEventListener('input', () => {
    clearTimeout(timerBusca)
    timerBusca = setTimeout(() => buscarNoDocumento(campoBusca.value), 260)
  })
  campoBusca.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (achados.length) irAoAchado(achadoAtual + (e.shiftKey ? -1 : 1))
      else buscarNoDocumento(campoBusca.value, true)
    }
  })
  navBusca.querySelector('[data-achado="-1"]').addEventListener('click', () => irAoAchado(achadoAtual - 1))
  navBusca.querySelector('[data-achado="1"]').addEventListener('click', () => irAoAchado(achadoAtual + 1))

  // ---------- barra ----------
  raiz.querySelector('[data-voltar]').addEventListener('click', () => aoVoltar?.())
  raiz.querySelectorAll('[data-pag]').forEach((b) => b.addEventListener('click', () => irPara(atual + Number(b.dataset.pag))))
  raiz.querySelectorAll('[data-zoom]').forEach((b) =>
    b.addEventListener('click', () => {
      const d = Number(b.dataset.zoom)
      if (d === 0) definirZoom(1)
      else zoomPasso(d)
    }),
  )
  num.addEventListener('change', () => irPara(Number(num.value)))
  num.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      irPara(Number(num.value))
      num.blur()
    }
  })

  // teclado
  raiz.addEventListener('keydown', (e) => {
    if (raiz.hidden) return
    const emCampo = e.target.closest('input, textarea, select')
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault()
      abrirPainel('busca')
      return
    }
    if (emCampo) return
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault()
      irPara(atual + 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault()
      irPara(atual - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      irPara(1)
    } else if (e.key === 'End') {
      e.preventDefault()
      irPara(folhas.length)
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      zoomPasso(1)
    } else if (e.key === '-') {
      e.preventDefault()
      zoomPasso(-1)
    }
  })

  // a janela mudou: a largura base acompanha
  const ro = new ResizeObserver(() => {
    if (!doc || raiz.hidden) return
    const antes = larguraBase
    medirBase()
    if (Math.abs(antes - larguraBase) < 2) return
    const p = atual
    aplicarTamanhos()
    rolo.scrollTop = topos[p - 1] - 10
    visiveis.forEach(enfileirar)
  })
  ro.observe(rolo)

  function mostrarEstado(html, carregando = false) {
    estado.hidden = !html
    estado.classList.toggle('is-carregando', carregando)
    if (html) estado.querySelector('.leitor__msg').innerHTML = html
  }

  // ---------- abrir / fechar ----------
  async function abrir(m, { pagina = 1, busca = '' } = {}) {
    geracao++
    const g = geracao
    material = m
    doc?.destroy?.()
    doc = null
    fila.length = 0
    visiveis.clear()
    perto.disconnect()
    longe.disconnect()
    folhas.forEach(liberar)
    folhas = []
    trilho.innerHTML = ''
    grade.dataset.doc = ''
    grade.innerHTML = ''
    titulo.textContent = m.titulo
    codigo.textContent = m.codigo || ''
    const url = new URL(m.arquivo, document.baseURI).href
    abrirPdf.href = url
    if (!artefato) {
      baixar.href = url
      baixar.setAttribute('download', `CDC - ${m.titulo}.pdf`)
    }
    total.textContent = `/ ${m.paginas}`
    num.max = String(m.paginas)
    num.value = String(pagina)
    campoBusca.value = busca
    consulta = busca
    infoBusca.textContent = m.pesquisavel ? 'Digite uma palavra para achar as páginas onde ela aparece.' : 'Este documento foi escaneado: ele é uma imagem e não tem texto para buscar. Use o sumário ou as miniaturas.'
    listaBusca.innerHTML = ''
    navBusca.hidden = true
    montarSumario()
    zoom = 1
    barra.style.transform = 'scaleX(0)'
    mostrarEstado('Abrindo o material…', true)

    try {
      pdfjs = await carregarPdfjs()
      if (g !== geracao) return
      const tarefa = pdfjs.getDocument({
        url,
        standardFontDataUrl: new URL('vendor/pdfjs/standard_fonts/', document.baseURI).href,
        isEvalSupported: false,
        verbosity: pdfjs.VerbosityLevel?.ERRORS ?? 0, // sem avisos de fonte no console
      })
      tarefa.onProgress = ({ loaded, total: t }) => {
        const p = t ? loaded / t : 0
        barra.style.transform = `scaleX(${p.toFixed(3)})`
        if (t) estado.querySelector('.leitor__msg').textContent = `Abrindo o material… ${Math.round(p * 100)}%`
      }
      const d = await tarefa.promise
      if (g !== geracao) {
        d.destroy()
        return
      }
      doc = d
      const primeira = await doc.getPage(1)
      const vp = primeira.getViewport({ scale: 1 })
      proporcao = vp.height / vp.width
    } catch (e) {
      if (g !== geracao) return
      console.warn('Leitor:', e)
      mostrarEstado(`Não foi possível abrir este material agora.<br><span class="leitor__acoes-erro"><button type="button" class="botao botao--brasa" data-tentar>Tentar de novo</button> <a class="botao botao--vidro" href="${url}" target="_blank" rel="noopener">Abrir o PDF ↗</a></span>`)
      estado.querySelector('[data-tentar]')?.addEventListener('click', () => abrir(m, { pagina, busca }))
      return
    }

    // folhas (placeholders) de todas as páginas
    const n = doc.numPages
    total.textContent = `/ ${n}`
    num.max = String(n)
    const frag = document.createDocumentFragment()
    for (let p = 1; p <= n; p++) {
      const el = document.createElement('div')
      el.className = 'folha'
      el.dataset.p = String(p)
      el.innerHTML = `<span class="folha__num">${p}</span>`
      const f = { el, pagina: p, prop: 0, canvas: null, texto: null, spans: null, chave: null, tarefa: null, naFila: false }
      el.__folha = f
      folhas.push(f)
      frag.append(el)
    }
    trilho.append(frag)
    medirBase()
    aplicarTamanhos()
    mostrarEstado('')
    atual = 0
    irPara(limitar(pagina, 1, n), false)
    folhas.forEach((f) => {
      perto.observe(f.el)
      longe.observe(f.el)
    })
    if (busca) {
      abrirPainel('busca')
      buscarNoDocumento(busca, false)
    } else if (innerWidth >= 1200 && (m.sumario || []).length) abrirPainel('sumario')
    else fecharPainel()
    rolo.focus({ preventScroll: true })
  }

  function fechar() {
    geracao++
    fila.length = 0
    visiveis.clear()
    perto.disconnect()
    longe.disconnect()
    folhas.forEach(liberar)
    folhas = []
    trilho.innerHTML = ''
    doc?.destroy?.()
    doc = null
    fecharPainel()
  }

  return { abrir, fechar, atual: () => atual }
}
