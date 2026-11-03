/**
 * Área comum · Vídeos: desenha os vídeos da lista VIDEOS (materiais.js)
 * dentro do painel de vídeos que já existe no portal.
 * Cada vídeo tem o seu espaço; a capa vira o player do YouTube (embed) no
 * clique, e o vídeo para sozinho quando a aba ou o portal são fechados.
 * Não altera nada além do conteúdo desse painel.
 */
import { VIDEOS } from './materiais.js'

const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function capa(v) {
  return `<button class="video__capa" type="button" data-tocar="${escapar(v.youtube)}" data-inicio="${Number(v.inicio) || 0}" aria-label="Reproduzir o vídeo: ${escapar(v.titulo)}">
      <img src="https://i.ytimg.com/vi/${escapar(v.youtube)}/sddefault.jpg" alt="" width="640" height="480" loading="lazy" decoding="async" />
      <span class="video__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg></span>
    </button>`
}

export function montarVideos() {
  try {
    const painel = document.querySelector('[data-painel-de="videos"]')
    if (!painel || !VIDEOS.length) return
    const portal = painel.closest('.portal')
    const vazio = painel.querySelector('.vazio')
    if (vazio) vazio.hidden = true

    const lista = document.createElement('div')
    lista.className = 'videos'
    lista.innerHTML = VIDEOS.map(
      (v, i) => `
      <article class="video" id="video-${escapar(v.id)}" data-video="${i}">
        <div class="video__tela">${capa(v)}</div>
        <div class="video__info">
          <p class="video__tipo">Vídeo ${String(i + 1).padStart(2, '0')} <span>${escapar(v.canal || 'YouTube')}</span></p>
          <h3>${escapar(v.titulo)}</h3>
          <a class="video__link" href="${escapar(v.link)}" target="_blank" rel="noopener">Assistir no YouTube <span aria-hidden="true">↗</span></a>
        </div>
      </article>`,
    ).join('')
    painel.appendChild(lista)

    // volta todos os players para a capa (para o som e libera memória)
    const parar = () => {
      lista.querySelectorAll('.video__tela iframe').forEach((f) => {
        const v = VIDEOS[Number(f.closest('.video').dataset.video)]
        f.parentElement.innerHTML = capa(v)
      })
    }

    lista.addEventListener('click', (e) => {
      const botao = e.target.closest('[data-tocar]')
      if (!botao) return
      parar() // um vídeo por vez
      const tela = lista.querySelector(`[data-video="${botao.closest('.video').dataset.video}"] .video__tela`)
      const v = VIDEOS[Number(tela.closest('.video').dataset.video)]
      const inicio = Number(v.inicio) || 0
      const f = document.createElement('iframe')
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.youtube)}?autoplay=1&rel=0&playsinline=1${inicio ? `&start=${inicio}` : ''}`
      f.title = v.titulo
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      f.allowFullscreen = true
      f.referrerPolicy = 'strict-origin-when-cross-origin'
      tela.replaceChildren(f)
      f.focus({ preventScroll: true })
    })

    // aba de vídeos escondida ou portal fechado: o vídeo para
    const observar = new MutationObserver(() => {
      if (painel.hidden || portal?.hidden) parar()
    })
    observar.observe(painel, { attributes: true, attributeFilter: ['hidden'] })
    if (portal) observar.observe(portal, { attributes: true, attributeFilter: ['hidden'] })
  } catch (erro) {
    console.warn('Vídeos da área comum desligados:', erro)
  }
}
