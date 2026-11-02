/**
 * Abertura: o logo enche de metal fundido de baixo para cima enquanto as
 * fontes e o logo de partículas ficam prontos (no mínimo 1 s, no máximo
 * 3,2 s). Depois a cortina sobe e a página aparece.
 * Devolve uma promessa resolvida no instante em que a cortina começa a subir.
 */
import { gsap } from 'gsap'

export function abrir({ tarefas, reduzido }) {
  const html = document.documentElement
  const el = document.querySelector('.carga')
  const num = el?.querySelector('.carga__num')
  if (!el || reduzido) {
    html.classList.add('sem-carga')
    return Promise.all(tarefas.map((t) => Promise.race([t, espera(1500)])))
  }

  const estado = { p: 0 }
  let feitas = 0
  const total = tarefas.length
  const desenhar = () => {
    el.style.setProperty('--carga', estado.p.toFixed(3))
    num.textContent = String(Math.round(estado.p * 100)).padStart(3, '0')
  }
  const avancar = (alvo, dur) => gsap.to(estado, { p: alvo, duration: dur, ease: 'power2.out', onUpdate: desenhar, overwrite: true })
  // anda sozinho até 30% enquanto espera, para nunca parecer travado
  avancar(0.3, 0.9)
  tarefas.forEach((t) =>
    Promise.resolve(t)
      .catch(() => {})
      .then(() => {
        feitas++
        avancar(0.3 + (feitas / total) * 0.6, 0.6)
      }),
  )

  const tudo = Promise.all(tarefas.map((t) => Promise.resolve(t).catch(() => {})))
  return Promise.race([Promise.all([tudo, espera(1000)]), espera(3200)]).then(
    () =>
      new Promise((ok) => {
        gsap
          .timeline({
            onComplete: () => {
              el.remove()
            },
          })
          .to(estado, { p: 1, duration: 0.45, ease: 'power2.inOut', onUpdate: desenhar })
          .to('.carga__marca', { scale: 1.08, filter: 'drop-shadow(0 0 28px rgba(255, 178, 74, 0.9))', duration: 0.35, ease: 'power2.out' })
          .add(() => ok())
          .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.0, ease: 'expo.inOut' }, '+=0.05')
          .to('.carga__marca', { y: -60, opacity: 0, duration: 0.6, ease: 'power2.in' }, '<')
      }),
  )
}

function espera(ms) {
  return new Promise((ok) => setTimeout(ok, ms))
}
