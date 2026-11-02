/**
 * Hero: entrada depois da abertura (título sobe palavra por palavra, o resto
 * surge em cascata) e saída presa à rolagem: o hero fica preso por uma tela
 * enquanto a câmera atravessa o logo e o texto se desfaz em desfoque.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { dividirTitulo } from '../motor/texto.js'

gsap.registerPlugin(ScrollTrigger)

export function entradaHero({ reduzido }) {
  const hero = document.querySelector('.hero')
  const titulo = hero.querySelector('[data-titulo]')
  const resto = hero.querySelectorAll('.selo, [data-surgir], .hero__lema, .hero__rolar')
  if (reduzido) {
    gsap.set(titulo, { visibility: 'visible' })
    gsap.set(resto, { opacity: 1 })
    return
  }
  const tocar = dividirTitulo(titulo, { aoScroll: false, atraso: 0.15 })
  tocar()
  gsap.fromTo(resto, { opacity: 0, y: 22, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'expo.out', stagger: 0.1, delay: 0.45, clearProps: 'filter' })
  document.documentElement.classList.add('is-pronto')
}

export function saidaHero({ logo, reduzido, som }) {
  const hero = document.querySelector('.hero')
  const conteudo = hero.querySelectorAll('.hero__conteudo, .hero__lema, .hero__dica, .hero__rolar')
  let virou = false

  if (reduzido) {
    ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', onUpdate: (self) => logo?.saida(self.progress) })
    return
  }

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: () => `+=${innerHeight}`,
      pin: true,
      scrub: true,
      anticipatePin: 1,
      onUpdate(self) {
        logo?.saida(self.progress)
        if (self.progress > 0.5 && !virou) {
          virou = true
          som?.tocar('virada')
        } else if (self.progress < 0.3) virou = false
      },
    },
  })
  tl.to(conteudo, { opacity: 0, y: -50, filter: 'blur(10px)', ease: 'power1.in', duration: 0.5, stagger: 0.02 }, 0)
  tl.to(hero, { '--vinheta': 1, duration: 1 }, 0)
}
