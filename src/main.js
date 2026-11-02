/**
 * CDC Capacitação em Qualidade: liga o motor na ordem certa.
 * 1. abertura (fontes + logo de partículas prontos)
 * 2. cenas presas na ordem da página (hero, provas, fita de fotos)
 * 3. entradas de texto, interações, rolagem, som
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { criarRolagem, ligarRolagem } from './motor/rolagem.js'
import { iniciarTexto } from './motor/texto.js'
import { iniciarInteracao } from './motor/interacao.js'
import { criarSom } from './motor/som.js'
import { abrir } from './motor/carga.js'
import { particulas } from './fogo/particulas.js'
import { brasas } from './fogo/brasas.js'
import { entradaHero, saidaHero } from './cenas/hero.js'
import { iniciarProvas } from './cenas/provas.js'
import { iniciarEstrutura } from './cenas/estrutura.js'
import { iniciarDepoimentos } from './cenas/depoimentos.js'
import { iniciarInscricao, iniciarDuvidas, iniciarMenu, iniciarFecho, ajustarFecho } from './cenas/contato.js'
import { iniciarAreaDoAluno } from './aluno/portal.js'

gsap.registerPlugin(ScrollTrigger)

const html = document.documentElement
const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches
const toque = matchMedia('(hover: none)').matches
if (!reduzido) html.classList.add('com-movimento')
// rede de segurança: se algo falhar, nada fica escondido
const seguranca = setTimeout(() => html.classList.remove('com-movimento'), 8000)

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
const destino = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null
scrollTo(0, 0)

const som = criarSom(document.querySelector('.som'))
const rolagem = criarRolagem({ reduzido, toque })
window.__rolagem = rolagem
rolagem.parar()
iniciarInteracao({ reduzido, som })

// ---------- logo de partículas ----------
const hero = document.querySelector('.hero')
const flash = hero.querySelector('.hero__flash')
const palco = hero.querySelector('.hero__palco')
const mascara = new URL('marca/cdc-mascara.png', document.baseURI).href
let logo = null

const logoPronto = new Promise((pronto) => {
  particulas({
    alvo: palco,
    eventos: hero,
    mascara,
    reduzido,
    aoPronto: pronto,
    aoMedir: ({ base, centro }) => {
      hero.style.setProperty('--lema-y', `${Math.round(base + 26)}px`)
      hero.style.setProperty('--lema-x', `${Math.round(centro)}px`)
    },
    aoArco: ({ x, y, forte }) => {
      flash.style.setProperty('--fx', `${x}%`)
      flash.style.setProperty('--fy', `${y}%`)
      gsap.fromTo(flash, { '--flash': forte ? 0.9 : 0.55 }, { '--flash': 0, duration: 0.9, ease: 'expo.out', overwrite: true })
      if (forte) gsap.fromTo(palco, { x: 7, y: -4 }, { x: 0, y: 0, duration: 0.45, ease: 'elastic.out(1.2, 0.25)', overwrite: true })
      som.tocar('arco')
    },
  })
    .then((l) => (logo = l))
    .catch((erro) => {
      console.warn('Logo de partículas desligado:', erro)
      hero.classList.add('sem-webgl')
      pronto()
    })
})

// ---------- abertura e montagem das cenas ----------
abrir({ tarefas: [document.fonts.ready, logoPronto], reduzido }).then(() => {
  rolagem.seguir()
  logo?.comecar()
  entradaHero({ reduzido })
  ajustarFecho()
  ScrollTrigger.addEventListener('refreshInit', ajustarFecho)

  // cenas presas, na ordem em que aparecem na página
  saidaHero({ logo: { saida: (p) => logo?.saida(p) }, reduzido, som })
  iniciarProvas({ som })
  iniciarEstrutura()

  // o resto
  if (!reduzido) {
    iniciarTexto({ som })
    iniciarFecho()
  }
  iniciarDepoimentos({ reduzido, som })
  iniciarInscricao({ som })
  iniciarDuvidas({ reduzido })
  const menu = iniciarMenu({ rolagem })
  ligarRolagem({ rolagem, som, aoAncora: () => menu?.fechar() })
  // área do aluno própria (biblioteca + leitor de PDF); no artefato não há download
  iniciarAreaDoAluno({ rolagem, som, reduzido, artefato: import.meta.env.MODE === 'artefato' })
  brasas({ alvo: document.querySelector('.contato__palco'), reduzido })

  ScrollTrigger.refresh()
  clearTimeout(seguranca)
  html.classList.add('is-pronto')
  if (destino) requestAnimationFrame(() => rolagem.irPara(destino, true))
})

// recalcula as cenas quando as fontes trocam de métrica ou a janela muda
document.fonts.addEventListener?.('loadingdone', () => ScrollTrigger.refresh())
