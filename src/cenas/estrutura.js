/**
 * Estrutura: a fita de fotos anda na horizontal enquanto a página desce
 * (cena presa), com as fotos inclinando conforme a velocidade da rolagem e um
 * leve paralaxe dentro de cada quadro. A rota CDC → SENAI → FBTS se desenha.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function iniciarEstrutura() {
  const filme = document.querySelector('.filme')
  const trilho = filme?.querySelector('.filme__trilho')
  const fotos = filme ? [...filme.querySelectorAll('img')] : []
  const mm = gsap.matchMedia()

  mm.add('(min-width: 761px) and (prefers-reduced-motion: no-preference)', () => {
    const distancia = () => Math.max(0, trilho.scrollWidth - innerWidth)
    const inclina = gsap.quickTo(fotos, 'skewX', { duration: 0.5, ease: 'power3.out' })
    gsap.set(fotos, { scale: 1.12, transformOrigin: '50% 50%' })
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: filme,
        start: 'center center',
        end: () => `+=${distancia()}`,
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          inclina(gsap.utils.clamp(-7, 7, self.getVelocity() / -320))
        },
        onScrubComplete: () => inclina(0),
      },
    })
    tl.to(trilho, { x: () => -distancia(), ease: 'none' }, 0)
    tl.fromTo(fotos, { xPercent: 5 }, { xPercent: -5, ease: 'none' }, 0)
    return () => gsap.set([trilho, fotos], { clearProps: 'all' })
  })

  // rota
  const rota = document.querySelector('.rota')
  if (rota) {
    const linhas = rota.querySelectorAll('.rota__linha')
    const nos = rota.querySelectorAll('.rota__no, .rota__dist')
    gsap.set(nos, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' })
    ScrollTrigger.create({
      trigger: rota,
      start: 'top 78%',
      once: true,
      onEnter() {
        gsap.from(linhas, { opacity: 0, duration: 0.8, stagger: 0.3 })
        gsap.to(nos, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2.4)', stagger: 0.14, delay: 0.2 })
        gsap.to(linhas, { strokeDashoffset: -60, duration: 4, ease: 'none', repeat: -1 })
      },
    })
  }
}
