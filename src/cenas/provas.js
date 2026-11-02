/**
 * Prova por prova. No computador a cena fica presa na tela e troca uma prova
 * por marco de rolagem (0,7 tela por prova); o texto sai e entra em cascata e
 * a ilustração da prova roda sua animação. No celular (ou sem movimento) as
 * provas ficam em lista e cada ilustração anima ao entrar na tela.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const limitar = (v, a, b) => Math.min(b, Math.max(a, v))

function desenharTraco(els, opcoes = {}) {
  const lista = gsap.utils.toArray(els)
  lista.forEach((p) => {
    const L = p.getTotalLength ? p.getTotalLength() : 200
    gsap.set(p, { strokeDasharray: L, strokeDashoffset: L })
  })
  return gsap.to(lista, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut', stagger: 0.18, ...opcoes })
}

// uma linha do tempo por ilustração
const ANIMACOES = {
  teorica(fig) {
    const tl = gsap.timeline()
    tl.from(fig.querySelectorAll('.ilus__linhas g'), { opacity: 0, x: -12, stagger: 0.08, duration: 0.5, ease: 'power2.out' })
    tl.fromTo(fig.querySelectorAll('.ilus__marcas circle'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, stagger: 0.22, duration: 0.5, ease: 'back.out(3)' }, '-=0.1')
    return tl
  },
  documentos(fig) {
    const tl = gsap.timeline()
    tl.from(fig.querySelectorAll('.ilus__chapa'), { opacity: 0, y: 10, duration: 0.5 })
    tl.add(desenharTraco(fig.querySelectorAll('.ilus__traco')), '-=0.1')
    tl.from(fig.querySelectorAll('.ilus__cota, .ilus__leg'), { opacity: 0, duration: 0.4, stagger: 0.1 }, '-=0.3')
    return tl
  },
  termico(fig) {
    const curva = fig.querySelector('.ilus__curva')
    const ponto = fig.querySelector('.ilus__ponto')
    const leitura = fig.querySelector('.ilus__leitura')
    const L = curva.getTotalLength()
    gsap.set(curva, { strokeDasharray: L, strokeDashoffset: L })
    const estado = { p: 0 }
    const tl = gsap.timeline()
    tl.to(estado, {
      p: 1,
      duration: 3.2,
      ease: 'none',
      onUpdate() {
        const pt = curva.getPointAtLength(estado.p * L)
        curva.style.strokeDashoffset = String(L * (1 - estado.p))
        ponto.setAttribute('cx', pt.x)
        ponto.setAttribute('cy', pt.y)
        // escala de exemplo: y 250 → 25 °C, y 95 → 600 °C
        const temp = Math.round(25 + ((250 - pt.y) * 575) / 155)
        leitura.textContent = `${temp} °C`
        leitura.setAttribute('x', pt.x + 12)
        leitura.setAttribute('y', pt.y - 14)
      },
    })
    tl.from(fig.querySelectorAll('.ilus__leg'), { opacity: 0, duration: 0.5, stagger: 0.25 }, 0.3)
    return tl
  },
  acompanhamento(fig) {
    const itens = fig.querySelectorAll('.ilus__item')
    const checks = fig.querySelectorAll('.ilus__item path')
    const tl = gsap.timeline()
    tl.from(itens, { opacity: 0, x: -10, duration: 0.4, stagger: 0.07 })
    checks.forEach((c) => {
      const L = c.getTotalLength()
      gsap.set(c, { strokeDasharray: L, strokeDashoffset: L })
    })
    tl.to(checks, { strokeDashoffset: 0, duration: 0.3, stagger: 0.16, ease: 'power2.out' }, '-=0.2')
    tl.fromTo(fig.querySelector('.ilus__fio ~ .ilus__ponto, .ilus__ponto'), { attr: { cx: 40 } }, { attr: { cx: 440 }, duration: 1.6, ease: 'power1.inOut' }, 0.4)
    return tl
  },
  visual(fig) {
    const lente = fig.querySelector('.ilus__lente')
    const clip = fig.querySelector('.ilus__lente-clip')
    const cabo = fig.querySelector('.ilus__cabo')
    const a = fig.querySelector('.ilus__rotulo-a')
    const b = fig.querySelector('.ilus__rotulo-b')
    const estado = { x: 120 }
    const mover = () => {
      lente.setAttribute('cx', estado.x)
      clip.setAttribute('cx', estado.x)
      cabo.setAttribute('d', `M${estado.x + 44} 204 L${estado.x + 90} 250`)
    }
    gsap.set([a, b], { opacity: 0 })
    const tl = gsap.timeline()
    tl.to(estado, { x: 172, duration: 1.1, ease: 'power2.inOut', onUpdate: mover })
    tl.to(a, { opacity: 1, duration: 0.3 })
    tl.to(estado, { x: 314, duration: 1.3, ease: 'power2.inOut', onUpdate: mover }, '+=0.3')
    tl.to(b, { opacity: 1, duration: 0.3 })
    return tl
  },
  dureza(fig) {
    const batidas = fig.querySelectorAll('.ilus__batida')
    const x = fig.querySelector('.ilus__x')
    const leg = fig.querySelectorAll('.ilus__leg')
    gsap.set(leg, { opacity: 0 })
    const L = x.getTotalLength()
    gsap.set(x, { strokeDasharray: L, strokeDashoffset: L })
    const tl = gsap.timeline()
    batidas.forEach((bt, i) => {
      tl.fromTo(bt, { scale: 1.6, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: 0.45, ease: 'expo.out' }, i * 0.75)
      tl.to(leg[i], { opacity: 1, duration: 0.3 }, i * 0.75 + 0.2)
      if (i === 1) tl.to(x, { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' }, i * 0.75 + 0.35)
    })
    return tl
  },
  estufas(fig) {
    const tl = gsap.timeline()
    tl.from(fig.querySelectorAll('.ilus__eletrodos path'), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.5, stagger: 0.06, ease: 'back.out(2)' })
    tl.fromTo(fig.querySelector('.ilus__termo-cheio'), { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 0.2)
    tl.fromTo(fig.querySelector('.ilus__ponteiro'), { rotation: -120, svgOrigin: '190 246' }, { rotation: 70, svgOrigin: '190 246', duration: 1.6, ease: 'power2.inOut' }, 0.2)
    tl.to(fig.querySelector('.ilus__brilho'), { opacity: 1, duration: 0.6, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.8)
    return tl
  },
  recertificacao(fig) {
    const etapas = fig.querySelectorAll('.ilus__etapa')
    const cheio = fig.querySelector('.ilus__fio-cheio')
    const L = cheio.getTotalLength()
    etapas.forEach((e) => e.classList.remove('is-feita'))
    gsap.set(cheio, { strokeDasharray: L, strokeDashoffset: L })
    const tl = gsap.timeline()
    tl.from(etapas, { opacity: 0, y: 12, stagger: 0.12, duration: 0.5 })
    tl.add(() => etapas[0].classList.add('is-feita'))
    tl.to(cheio, { strokeDashoffset: L / 2, duration: 0.9, ease: 'power2.inOut' })
    tl.add(() => etapas[1].classList.add('is-feita'))
    tl.to(cheio, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' })
    tl.add(() => etapas[2].classList.add('is-feita'))
    return tl
  },
}

export function iniciarProvas({ som }) {
  const html = document.documentElement
  const secao = document.querySelector('.provas')
  if (!secao) return
  const palco = secao.querySelector('.provas__palco')
  const provas = [...secao.querySelectorAll('.prova')]
  const itens = [...secao.querySelectorAll('.provas__indice li')]
  const contador = secao.querySelector('.provas__contador b')
  const n = provas.length
  const linhas = new Map()

  function animar(prova) {
    const tipo = prova.dataset.prova
    linhas.get(prova)?.kill()
    const fig = prova.querySelector('svg')
    if (!fig || !ANIMACOES[tipo]) return
    linhas.set(prova, ANIMACOES[tipo](fig))
  }

  const mm = gsap.matchMedia()

  mm.add('(min-width: 901px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)', () => {
    html.classList.add('provas-presas')
    let atual = -1

    function mostrar(i, sentido) {
      const antes = provas[atual]
      const agora = provas[i]
      if (antes) {
        const sai = antes.querySelectorAll('.prova__texto > *')
        gsap.killTweensOf(sai)
        gsap.to(sai, { y: -28 * sentido, opacity: 0, filter: 'blur(6px)', duration: 0.32, ease: 'power2.in', stagger: 0.025 })
        gsap.to(antes.querySelector('.prova__fig'), {
          opacity: 0,
          scale: 0.97,
          duration: 0.34,
          ease: 'power2.in',
          onComplete: () => antes !== provas[atual] && antes.classList.remove('is-ativa'),
        })
      }
      atual = i
      agora.classList.add('is-ativa')
      const entra = agora.querySelectorAll('.prova__texto > *')
      gsap.killTweensOf(entra)
      gsap.fromTo(entra, { y: 40 * sentido, opacity: 0, filter: 'blur(10px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.95, ease: 'expo.out', stagger: 0.06, delay: 0.18 })
      gsap.fromTo(
        agora.querySelector('.prova__fig'),
        { opacity: 0, scale: 1.04, clipPath: 'inset(0% 0% 100% 0% round 18px)' },
        { opacity: 1, scale: 1, clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.05, ease: 'expo.inOut', delay: 0.1, onComplete: () => animar(agora) },
      )
      itens.forEach((li, k) => li.classList.toggle('is-ativa', k === i))
      gsap.to(contador, { duration: 0.5, scrambleText: { text: String(i + 1).padStart(2, '0'), chars: '0123456789', speed: 1 } })
      som?.tocar('virada')
    }

    provas.forEach((p) => p.classList.remove('is-ativa'))
    mostrar(0, 1)

    const st = ScrollTrigger.create({
      trigger: palco,
      start: 'top top',
      end: () => `+=${n * 0.7 * innerHeight}`,
      pin: true,
      anticipatePin: 1,
      onUpdate(self) {
        const p = self.progress * n
        itens.forEach((li, k) => li.style.setProperty('--enchido', limitar(p - k, 0, 1).toFixed(3)))
        const i = limitar(Math.floor(p), 0, n - 1)
        if (i !== atual) mostrar(i, i > atual ? 1 : -1)
      },
    })

    // clicar no índice leva à prova
    itens.forEach((li, k) => {
      li.style.cursor = 'pointer'
      li.addEventListener('click', () => {
        const y = st.start + ((k + 0.5) / n) * (st.end - st.start)
        window.__rolagem?.irPara(y)
      })
    })

    return () => {
      html.classList.remove('provas-presas')
      linhas.forEach((tl) => tl.kill())
      provas.forEach((p) => {
        p.classList.remove('is-ativa')
        gsap.set([p.querySelectorAll('.prova__texto > *'), p.querySelector('.prova__fig')], { clearProps: 'all' })
      })
    }
  })

  mm.add('(max-width: 900px), (max-height: 619px), (prefers-reduced-motion: reduce)', () => {
    const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches
    const gatilhos = provas.map((p) =>
      ScrollTrigger.create({
        trigger: p.querySelector('.prova__fig'),
        start: 'top 80%',
        once: true,
        onEnter: () => (reduzido ? null : animar(p)),
      }),
    )
    return () => gatilhos.forEach((g) => g.kill())
  })
}
