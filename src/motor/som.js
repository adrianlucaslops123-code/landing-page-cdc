/**
 * Som da página, sintetizado na hora com Web Audio (nenhum arquivo).
 * Começa desligado; liga pelo botão da navegação.
 *  - ambiente: zumbido baixo de máquina de solda; o filtro abre com a
 *    velocidade da rolagem (som acompanha o movimento)
 *  - arco: estalo do arco abrindo (ruído filtrado + zumbido + pancada grave)
 *  - clique, passe: tiques curtos de interface
 *  - virada: sopro curto quando a cena troca
 */
const CHAVE = 'cdc-som'

export function criarSom(botao) {
  let ctx = null
  let mestre = null
  let ruido = null
  let ligado = false
  let amb = null
  let ultimoPasse = 0

  function garantir() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return false
      ctx = new AC()
      mestre = ctx.createGain()
      mestre.gain.value = 0.7
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -16
      comp.ratio.value = 4
      mestre.connect(comp).connect(ctx.destination)
      // 2 s de ruído branco reaproveitado por todos os efeitos
      ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const d = ruido.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    }
    if (ctx.state === 'suspended') ctx.resume()
    return true
  }

  function fonteRuido() {
    const s = ctx.createBufferSource()
    s.buffer = ruido
    s.loop = true
    return s
  }

  function envelope(g, t0, ataque, pico, queda) {
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(pico, t0 + ataque)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ataque + queda)
  }

  const efeitos = {
    clique() {
      const t = ctx.currentTime
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'triangle'
      o.frequency.setValueAtTime(1500, t)
      o.frequency.exponentialRampToValueAtTime(650, t + 0.05)
      envelope(g, t, 0.004, 0.07, 0.06)
      o.connect(g).connect(mestre)
      o.start(t)
      o.stop(t + 0.08)
    },
    passe() {
      const agora = performance.now()
      if (agora - ultimoPasse < 60) return
      ultimoPasse = agora
      const t = ctx.currentTime
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(2600, t)
      envelope(g, t, 0.003, 0.022, 0.03)
      o.connect(g).connect(mestre)
      o.start(t)
      o.stop(t + 0.05)
    },
    virada() {
      const t = ctx.currentTime
      const s = fonteRuido()
      const f = ctx.createBiquadFilter()
      const g = ctx.createGain()
      f.type = 'bandpass'
      f.Q.value = 1.2
      f.frequency.setValueAtTime(380, t)
      f.frequency.exponentialRampToValueAtTime(2400, t + 0.42)
      envelope(g, t, 0.12, 0.09, 0.4)
      s.connect(f).connect(g).connect(mestre)
      s.start(t, Math.random())
      s.stop(t + 0.6)
    },
    arco() {
      const t = ctx.currentTime
      // estalo: ruído agudo com tremulação
      const s = fonteRuido()
      const f = ctx.createBiquadFilter()
      const g = ctx.createGain()
      f.type = 'highpass'
      f.frequency.value = 1800
      g.gain.setValueAtTime(0.0001, t)
      for (let k = 0; k < 14; k++) g.gain.setValueAtTime(0.05 + Math.random() * 0.14, t + 0.012 + k * 0.03)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62)
      s.connect(f).connect(g).connect(mestre)
      s.start(t, Math.random())
      s.stop(t + 0.7)
      // zumbido do arco
      const o = ctx.createOscillator()
      const fo = ctx.createBiquadFilter()
      const go = ctx.createGain()
      o.type = 'sawtooth'
      o.frequency.value = 118
      fo.type = 'lowpass'
      fo.frequency.value = 900
      envelope(go, t, 0.01, 0.05, 0.45)
      o.connect(fo).connect(go).connect(mestre)
      o.start(t)
      o.stop(t + 0.5)
      // pancada grave
      const p = ctx.createOscillator()
      const gp = ctx.createGain()
      p.type = 'sine'
      p.frequency.setValueAtTime(90, t)
      p.frequency.exponentialRampToValueAtTime(38, t + 0.35)
      envelope(gp, t, 0.006, 0.32, 0.4)
      p.connect(gp).connect(mestre)
      p.start(t)
      p.stop(t + 0.45)
    },
  }

  function ligarAmbiente() {
    if (amb || !ctx) return
    const t = ctx.currentTime
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.05, t + 1.2)
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 220
    f.Q.value = 3
    const o1 = ctx.createOscillator()
    const o2 = ctx.createOscillator()
    o1.type = 'sine'
    o1.frequency.value = 60
    o2.type = 'triangle'
    o2.frequency.value = 120.4
    const g2 = ctx.createGain()
    g2.gain.value = 0.35
    const r = fonteRuido()
    const gr = ctx.createGain()
    gr.gain.value = 0.25
    o1.connect(f)
    o2.connect(g2).connect(f)
    r.connect(gr).connect(f)
    f.connect(g).connect(mestre)
    o1.start()
    o2.start()
    r.start()
    amb = { g, f, partes: [o1, o2, r] }
  }
  function desligarAmbiente() {
    if (!amb) return
    const t = ctx.currentTime
    amb.g.gain.cancelScheduledValues(t)
    amb.g.gain.setValueAtTime(amb.g.gain.value, t)
    amb.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    const partes = amb.partes
    setTimeout(() => partes.forEach((p) => p.stop()), 600)
    amb = null
  }

  function atualizar() {
    botao.setAttribute('aria-pressed', String(ligado))
    botao.setAttribute('aria-label', ligado ? 'Desligar o som da página' : 'Ligar o som da página')
    botao.dataset.cursor = ligado ? 'Mudo' : 'Som'
  }

  function definir(valor) {
    ligado = valor
    atualizar()
    try {
      localStorage.setItem(CHAVE, ligado ? '1' : '0')
    } catch {}
    if (ligado && garantir()) {
      ligarAmbiente()
      efeitos.clique()
    } else desligarAmbiente()
  }

  botao.addEventListener('click', () => definir(!ligado))

  // quem deixou o som ligado da última vez: liga no primeiro gesto
  let lembrar = false
  try {
    lembrar = localStorage.getItem(CHAVE) === '1'
  } catch {}
  if (lembrar) {
    const primeiro = (e) => {
      if (e.target.closest && e.target.closest('.som')) return
      removeEventListener('pointerdown', primeiro, true)
      removeEventListener('keydown', primeiro, true)
      definir(true)
    }
    addEventListener('pointerdown', primeiro, true)
    addEventListener('keydown', primeiro, true)
  }
  atualizar()

  return {
    tocar(nome) {
      if (!ligado || !ctx || !efeitos[nome]) return
      efeitos[nome]()
    },
    velocidade(v) {
      if (!amb) return
      const alvo = 220 + Math.min(1, v / 3000) * 1600
      amb.f.frequency.setTargetAtTime(alvo, ctx.currentTime, 0.12)
    },
  }
}
