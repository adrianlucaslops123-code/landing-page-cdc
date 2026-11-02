/**
 * Microinterações: cursor próprio (ponto exato + anel com atraso, rótulos),
 * botões magnéticos, onda no clique, cartões que inclinam com luz que segue
 * o mouse, botões de copiar e o aviso (toast).
 */
import { gsap } from 'gsap'

let timerAviso = 0
export function aviso(msg) {
  const el = document.querySelector('.aviso')
  if (!el) return
  el.textContent = msg
  el.classList.add('is-visivel')
  clearTimeout(timerAviso)
  timerAviso = setTimeout(() => el.classList.remove('is-visivel'), 2600)
}

export function iniciarInteracao({ reduzido, som }) {
  const html = document.documentElement
  const fino = matchMedia('(hover: hover) and (pointer: fine)').matches

  // ---------- cursor ----------
  if (fino && !reduzido) {
    html.classList.add('tem-cursor')
    const cursor = document.querySelector('.cursor')
    const ponto = cursor.querySelector('.cursor__ponto')
    const anel = cursor.querySelector('.cursor__anel')
    const rotulo = cursor.querySelector('.cursor__rotulo')
    const pX = gsap.quickSetter(ponto, 'x', 'px')
    const pY = gsap.quickSetter(ponto, 'y', 'px')
    const aX = gsap.quickTo(anel, 'x', { duration: 0.38, ease: 'power3.out' })
    const aY = gsap.quickTo(anel, 'y', { duration: 0.38, ease: 'power3.out' })
    gsap.set([ponto, anel], { x: innerWidth / 2, y: innerHeight / 2 })
    cursor.classList.add('is-oculto')

    addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return
        cursor.classList.remove('is-oculto')
        pX(e.clientX)
        pY(e.clientY)
        aX(e.clientX)
        aY(e.clientY)
        const alvo = e.target.closest ? e.target : null
        const comRotulo = alvo?.closest('[data-cursor]')
        const link = alvo?.closest('a, button, summary, label, select')
        const calor = !link && alvo?.closest('.hero__palco, .hero')
        cursor.classList.toggle('is-rotulo', !!comRotulo)
        cursor.classList.toggle('is-link', !comRotulo && !!link)
        cursor.classList.toggle('is-calor', !comRotulo && !link && !!calor && scrollY < innerHeight * 0.5)
        if (comRotulo) rotulo.textContent = comRotulo.dataset.cursor
      },
      { passive: true },
    )
    addEventListener('pointerdown', () => cursor.classList.add('is-apertado'))
    addEventListener('pointerup', () => cursor.classList.remove('is-apertado'))
    document.addEventListener('pointerleave', () => cursor.classList.add('is-oculto'))
    addEventListener('blur', () => cursor.classList.add('is-oculto'))
  }

  // ---------- botões magnéticos ----------
  if (fino && !reduzido) {
    document.querySelectorAll('[data-magnetico]').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' })
      const my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' })
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect()
        mx((e.clientX - (r.left + r.width / 2)) * 0.28)
        my((e.clientY - (r.top + r.height / 2)) * 0.36)
      })
      el.addEventListener('pointerenter', () => som?.tocar('passe'))
      el.addEventListener('pointerleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: true })
      })
    })
  }

  // ---------- onda no clique dos botões ----------
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.botao')
    if (!b || reduzido) return
    const r = b.getBoundingClientRect()
    const o = document.createElement('span')
    o.className = 'onda'
    o.style.left = `${e.clientX - r.left}px`
    o.style.top = `${e.clientY - r.top}px`
    b.appendChild(o)
    setTimeout(() => o.remove(), 750)
    som?.tocar('clique')
  })

  // ---------- cartões: inclinação + luz que segue o mouse ----------
  if (fino) {
    document.querySelectorAll('[data-inclinar], [data-luz]').forEach((el) => {
      const inclina = el.hasAttribute('data-inclinar') && !reduzido
      const rx = inclina ? gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' }) : null
      const ry = inclina ? gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' }) : null
      if (inclina) gsap.set(el, { transformPerspective: 1100 })
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width
        const py = (e.clientY - r.top) / r.height
        el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`)
        el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`)
        el.style.setProperty('--brilho', '1')
        if (inclina) {
          rx(-(py - 0.5) * 7)
          ry((px - 0.5) * 9)
        }
      })
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--brilho', '0')
        if (inclina) {
          rx(0)
          ry(0)
        }
      })
    })
  }

  // ---------- copiar ----------
  document.querySelectorAll('[data-copiar]').forEach((b) => {
    b.addEventListener('click', () => {
      const texto = b.dataset.copiar
      const feito = () => {
        b.textContent = 'Copiado'
        b.classList.add('is-feito')
        aviso(`Copiado: ${texto}`)
        setTimeout(() => {
          b.textContent = 'Copiar'
          b.classList.remove('is-feito')
        }, 1800)
      }
      const selecionar = () => {
        const alvo = b.previousElementSibling
        if (!alvo) return
        const sel = getSelection()
        const faixa = document.createRange()
        faixa.selectNodeContents(alvo)
        sel.removeAllRanges()
        sel.addRange(faixa)
        aviso('Selecionei para você. Use Ctrl+C ou Copiar.')
      }
      try {
        navigator.clipboard.writeText(texto).then(feito, selecionar)
      } catch {
        selecionar()
      }
    })
  })
}
