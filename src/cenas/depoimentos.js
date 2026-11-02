/**
 * Depoimentos: troca automática a cada 7 s enquanto estão na tela (pausa com
 * o mouse em cima ou com o foco dentro), setas, teclado e arrastar no dedo.
 * A fala nova entra palavra por palavra.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText)

export function iniciarDepoimentos({ reduzido, som }) {
  const caixa = document.querySelector('.falas')
  if (!caixa) return
  const falas = [...caixa.querySelectorAll('.fala')]
  const pos = document.querySelector('.falas__pos b')
  const divisoes = falas.map((f) => SplitText.create(f.querySelector('blockquote'), { type: 'words', wordsClass: 'pal' }))
  let atual = 0
  let timer = 0
  let naTela = false
  let pausado = false

  function mostrar(i) {
    i = (i + falas.length) % falas.length
    if (i === atual) return
    const antes = falas[atual]
    const agora = falas[i]
    antes.classList.remove('is-ativa')
    agora.classList.add('is-ativa')
    atual = i
    pos.textContent = String(i + 1)
    if (!reduzido) {
      gsap.fromTo(divisoes[i].words, { opacity: 0, y: 18, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'expo.out', stagger: 0.025, clearProps: 'filter' })
      gsap.fromTo(agora.querySelector('figcaption'), { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.7, delay: 0.3, ease: 'expo.out' })
    }
    som?.tocar('passe')
    agendar()
  }
  function agendar() {
    clearTimeout(timer)
    if (naTela && !pausado && !reduzido) timer = setTimeout(() => mostrar(atual + 1), 7000)
  }

  document.querySelectorAll('[data-falas]').forEach((b) => b.addEventListener('click', () => mostrar(atual + Number(b.dataset.falas))))
  caixa.setAttribute('tabindex', '0')
  caixa.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') mostrar(atual + 1)
    if (e.key === 'ArrowLeft') mostrar(atual - 1)
  })
  const secao = caixa.closest('.secao')
  secao.addEventListener('pointerenter', () => ((pausado = true), clearTimeout(timer)))
  secao.addEventListener('pointerleave', () => ((pausado = false), agendar()))
  secao.addEventListener('focusin', () => ((pausado = true), clearTimeout(timer)))
  secao.addEventListener('focusout', () => ((pausado = false), agendar()))

  // arrastar no dedo
  let x0 = null
  caixa.addEventListener('pointerdown', (e) => (x0 = e.clientX))
  caixa.addEventListener('pointerup', (e) => {
    if (x0 === null) return
    const dx = e.clientX - x0
    if (Math.abs(dx) > 50) mostrar(atual + (dx < 0 ? 1 : -1))
    x0 = null
  })

  ScrollTrigger.create({
    trigger: secao,
    start: 'top 70%',
    end: 'bottom 30%',
    onToggle(self) {
      naTela = self.isActive
      if (naTela) agendar()
      else clearTimeout(timer)
    },
  })
}
