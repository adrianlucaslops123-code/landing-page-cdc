/**
 * O logo da CDC feito de partículas de metal.
 *
 * 1. AMOSTRAR: a máscara do logo real (public/marca/cdc-mascara.png) é lida
 *    pixel a pixel. Onde tem tinta vira ponto, em camadas na profundidade
 *    (frente e fundo cheios, o meio só com a borda), como uma peça de chapa.
 *
 * 2. FÍSICA (função `passo`), por ponto: casa, deslocamento, velocidade e
 *    CALOR (0 a 1).
 *      - perto do cursor o ponto pega a velocidade do mouse (o "pente"),
 *        leva um empurrão e AQUECE, como sob um maçarico; longe dele, esfria;
 *      - clique "abre o arco": clarão, explosão dos pontos em volta e uma
 *        chuva de faíscas com gravidade que quicam no chão;
 *      - mola pouco amortecida puxa cada ponto de volta: passa do lugar e
 *        balança (o "ímã").
 *    A cor sai do calor: laranja da marca → amarelo → branco → azul do arco.
 *
 * 3. RODAR A CÂMERA: `saida(p)` (0 a 1, ligado à rolagem) leva a câmera para
 *    dentro do logo; os pontos se abrem em brasas e passam pela lente.
 *
 * Uso: const logo = await particulas({ alvo, eventos, mascara })
 */

import * as THREE from 'three'

const AJUSTE = {
  largura: 10, // largura do logo no mundo 3D
  espessura: 0.9,
  camadas: 7,
  pontosPC: 52000,
  pontosCel: 24000,
  cores: ['#ffd38a', '#fb781e', '#b23a0c'], // de cima para baixo (laranja da marca no meio)
  aco: '#2c3d52', // tom frio que aparece no fundo e nas laterais

  raio: 1.05, // alcance do mouse
  pega: 14, // quanto o ponto copia a velocidade do mouse
  empurra: 22,
  aquece: 2.4, // calor por segundo sob o cursor
  esfria: 1.1, // segundos para perder ~63% do calor

  raioArco: 3.0, // alcance da explosão do clique
  explosao: 24,
  segura: 80, // força que mantém o buraco aberto enquanto aperta

  mola: 55,
  atrito: 2.6,
  inclina: 0.32,

  faiscas: 1400, // estoque de faíscas
  gravidade: 16,
}

const VERT = /* glsl */ `
  attribute vec3 aCor;
  attribute float aTam;
  attribute float aCalor;
  uniform float uPx;
  uniform float uSome;
  varying vec3 vCor;
  varying float vAlfa;
  vec3 rampa(float t) {
    vec3 a = vec3(1.0, 0.46, 0.10);
    vec3 b = vec3(1.0, 0.76, 0.32);
    vec3 c = vec3(1.0, 0.96, 0.84);
    vec3 d = vec3(0.84, 0.93, 1.0);
    if (t < 0.4) return mix(a, b, t / 0.4);
    if (t < 0.82) return mix(b, c, (t - 0.4) / 0.42);
    return mix(c, d, (t - 0.82) / 0.18);
  }
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float t = clamp(aCalor, 0.0, 1.0);
    float prof = -mv.z;
    gl_PointSize = clamp(aTam * uPx / prof * (1.0 + t * 0.75), 1.0, 24.0);
    vCor = mix(aCor, rampa(t), smoothstep(0.0, 0.28, t));
    vAlfa = smoothstep(0.35, 2.4, prof) * (1.0 - uSome);
  }
`
const FRAG = /* glsl */ `
  varying vec3 vCor;
  varying float vAlfa;
  void main() {
    vec2 p = abs(gl_PointCoord - 0.5);
    if (max(p.x, p.y) > 0.45) discard;
    gl_FragColor = vec4(vCor, vAlfa);
  }
`
const VERT_FAISCA = /* glsl */ `
  attribute float aVida;
  attribute float aCab;
  varying float vVida;
  varying float vCab;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vVida = aVida;
    vCab = aCab;
  }
`
const FRAG_FAISCA = /* glsl */ `
  uniform float uSome;
  varying float vVida;
  varying float vCab;
  void main() {
    float v = clamp(vVida, 0.0, 1.0);
    vec3 cor = mix(vec3(1.0, 0.36, 0.05), vec3(1.0, 0.95, 0.82), v * v);
    float a = v * mix(0.1, 1.0, vCab) * (1.0 - uSome);
    gl_FragColor = vec4(cor * a, a);
  }
`
const VERT_CLARAO = /* glsl */ `
  uniform float uTam;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uTam;
  }
`
const FRAG_CLARAO = /* glsl */ `
  uniform float uForca;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = (exp(-d * d * 5.0) + 0.35 * exp(-d * d * 60.0)) * uForca;
    gl_FragColor = vec4(vec3(0.86, 0.94, 1.0) * a, a);
  }
`

const limitar = (v, a, b) => Math.min(b, Math.max(a, v))
const misturar = (a, b, p) => a + (b - a) * p

function carregarImagem(src) {
  return new Promise((ok, falha) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => ok(img)
    img.onerror = falha
    img.src = src
  })
}

// Lê a máscara e devolve os pontos do logo.
function amostrar(img, alvoPontos) {
  const W = img.naturalWidth
  const H = img.naturalHeight
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const dados = ctx.getImageData(0, 0, W, H).data
  const cheio = (x, y) => {
    x |= 0
    y |= 0
    if (x < 0 || y < 0 || x >= W || y >= H) return false
    return dados[(y * W + x) * 4 + 3] > 127
  }

  let area = 0
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (dados[(y * W + x) * 4 + 3] > 127) area += 4

  const L = AJUSTE.camadas
  const pesoTotal = 2 + (L - 2) * 0.2
  const passo = Math.max(1.4, Math.sqrt((area * pesoTotal) / alvoPontos))
  const borda = passo * 1.6
  const pxPorUnidade = W / AJUSTE.largura
  const pontos = []

  for (let gy = 0; gy < H; gy += passo) {
    for (let gx = 0; gx < W; gx += passo) {
      const x = gx + (Math.random() - 0.5) * passo * 0.7
      const y = gy + (Math.random() - 0.5) * passo * 0.7
      if (!cheio(x, y)) continue
      const naBorda = !cheio(x + borda, y) || !cheio(x - borda, y) || !cheio(x, y + borda) || !cheio(x, y - borda)
      for (let l = 0; l < L; l++) {
        const face = l === 0 || l === L - 1
        if (!face && !naBorda) continue
        pontos.push({
          x: (x - W / 2) / pxPorUnidade,
          y: -(y - H / 2) / pxPorUnidade,
          z: misturar(-AJUSTE.espessura / 2, AJUSTE.espessura / 2, l / (L - 1)),
          u: x / W,
          v: y / H,
          camada: l / (L - 1),
          borda: naBorda,
        })
      }
    }
  }
  return { pontos, tamanho: passo / pxPorUnidade, altura: H / pxPorUnidade }
}

export async function particulas({ alvo, eventos = alvo, mascara, reduzido = false, aoArco, aoMedir, aoPronto }) {
  const celular = matchMedia('(hover: none), (max-width: 760px)').matches
  const img = await carregarImagem(mascara)

  // ---------- cena ----------
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' })
  let dprMax = Math.min(devicePixelRatio, 2)
  renderer.setPixelRatio(dprMax)
  renderer.setClearColor(0x000000, 0)
  alvo.appendChild(renderer.domElement)

  const cena = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 200)
  const grupo = new THREE.Group()
  cena.add(grupo)

  // ---------- pontos do logo ----------
  const { pontos, tamanho, altura } = amostrar(img, celular ? AJUSTE.pontosCel : AJUSTE.pontosPC)
  const N = pontos.length
  const casa = new Float32Array(N * 3)
  const pos = new Float32Array(N * 3)
  const off = new Float32Array(N * 3)
  const vel = new Float32Array(N * 3)
  const dir = new Float32Array(N * 3) // direção de cada brasa na saída
  const cor = new Float32Array(N * 3)
  const tam = new Float32Array(N)
  const calor = new Float32Array(N)
  const calorVis = new Float32Array(N)
  const atraso = new Float32Array(N)

  const stops = AJUSTE.cores.map((c) => new THREE.Color(c))
  const aco = new THREE.Color(AJUSTE.aco)
  const tmp = new THREE.Color()
  for (let i = 0; i < N; i++) {
    const p = pontos[i]
    casa[i * 3] = p.x
    casa[i * 3 + 1] = p.y
    casa[i * 3 + 2] = p.z

    // cor: dourado em cima, laranja da marca no meio, brasa embaixo
    const v = limitar(p.v, 0, 1)
    if (v < 0.45) tmp.copy(stops[0]).lerp(stops[1], v / 0.45)
    else tmp.copy(stops[1]).lerp(stops[2], (v - 0.45) / 0.55)
    let luz = 0.9 + Math.random() * 0.2
    if (p.camada === 1) {
      if (p.borda) luz *= 1.16
    } else if (p.camada === 0) {
      tmp.lerp(aco, 0.62)
      luz *= 0.5
    } else {
      tmp.lerp(aco, 0.35)
      luz *= 0.72
    }
    cor[i * 3] = Math.min(1, tmp.r * luz)
    cor[i * 3 + 1] = Math.min(1, tmp.g * luz)
    cor[i * 3 + 2] = Math.min(1, tmp.b * luz)
    tam[i] = tamanho * (0.85 + Math.random() * 0.35)

    // brasas da saída: abrem para os lados e vêm para a câmera
    const a = Math.random() * Math.PI * 2
    const r = 0.4 + Math.random() * 0.6
    dir[i * 3] = Math.cos(a) * r + p.x * 0.08
    dir[i * 3 + 1] = Math.sin(a) * r * 0.8 + p.y * 0.08
    dir[i * 3 + 2] = 0.3 + Math.random() * 1.2

    // abertura: metal branco de quente chega espalhado e esfria no lugar
    if (!reduzido) {
      const b = Math.acos(2 * Math.random() - 1)
      const rr = 6 + Math.random() * 10
      off[i * 3] = Math.sin(b) * Math.cos(a) * rr
      off[i * 3 + 1] = Math.sin(b) * Math.sin(a) * rr * 0.6
      off[i * 3 + 2] = Math.cos(b) * rr * 0.5 + 4
      atraso[i] = 0.05 + p.u * 0.75 + Math.random() * 0.55
      calor[i] = 1
    }
  }

  const geo = new THREE.BufferGeometry()
  const atrPos = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)
  const atrCalor = new THREE.BufferAttribute(calorVis, 1).setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('position', atrPos)
  geo.setAttribute('aCor', new THREE.BufferAttribute(cor, 3))
  geo.setAttribute('aTam', new THREE.BufferAttribute(tam, 1))
  geo.setAttribute('aCalor', atrCalor)
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 80)
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { uPx: { value: 1 }, uSome: { value: 0 } },
    transparent: true,
  })
  const nuvem = new THREE.Points(geo, material)
  grupo.add(nuvem)

  // ---------- faíscas (riscos de luz com gravidade) ----------
  const NF = celular ? 700 : AJUSTE.faiscas
  const fPos = new Float32Array(NF * 3)
  const fVel = new Float32Array(NF * 3)
  const fVida = new Float32Array(NF)
  const fQueda = new Float32Array(NF)
  const fVert = new Float32Array(NF * 6)
  const fVidaVert = new Float32Array(NF * 2)
  const fCab = new Float32Array(NF * 2)
  for (let i = 0; i < NF; i++) fCab[i * 2] = 1
  const geoF = new THREE.BufferGeometry()
  const atrF = new THREE.BufferAttribute(fVert, 3).setUsage(THREE.DynamicDrawUsage)
  const atrFV = new THREE.BufferAttribute(fVidaVert, 1).setUsage(THREE.DynamicDrawUsage)
  geoF.setAttribute('position', atrF)
  geoF.setAttribute('aVida', atrFV)
  geoF.setAttribute('aCab', new THREE.BufferAttribute(fCab, 1))
  geoF.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 80)
  const matF = new THREE.ShaderMaterial({
    vertexShader: VERT_FAISCA,
    fragmentShader: FRAG_FAISCA,
    uniforms: { uSome: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  grupo.add(new THREE.LineSegments(geoF, matF))
  let proxFaisca = 0
  let faiscasVivas = 0
  const piso = -altura / 2 - 0.3

  function emitir(x, y, z, n, forca, vx0 = 0, vy0 = 0) {
    for (let k = 0; k < n; k++) {
      const i = proxFaisca
      proxFaisca = (proxFaisca + 1) % NF
      const a = Math.random() * Math.PI * 2
      const sobe = 0.25 + Math.random() * 0.9
      const f = forca * (0.35 + Math.random() * 0.75)
      fPos[i * 3] = x
      fPos[i * 3 + 1] = y
      fPos[i * 3 + 2] = z
      fVel[i * 3] = Math.cos(a) * f + vx0
      fVel[i * 3 + 1] = sobe * f + vy0
      fVel[i * 3 + 2] = Math.sin(a) * f * 0.7 + 1.5
      fVida[i] = 1
      fQueda[i] = 1 / (0.45 + Math.random() * 1.1)
    }
    faiscasVivas = NF
  }

  // ---------- clarão do arco ----------
  const geoC = new THREE.BufferGeometry()
  const posC = new Float32Array(3)
  geoC.setAttribute('position', new THREE.BufferAttribute(posC, 3))
  const matC = new THREE.ShaderMaterial({
    vertexShader: VERT_CLARAO,
    fragmentShader: FRAG_CLARAO,
    uniforms: { uForca: { value: 0 }, uTam: { value: 300 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  })
  const clarao = new THREE.Points(geoC, matC)
  clarao.frustumCulled = false
  grupo.add(clarao)
  let forcaClarao = 0

  // ---------- tamanho da tela e enquadramento ----------
  let largura = 1
  let alturaTela = 1
  let distancia = 30
  let tanMeio = 1
  function medir() {
    const r = alvo.getBoundingClientRect()
    largura = Math.max(1, r.width)
    alturaTela = Math.max(1, r.height)
    renderer.setSize(largura, alturaTela, false)
    camera.aspect = largura / alturaTela
    tanMeio = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    // tela deitada: logo à direita do texto; tela em pé: logo em cima, texto embaixo
    const estreita = largura < 900 || largura / alturaTela < 1.1
    const ocupaL = estreita ? 0.84 : 0.42
    const ocupaA = estreita ? 0.24 : 0.46
    const cx = estreita ? 0.5 : 0.69
    const cy = estreita ? 0.27 : 0.44
    distancia = Math.max(AJUSTE.largura / ocupaL / (2 * tanMeio * camera.aspect), altura / ocupaA / (2 * tanMeio))
    const alturaVisivel = 2 * distancia * tanMeio
    const larguraVisivel = alturaVisivel * camera.aspect
    grupo.position.x = (cx - 0.5) * larguraVisivel
    grupo.position.y = (0.5 - cy) * alturaVisivel
    camera.position.set(0, 0, distancia)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    material.uniforms.uPx.value = (alturaTela * renderer.getPixelRatio()) / (2 * tanMeio)
    matC.uniforms.uTam.value = Math.min(alturaTela, largura) * renderer.getPixelRatio() * 0.9
    const baseMundo = grupo.position.y - altura / 2
    aoMedir?.({ base: (0.5 - baseMundo / alturaVisivel) * alturaTela, centro: cx * largura, estreita })
    sujo = true
  }
  let sujo = true // pede um novo desenho no modo parado (movimento reduzido)
  medir()
  const ro = new ResizeObserver(medir)
  ro.observe(alvo)

  // ---------- mouse ----------
  const ndc = new THREE.Vector2(0, 0)
  let dentro = false
  let apertado = false
  let ultimoMovimento = -10
  let clique = false

  function lerCursor(e) {
    const r = alvo.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
  }
  const aoMover = (e) => {
    lerCursor(e)
    dentro = true
    ultimoMovimento = performance.now() / 1000
  }
  const aoSair = () => {
    dentro = false
    apertado = false
  }
  const aoApertar = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    if (e.target.closest && e.target.closest('a, button, input, select, textarea')) return
    lerCursor(e)
    dentro = true
    apertado = true
    clique = true
    ultimoMovimento = performance.now() / 1000
  }
  const aoSoltar = () => {
    apertado = false
    if (matchMedia('(hover: none)').matches) dentro = false
  }
  eventos.addEventListener('pointermove', aoMover, { passive: true })
  eventos.addEventListener('pointerdown', aoApertar)
  eventos.addEventListener('pointerleave', aoSair)
  addEventListener('pointerup', aoSoltar)
  addEventListener('pointercancel', aoSoltar)
  addEventListener('blur', aoSair)

  const raio = new THREE.Raycaster()
  const plano = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const inversa = new THREE.Matrix4()
  const local = new THREE.Vector3()
  const mouse = { x: 0, y: 0, vx: 0, vy: 0, ok: false }
  function cursorNoPlano(dt) {
    raio.setFromCamera(ndc, camera)
    grupo.updateMatrixWorld()
    inversa.copy(grupo.matrixWorld).invert()
    raio.ray.applyMatrix4(inversa)
    if (!raio.ray.intersectPlane(plano, local)) return
    if (mouse.ok) {
      const k = 1 - Math.exp(-dt * 18)
      mouse.vx = misturar(mouse.vx, (local.x - mouse.x) / dt, k)
      mouse.vy = misturar(mouse.vy, (local.y - mouse.y) / dt, k)
    }
    mouse.x = local.x
    mouse.y = local.y
    mouse.ok = true
  }

  // ---------- física ----------
  let t = 0
  let saida = 0 // 0 = logo inteiro, 1 = câmera atravessou
  let arcoInicial = false
  const giro = { x: 0, y: 0, vx: 0, vy: 0 }

  function abrirArco(x, y, forte = true) {
    posC[0] = x
    posC[1] = y
    posC[2] = 0.6
    geoC.attributes.position.needsUpdate = true
    forcaClarao = forte ? 1 : 0.6
    emitir(x, y, 0.4, forte ? 240 : 140, forte ? 11 : 8)
    // posição do clarão na tela, para o brilho em CSS
    local.set(x, y, 0).applyMatrix4(grupo.matrixWorld).project(camera)
    aoArco?.({ x: (local.x * 0.5 + 0.5) * 100, y: (-local.y * 0.5 + 0.5) * 100, forte })
  }

  function passo(dt) {
    t += dt
    cursorNoPlano(dt)
    const ativo = dentro && mouse.ok && saida < 0.2
    const R = AJUSTE.raio
    const R2 = R * R
    const RC = AJUSTE.raioArco
    const RC2 = RC * RC
    const intro = limitar(t / 3, 0, 1)
    const amort = Math.exp(-misturar(7, AJUSTE.atrito, intro) * dt)
    const pega = 1 - Math.exp(-AJUSTE.pega * dt)
    const K = AJUSTE.mola * dt
    const esf = Math.exp(-dt / AJUSTE.esfria)
    const aq = AJUSTE.aquece * dt
    const mvx = limitar(mouse.vx, -60, 60)
    const mvy = limitar(mouse.vy, -60, 60)
    const rapidez = Math.hypot(mvx, mvy)
    const s = saida
    const abre = Math.pow(s, 1.5) * 15
    const brasa = s * 0.5
    let perto = 0

    if (clique && ativo) abrirArco(mouse.x, mouse.y)

    for (let i = 0; i < N; i++) {
      const j = i * 3
      let ox = off[j], oy = off[j + 1], oz = off[j + 2]
      let vx = vel[j], vy = vel[j + 1], vz = vel[j + 2]
      let c = calor[i]

      if (t >= atraso[i]) {
        if (ativo) {
          const dx = casa[j] + ox - mouse.x
          const dy = casa[j + 1] + oy - mouse.y
          const d2 = dx * dx + dy * dy
          if (d2 < RC2) {
            if (clique) {
              const d = Math.sqrt(d2) + 1e-4
              const f = (1 - d / RC) * AJUSTE.explosao * (0.6 + Math.random() * 0.8)
              vx += (dx / d) * f
              vy += (dy / d) * f
              vz += (Math.random() * 1.6 - 0.3) * f * 0.7
              c = Math.max(c, 1 - d / RC)
            }
            if (apertado) {
              const d = Math.sqrt(d2) + 1e-4
              const f = (1 - d / RC) * AJUSTE.segura * dt
              vx += (dx / d) * f
              vy += (dy / d) * f
              c = Math.min(1, c + (1 - d / RC) * aq * 0.6)
            }
          }
          if (d2 < R2) {
            const d = Math.sqrt(d2) + 1e-4
            let f = 1 - d / R
            f *= f
            vx += (mvx - vx) * pega * f
            vy += (mvy - vy) * pega * f
            const e = AJUSTE.empurra * f * dt
            vx += (dx / d) * e
            vy += (dy / d) * e
            vz += e * 0.8
            c = Math.min(1, c + f * aq * (1 + rapidez * 0.08))
            perto++
          }
        }
        vx = (vx - ox * K) * amort
        vy = (vy - oy * K) * amort
        vz = (vz - oz * K) * amort
        ox += vx * dt
        oy += vy * dt
        oz += vz * dt
        c *= esf
        const v2 = vx * vx + vy * vy + vz * vz
        if (v2 > 4) c = Math.max(c, Math.min(0.85, Math.sqrt(v2) * 0.035))
      }

      off[j] = ox
      off[j + 1] = oy
      off[j + 2] = oz
      vel[j] = vx
      vel[j + 1] = vy
      vel[j + 2] = vz
      calor[i] = c

      const resp = 0.03 * Math.sin(t * 1.3 + casa[j] * 0.7 + casa[j + 1] * 0.4)
      pos[j] = casa[j] + ox + dir[j] * abre
      pos[j + 1] = casa[j + 1] + oy + dir[j + 1] * abre
      pos[j + 2] = casa[j + 2] + oz + resp + dir[j + 2] * abre
      calorVis[i] = c > brasa ? c : brasa
    }
    clique = false
    atrPos.needsUpdate = true
    atrCalor.needsUpdate = true

    // faíscas de esmerilhar quando o mouse passa rápido por cima
    if (ativo && perto > 20 && rapidez > 6) {
      emitir(mouse.x, mouse.y, 0.3, Math.min(6, Math.round((rapidez - 6) * 0.35)), 4 + rapidez * 0.12, -mvx * 0.15, -mvy * 0.05)
    }
    // arco de abertura, quando o logo termina de montar
    if (!arcoInicial && !reduzido && t > 2.15) {
      arcoInicial = true
      abrirArco(0.6, -0.2, false)
    }

    // faíscas
    if (faiscasVivas > 0) {
      const g = AJUSTE.gravidade * dt
      const arrasto = Math.exp(-0.9 * dt)
      let vivas = 0
      for (let i = 0; i < NF; i++) {
        const j = i * 3
        const k = i * 6
        if (fVida[i] <= 0) {
          fVidaVert[i * 2] = 0
          fVidaVert[i * 2 + 1] = 0
          continue
        }
        vivas++
        fVel[j + 1] -= g
        fVel[j] *= arrasto
        fVel[j + 1] *= arrasto
        fVel[j + 2] *= arrasto
        fPos[j] += fVel[j] * dt
        fPos[j + 1] += fVel[j + 1] * dt
        fPos[j + 2] += fVel[j + 2] * dt
        if (fPos[j + 1] < piso && fVel[j + 1] < 0) {
          fPos[j + 1] = piso
          fVel[j + 1] *= -0.32
          fVel[j] *= 0.7
          fVel[j + 2] *= 0.7
        }
        fVida[i] -= fQueda[i] * dt
        const rastro = 0.03
        fVert[k] = fPos[j]
        fVert[k + 1] = fPos[j + 1]
        fVert[k + 2] = fPos[j + 2]
        fVert[k + 3] = fPos[j] - fVel[j] * rastro
        fVert[k + 4] = fPos[j + 1] - fVel[j + 1] * rastro
        fVert[k + 5] = fPos[j + 2] - fVel[j + 2] * rastro
        const vv = Math.max(0, fVida[i])
        fVidaVert[i * 2] = vv
        fVidaVert[i * 2 + 1] = vv
      }
      faiscasVivas = vivas
      atrF.needsUpdate = true
      atrFV.needsUpdate = true
    }

    // clarão
    forcaClarao *= Math.exp(-dt * 11)
    matC.uniforms.uForca.value = forcaClarao

    // o bloco tomba e vira para o cursor numa mola com embalo
    const parado = performance.now() / 1000 - ultimoMovimento > 2.5
    const alvoY = ativo && !parado ? ndc.x * AJUSTE.inclina : Math.sin(t * 0.42) * 0.14
    const alvoX = ativo && !parado ? -ndc.y * AJUSTE.inclina * 0.6 : Math.sin(t * 0.31) * 0.05
    giro.vy += ((alvoY - giro.y) * 26 - giro.vy * 6.5) * dt
    giro.vx += ((alvoX - giro.x) * 26 - giro.vx * 6.5) * dt
    giro.y += giro.vy * dt
    giro.x += giro.vx * dt
    grupo.rotation.set(giro.x * (1 - s), giro.y * (1 - s), s * 0.2)

    // câmera: anda até o logo e entra nele conforme a saída (dolly + travelling)
    const e = s * s * (3 - 2 * s)
    camera.position.set(grupo.position.x * e, grupo.position.y * e - e * 0.6, distancia * (1 - 0.88 * e))
    material.uniforms.uSome.value = Math.pow(limitar((s - 0.55) / 0.45, 0, 1), 1.4)
    matF.uniforms.uSome.value = material.uniforms.uSome.value

    if (!ativo) {
      mouse.vx *= 0.8
      mouse.vy *= 0.8
    }
  }

  // ---------- laço, com qualidade adaptativa ----------
  let visivel = true
  let antes = performance.now()
  let rodando = true
  let quadros = 0
  let somaTempo = 0
  let pronto = false
  let comecou = false // o relógio só anda quando a cortina da abertura sobe

  function quadro(agora) {
    if (!rodando) return
    requestAnimationFrame(quadro)
    const bruto = (agora - antes) / 1000
    const dt = limitar(bruto, 1 / 240, 1 / 30)
    antes = agora
    if (!visivel || saida >= 0.999) return
    if (document.documentElement.classList.contains('portal-aberto')) return // área do aluno por cima
    if (!comecou && !reduzido) {
      if (!pronto) {
        renderer.render(cena, camera)
        pronto = true
        aoPronto?.()
      }
      return
    }
    if (reduzido) {
      // sem física: desenha parado, e de novo só quando o tamanho muda
      if (sujo) {
        pos.set(casa)
        atrPos.needsUpdate = true
        renderer.render(cena, camera)
        sujo = false
      }
      if (!pronto) {
        pronto = true
        aoPronto?.()
      }
      return
    }
    passo(dt)
    renderer.render(cena, camera)
    if (!pronto) {
      pronto = true
      aoPronto?.()
    }
    // depois da abertura, mede o desempenho e alivia a resolução se precisar
    if (t > 3 && quadros < 120) {
      quadros++
      somaTempo += bruto
      if (quadros === 120 && somaTempo / 120 > 1 / 40 && dprMax > 1) {
        dprMax = 1
        renderer.setPixelRatio(1)
        medir()
      }
    }
  }
  requestAnimationFrame(quadro)

  const io = new IntersectionObserver(([e]) => {
    visivel = e.isIntersecting
    antes = performance.now()
  })
  io.observe(alvo)

  return {
    pontos: N,
    comecar() {
      comecou = true
      antes = performance.now()
    },
    // 0 a 1, ligado à rolagem do hero
    saida(p) {
      const antesSaida = saida
      saida = limitar(p, 0, 1)
      if (reduzido && Math.abs(antesSaida - saida) > 0.001) {
        renderer.domElement.style.opacity = String(1 - saida)
      }
    },
    arco() {
      abrirArco(0, 0)
    },
    destruir() {
      rodando = false
      io.disconnect()
      ro.disconnect()
      eventos.removeEventListener('pointermove', aoMover)
      eventos.removeEventListener('pointerdown', aoApertar)
      eventos.removeEventListener('pointerleave', aoSair)
      removeEventListener('pointerup', aoSoltar)
      removeEventListener('pointercancel', aoSoltar)
      removeEventListener('blur', aoSair)
      geo.dispose()
      geoF.dispose()
      geoC.dispose()
      material.dispose()
      matF.dispose()
      matC.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
