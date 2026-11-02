/**
 * Contato e peças de interface:
 *  - pré-inscrição: o link do WhatsApp é montado enquanto a pessoa digita,
 *    então o clique abre a conversa já com a mensagem (sem servidor);
 *  - dúvidas: acordeão com altura animada;
 *  - menu do celular: cortina com os links em cascata;
 *  - fecho: o lema da CDC se estica (largura da fonte variável) com a rolagem.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const ZAP = '5521982570418'

export function iniciarInscricao({ som }) {
  const form = document.querySelector('.inscricao')
  if (!form) return
  const nome = form.querySelector('#nome')
  const interesse = form.querySelector('#interesse')
  const mensagem = form.querySelector('#mensagem')
  const enviar = form.querySelector('.inscricao__enviar')
  const msg = form.querySelector('.inscricao__msg')

  function montar() {
    const partes = [`Olá, Rose! Meu nome é ${nome.value.trim() || '…'}.`, `Tenho interesse em: ${interesse.value}.`]
    if (mensagem.value.trim()) partes.push(mensagem.value.trim())
    enviar.href = `https://wa.me/${ZAP}?text=${encodeURIComponent(partes.join('\n'))}`
  }
  ;[nome, interesse, mensagem].forEach((c) => c.addEventListener('input', montar))
  montar()

  enviar.addEventListener('click', (e) => {
    if (!nome.value.trim()) {
      e.preventDefault()
      form.classList.remove('is-erro')
      void form.offsetWidth
      form.classList.add('is-erro')
      msg.textContent = 'Escreva o seu nome para a Rose saber com quem está falando.'
      nome.focus()
      return
    }
    form.classList.remove('is-erro')
    msg.textContent = 'O WhatsApp abre numa nova aba com a sua mensagem. Se não abrir, escreva para (21) 98257-0418.'
    som?.tocar('clique')
  })
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    enviar.click()
  })
}

export function iniciarDuvidas({ reduzido }) {
  document.querySelectorAll('.pergunta').forEach((d) => {
    const resumo = d.querySelector('summary')
    const corpo = d.querySelector('.pergunta__resp')
    resumo.addEventListener('click', (e) => {
      if (reduzido) return
      e.preventDefault()
      if (d.open) {
        gsap.to(corpo, { height: 0, opacity: 0, duration: 0.45, ease: 'power3.inOut', onComplete: () => (d.open = false) })
      } else {
        d.open = true
        gsap.fromTo(corpo, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.6, ease: 'expo.out', onComplete: () => ScrollTrigger.refresh() })
      }
    })
  })
}

export function iniciarMenu({ rolagem }) {
  const html = document.documentElement
  const botao = document.querySelector('.menu-botao')
  const menu = document.getElementById('menu')
  if (!botao || !menu) return
  const links = menu.querySelectorAll('nav a, .menu__pe')

  function abrir() {
    menu.hidden = false
    html.classList.add('menu-aberto')
    botao.setAttribute('aria-expanded', 'true')
    botao.setAttribute('aria-label', 'Fechar menu')
    rolagem.parar()
    gsap.fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'expo.inOut' })
    gsap.fromTo(links, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.05, delay: 0.25 })
    links[0]?.focus({ preventScroll: true })
  }
  function fechar() {
    if (menu.hidden) return
    html.classList.remove('menu-aberto')
    botao.setAttribute('aria-expanded', 'false')
    botao.setAttribute('aria-label', 'Abrir menu')
    rolagem.seguir()
    gsap.to(menu, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.5, ease: 'expo.inOut', onComplete: () => (menu.hidden = true) })
  }
  botao.addEventListener('click', () => (menu.hidden ? abrir() : fechar()))
  addEventListener('keydown', (e) => e.key === 'Escape' && fechar())
  return { fechar }
}

// Mede a linha mais larga já na largura final da fonte (116%) e acerta o
// tamanho para ela caber exatamente na coluna.
export function ajustarFecho() {
  const titulo = document.querySelector('.contato__titulo')
  if (!titulo) return
  const linhas = [...titulo.querySelectorAll('.contato__linha')]
  const salvos = linhas.map((l) => [l.style.fontStretch, l.style.letterSpacing, l.style.maxWidth])
  linhas.forEach((l) => {
    l.style.fontStretch = '116%'
    l.style.letterSpacing = '-0.035em'
    l.style.maxWidth = 'none'
  })
  titulo.style.setProperty('--fecho', '100px')
  const maior = Math.max(...linhas.map((l) => l.getBoundingClientRect().width))
  const disponivel = titulo.clientWidth
  if (maior > 0 && disponivel > 0) titulo.style.setProperty('--fecho', `${Math.min(176, (100 * disponivel * 0.985) / maior).toFixed(2)}px`)
  linhas.forEach((l, i) => {
    l.style.fontStretch = salvos[i][0]
    l.style.letterSpacing = salvos[i][1]
    l.style.maxWidth = salvos[i][2]
  })
}

export function iniciarFecho() {
  const linhas = document.querySelectorAll('.contato__linha')
  if (!linhas.length) return
  gsap.fromTo(
    linhas,
    { fontStretch: '62%', letterSpacing: '0.06em', xPercent: (i) => (i % 2 ? 6 : -6), opacity: 0.25 },
    {
      fontStretch: '116%',
      letterSpacing: '-0.035em',
      xPercent: 0,
      opacity: 1,
      ease: 'none',
      stagger: 0.12,
      scrollTrigger: { trigger: '.contato__titulo', start: 'top 92%', end: 'top 34%', scrub: 0.8 },
    },
  )
}
