/**
 * Brasas subindo devagar, como as que sobram depois da solda.
 * Canvas 2D leve com mistura aditiva ('lighter'); para quando sai da tela.
 * Determinístico: as brasas nascem de um gerador com semente, então a cena
 * é sempre a mesma ao recarregar.
 */

function semente(s) {
  // mulberry32
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function brasas({ alvo, quantidade = 140, reduzido = false }) {
  const canvas = document.createElement('canvas')
  alvo.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  const aleatorio = semente(2005)
  let L = 1
  let A = 1
  let dpr = 1
  const lista = []

  function nova(inicio) {
    return {
      x: aleatorio(),
      y: inicio ? aleatorio() : 1.05 + aleatorio() * 0.1,
      r: 0.6 + aleatorio() * 1.8,
      vy: 0.012 + aleatorio() * 0.035,
      onda: aleatorio() * Math.PI * 2,
      amp: 0.004 + aleatorio() * 0.012,
      calor: 0.4 + aleatorio() * 0.6,
      pisca: 2 + aleatorio() * 5,
    }
  }
  for (let i = 0; i < quantidade; i++) lista.push(nova(true))

  function medir() {
    const r = alvo.getBoundingClientRect()
    dpr = Math.min(devicePixelRatio, 2)
    L = Math.max(1, r.width)
    A = Math.max(1, r.height)
    canvas.width = Math.round(L * dpr)
    canvas.height = Math.round(A * dpr)
  }
  medir()
  const ro = new ResizeObserver(medir)
  ro.observe(alvo)

  let visivel = false
  let antes = performance.now()
  let t = 0
  function desenhar(dt) {
    t += dt
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, L, A)
    ctx.globalCompositeOperation = 'lighter'
    for (const b of lista) {
      if (!reduzido) {
        b.y -= b.vy * dt
        b.calor -= dt * 0.04
        if (b.y < -0.05 || b.calor <= 0.05) Object.assign(b, nova(false))
      }
      const x = (b.x + Math.sin(t * 0.8 + b.onda) * b.amp) * L
      const y = b.y * A
      const brilho = b.calor * (0.65 + 0.35 * Math.sin(t * b.pisca + b.onda))
      const raio = b.r * 5
      const g = ctx.createRadialGradient(x, y, 0, x, y, raio)
      g.addColorStop(0, `rgba(255, 214, 150, ${0.9 * brilho})`)
      g.addColorStop(0.25, `rgba(251, 120, 30, ${0.45 * brilho})`)
      g.addColorStop(1, 'rgba(251, 120, 30, 0)')
      ctx.fillStyle = g
      ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2)
    }
  }

  let rodando = true
  function quadro(agora) {
    if (!rodando) return
    requestAnimationFrame(quadro)
    const dt = Math.min(0.05, (agora - antes) / 1000)
    antes = agora
    if (visivel && !document.documentElement.classList.contains('portal-aberto')) desenhar(dt)
  }
  requestAnimationFrame(quadro)
  const io = new IntersectionObserver(([e]) => {
    visivel = e.isIntersecting
    antes = performance.now()
    if (reduzido && visivel) desenhar(0)
  })
  io.observe(alvo)

  return {
    destruir() {
      rodando = false
      io.disconnect()
      ro.disconnect()
      canvas.remove()
    },
  }
}
