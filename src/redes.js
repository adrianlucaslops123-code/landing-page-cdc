/**
 * Redes sociais oficiais da CDC — o ÚNICO lugar com os links.
 * Para trocar um endereço, edite só este objeto.
 */
export const REDES = [
  {
    id: 'instagram',
    nome: 'Instagram',
    perfil: '@deiwsonrosecdcoficial',
    url: 'https://www.instagram.com/deiwsonrosecdcoficial',
    icone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/></svg>',
  },
  {
    id: 'facebook',
    nome: 'Facebook',
    perfil: 'cdctreinamentos.com.br',
    url: 'https://www.facebook.com/cdctreinamentos.com.br',
    icone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21z" fill="currentColor"/></svg>',
  },
]

const link = (r, conteudo, classe) =>
  `<a class="${classe}" href="${r.url}" target="_blank" rel="noopener" aria-label="${r.nome} da CDC (abre em nova aba)">${conteudo}</a>`

export function iniciarRedes({ rolagem }) {
  // ícones discretos no canto
  document.querySelectorAll('[data-redes-canto]').forEach((el) => {
    el.innerHTML = REDES.map((r) => link(r, r.icone, 'redes-canto__link')).join('')
  })
  // linha institucional no rodapé
  document.querySelectorAll('[data-redes-linha]').forEach((el) => {
    el.innerHTML = REDES.map((r) => link(r, `${r.icone}<span>${r.nome}</span>`, 'redes-linha__link')).join('')
  })
  // pop-up
  const popup = document.querySelector('.redes-popup')
  if (!popup) return
  popup.querySelector('[data-redes-lista]').innerHTML = REDES.map((r) =>
    `<li>${link(r, `<span class="redes-popup__icone">${r.icone}</span><span class="redes-popup__texto"><b>${r.nome}</b><small>${r.perfil}</small></span><span class="redes-popup__seta" aria-hidden="true">↗</span>`, 'redes-popup__link')}</li>`,
  ).join('')
  const fechar = () => popup.open && popup.close()
  document.querySelectorAll('[data-abrir-redes]').forEach((b) =>
    b.addEventListener('click', () => {
      if (typeof popup.showModal === 'function') popup.showModal()
      else popup.setAttribute('open', '')
      document.documentElement.classList.add('redes-aberto')
      rolagem?.parar()
    }),
  )
  popup.addEventListener('close', () => {
    document.documentElement.classList.remove('redes-aberto')
    rolagem?.seguir()
  })
  popup.querySelector('[data-fechar-redes]').addEventListener('click', fechar)
  // clique fora da caixa fecha
  popup.addEventListener('click', (e) => e.target === popup && fechar())
}
