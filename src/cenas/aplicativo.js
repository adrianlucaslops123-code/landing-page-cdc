/**
 * Seção acrescentada: apresentação do aplicativo CDC Capacitação em Qualidade.
 * Prévia interativa de UMA questão demonstrativa: o visitante escolhe uma
 * alternativa e vê na hora se acertou, com uma breve explicação.
 * Independente do banco de questões do aplicativo (nada é enviado ou salvo).
 * Só cuida dos elementos desta seção; não toca em nenhuma outra parte da página.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const CORRETA = 'C'
const EXPLICACAO =
  'A <b>trinca</b> é uma descontinuidade do tipo fratura: forma uma abertura no metal de solda ou no metal de base. Quando atinge a superfície, pode ser identificada já na inspeção visual.'
const MOTIVOS = {
  A: 'A inclusão de escória é material não metálico retido na solda, e não uma abertura no metal.',
  B: 'A porosidade interna é formada por gás aprisionado dentro do cordão, abaixo da superfície.',
  D: 'A falta de fusão interna é a ausência de união entre passes, ou com o metal de base, no interior da junta.',
  E: 'A inclusão metálica é um metal estranho retido na solda, como partículas de tungstênio.',
}

export function iniciarAplicativo({ reduzido = false, som } = {}) {
  try {
    montar({ reduzido, som })
  } catch (erro) {
    // a prévia nunca pode atrapalhar o resto da página
    console.warn('Prévia do aplicativo desligada:', erro)
  }
}

function montar({ reduzido, som }) {
  const janela = document.querySelector('[data-janela-app]')
  const questao = janela?.querySelector('[data-questao]')
  if (!questao) return
  const opcoes = [...questao.querySelectorAll('.opcao')]
  const retorno = questao.querySelector('[data-retorno]')
  const refazer = questao.querySelector('[data-refazer]')
  const correta = opcoes.find((o) => o.dataset.letra === CORRETA)
  let respondida = false

  function responder(escolhida) {
    if (respondida) return
    respondida = true
    const certo = escolhida === correta
    questao.classList.add('is-respondida')
    opcoes.forEach((o) => o.setAttribute('aria-disabled', 'true'))
    escolhida.classList.add('is-escolhida')
    escolhida.setAttribute('aria-pressed', 'true')
    correta.classList.add('is-correta')

    const textoCorreta = correta.querySelector('.opcao__texto').textContent.replace(/\.$/, '')
    retorno.innerHTML = certo
      ? `<div class="retorno"><p class="retorno__titulo">Resposta correta.</p><p class="retorno__texto">${EXPLICACAO}</p></div>`
      : `<div class="retorno retorno--errada"><p class="retorno__titulo">Resposta incorreta. A alternativa correta é a ${CORRETA}) ${textoCorreta}.</p><p class="retorno__texto">${MOTIVOS[escolhida.dataset.letra]} ${EXPLICACAO}</p></div>`
    refazer.hidden = false
    som?.tocar('clique')

    // a página cresceu alguns pixels: os gatilhos de rolagem recalculam no fim
    const recalcular = () => ScrollTrigger.refresh()
    if (!reduzido) {
      const caixa = retorno.firstElementChild
      gsap.fromTo(
        caixa,
        { height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, opacity: 0 },
        { height: 'auto', paddingTop: 14, paddingBottom: 16, marginTop: 18, opacity: 1, duration: 0.7, ease: 'expo.out', clearProps: 'all', onComplete: recalcular },
      )
      if (certo) gsap.fromTo(escolhida, { scale: 0.985 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)', clearProps: 'transform' })
      else gsap.fromTo(escolhida, { x: -7 }, { x: 0, duration: 0.6, ease: 'elastic.out(1.1, 0.3)', clearProps: 'transform' })
      gsap.fromTo(refazer, { opacity: 0, x: 8 }, { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out', clearProps: 'opacity,transform' })
    } else requestAnimationFrame(recalcular)
  }

  function reiniciar() {
    respondida = false
    questao.classList.remove('is-respondida')
    opcoes.forEach((o) => {
      o.classList.remove('is-escolhida', 'is-correta')
      o.removeAttribute('aria-disabled')
      o.setAttribute('aria-pressed', 'false')
    })
    retorno.innerHTML = ''
    refazer.hidden = true
    opcoes[0].focus({ preventScroll: true })
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }

  opcoes.forEach((o) => o.addEventListener('click', () => responder(o)))
  refazer.addEventListener('click', reiniciar)

  // entrada: a janela sobe com profundidade e as alternativas chegam em cascata
  if (!reduzido) {
    const gatilho = { trigger: janela, start: 'top 86%', once: true }
    gsap.from(janela, { opacity: 0, y: 72, rotateX: 11, scale: 0.965, transformPerspective: 1400, transformOrigin: '50% 100%', duration: 1.4, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: gatilho })
    gsap.from(questao.querySelectorAll('.questao__modulo, .questao__progresso, .questao__trilho, .questao__enunciado, .opcao, .questao__pe'), {
      opacity: 0, y: 16, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.3, clearProps: 'transform,opacity', scrollTrigger: { ...gatilho },
    })
  }
}
