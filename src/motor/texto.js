/**
 * Tipografia em movimento.
 *  [data-titulo]   linhas com máscara; as palavras sobem do corte (SplitText)
 *  [data-surgir]   sobe 26 px saindo de um desfoque, em cascata por lote
 *  [data-destaque] cada palavra acende conforme a rolagem (scrub)
 *  [data-contar]   número conta até o valor, com os dígitos embaralhando
 *  .nav__links a   letras embaralham no hover
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin)

const DESTAQUES = /^(2005|reprovação|provas)[.,]?$/i

export function dividirTitulo(el, { aoScroll = true, atraso = 0 } = {}) {
  let anim
  SplitText.create(el, {
    type: 'lines,words',
    mask: 'lines',
    linesClass: 'linha-mascara',
    autoSplit: true,
    onSplit(self) {
      gsap.set(el, { visibility: 'visible' })
      anim = gsap.from(self.words, {
        yPercent: 118,
        rotate: 3,
        duration: 1.15,
        delay: atraso,
        ease: 'expo.out',
        stagger: 0.04,
        paused: !aoScroll,
        scrollTrigger: aoScroll ? { trigger: el, start: 'top 88%', once: true } : undefined,
      })
      return anim
    },
  })
  return () => anim?.play()
}

export function iniciarTexto({ som }) {
  // títulos (o do hero entra com a abertura)
  document.querySelectorAll('[data-titulo]').forEach((el) => {
    if (!el.closest('.hero')) dividirTitulo(el)
  })

  // blocos que surgem
  const blocos = [...document.querySelectorAll('[data-surgir]')].filter((el) => !el.closest('.hero'))
  ScrollTrigger.batch(blocos, {
    start: 'top 90%',
    once: true,
    onEnter: (lote) =>
      gsap.fromTo(
        lote,
        { opacity: 0, y: 26, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.05, ease: 'expo.out', stagger: 0.09, clearProps: 'filter' },
      ),
  })

  // manifesto: as palavras acendem com a rolagem
  document.querySelectorAll('[data-destaque]').forEach((el) => {
    const split = SplitText.create(el, { type: 'words', wordsClass: 'palavra' })
    split.words.forEach((w) => {
      if (DESTAQUES.test(w.textContent.trim())) w.dataset.cor = '1'
    })
    gsap.set(split.words, { opacity: 0.13 })
    gsap
      .timeline({ scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: 0.6 } })
      .to(split.words, { opacity: 1, stagger: 0.06, ease: 'none', duration: 0.3 }, 0)
      .to(split.words.filter((w) => w.dataset.cor), { color: '#fb781e', stagger: 0.06, duration: 0.3 }, 0.6)
  })

  // números que contam
  document.querySelectorAll('[data-contar]').forEach((el) => {
    const fim = Number(el.dataset.contar)
    const inicio = Number(el.dataset.de || 0)
    el.textContent = String(inicio)
    const obj = { v: inicio }
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          v: fim,
          duration: 2,
          ease: 'expo.out',
          onUpdate() {
            const atual = Math.round(obj.v)
            const progresso = this.progress()
            // dígitos ainda instáveis embaralham, como um mostrador acertando
            if (progresso < 0.55 && atual !== fim) {
              const s = String(atual)
              const fixos = Math.max(0, s.length - 1 - Math.floor((0.55 - progresso) * 4))
              el.textContent = s.slice(0, fixos) + s.slice(fixos).replace(/\d/g, () => String((Math.random() * 10) | 0))
            } else el.textContent = String(atual)
          },
          onComplete: () => (el.textContent = String(fim)),
        })
      },
    })
  })

  // letras embaralham no hover dos links da navegação
  if (!document.documentElement.classList.contains('toque')) {
    document.querySelectorAll('.nav__links a, .rodape__links a').forEach((a) => {
      const texto = a.textContent
      a.addEventListener('mouseenter', () => {
        gsap.to(a, { duration: 0.55, scrambleText: { text: texto, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', speed: 0.9, revealDelay: 0.08 }, overwrite: true })
        som?.tocar('passe')
      })
    })
  }
}
