/**
 * Rolagem: Lenis (suave e com inércia) sincronizado com o ScrollTrigger,
 * âncoras internas, navegação que some ao descer e volta ao subir, link da
 * seção atual aceso, e o progresso desenhado como um cordão de solda.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

export function criarRolagem({ reduzido, toque }) {
  let lenis = null
  if (!reduzido && !toque) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((tempo) => lenis.raf(tempo * 1000))
    gsap.ticker.lagSmoothing(0)
  }
  ScrollTrigger.config({ ignoreMobileResize: true })

  const parar = () => {
    lenis?.stop()
    document.documentElement.style.overflow = 'hidden'
  }
  const seguir = () => {
    lenis?.start()
    document.documentElement.style.overflow = ''
  }

  // aceita um elemento ou uma posição em px
  function irPara(alvo, imediato = false) {
    if (alvo === null || alvo === undefined) return
    if (lenis) {
      lenis.scrollTo(alvo, { immediate: imediato, duration: 1.7, easing: (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2) })
      return
    }
    const comportamento = imediato || reduzido ? 'auto' : 'smooth'
    if (typeof alvo === 'number') scrollTo({ top: alvo, behavior: comportamento })
    else alvo.scrollIntoView({ behavior: comportamento })
  }

  return { lenis, parar, seguir, irPara }
}

export function ligarRolagem({ rolagem, som, aoAncora }) {
  const html = document.documentElement
  const nav = document.querySelector('.nav')
  const zap = document.querySelector('.zap')
  const cordao = document.querySelector('.cordao')
  const cordaoNum = document.querySelector('.cordao__num')

  // âncoras internas com rolagem suave
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]')
    if (!a) return
    const id = a.getAttribute('href').slice(1)
    if (!id) return
    const alvo = document.getElementById(id)
    if (!alvo) return
    e.preventDefault()
    aoAncora?.()
    rolagem.irPara(alvo)
    alvo.setAttribute('tabindex', '-1')
    alvo.focus({ preventScroll: true })
    som?.tocar('clique')
  })

  // estado da rolagem: nav sólida, some ao descer, volta ao subir
  let escondida = false
  let timerRolando = 0
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const y = self.scroll()
      nav.classList.toggle('is-solida', y > 40)
      html.classList.toggle('is-rolou', y > innerHeight * 0.6)
      zap.classList.toggle('is-visivel', y > innerHeight * 0.7)
      const esconder = self.direction === 1 && y > innerHeight * 1.1
      if (esconder !== escondida && !html.classList.contains('menu-aberto')) {
        escondida = esconder
        gsap.to(nav, { yPercent: esconder ? -160 : 0, duration: esconder ? 0.45 : 0.7, ease: esconder ? 'power2.in' : 'expo.out', overwrite: true })
      }
      // cordão de solda
      cordao.style.setProperty('--p', self.progress.toFixed(4))
      cordaoNum.textContent = String(Math.round(self.progress * 100)).padStart(2, '0')
      // som do ambiente acompanha a velocidade
      som?.velocidade(Math.abs(self.getVelocity()))
      // hover desligado enquanto rola com o cursor parado
      html.classList.add('is-rolando')
      clearTimeout(timerRolando)
      timerRolando = setTimeout(() => html.classList.remove('is-rolando'), 160)
    },
  })

  // link da seção atual
  const links = [...document.querySelectorAll('.nav__links a')]
  links.forEach((link) => {
    const secao = document.getElementById(link.getAttribute('href').slice(1))
    if (!secao) return
    ScrollTrigger.create({
      trigger: secao,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle(self) {
        if (self.isActive) links.forEach((l) => l.classList.toggle('is-aqui', l === link))
        else link.classList.remove('is-aqui')
      },
    })
  })
}
