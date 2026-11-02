/**
 * Busca no texto dos materiais (public/materiais/indice.json: texto de cada
 * página). Ignora acentos e maiúsculas: "dureza", "DUREZA" e "dúreza" acham o
 * mesmo. O índice só é baixado na primeira busca.
 */
let indicePromessa = null
const cache = new Map() // id → [{ original, normal }]

export function normalizar(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// normaliza caractere por caractere para manter as posições iguais às do texto original
function normalizarAlinhado(s) {
  let out = ''
  for (const ch of s) {
    const n = normalizar(ch)
    out += n.length === ch.length ? n : ch.length === 1 ? n[0] || ch : ch
  }
  return out
}

export function carregarIndice() {
  if (!indicePromessa) {
    const url = new URL('materiais/indice.json', document.baseURI).href
    indicePromessa = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`índice ${r.status}`)
        return r.json()
      })
      .catch((e) => {
        indicePromessa = null
        throw e
      })
  }
  return indicePromessa
}

async function paginasDe(id) {
  if (cache.has(id)) return cache.get(id)
  const indice = await carregarIndice()
  const paginas = (indice[id] || []).map((original) => ({ original, normal: normalizarAlinhado(original) }))
  cache.set(id, paginas)
  return paginas
}

const escapar = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function trecho(original, inicio, tam) {
  const a = Math.max(0, inicio - 70)
  const b = Math.min(original.length, inicio + tam + 90)
  return (a > 0 ? '…' : '') + escapar(original.slice(a, inicio)) + '<mark>' + escapar(original.slice(inicio, inicio + tam)) + '</mark>' + escapar(original.slice(inicio + tam, b)) + (b < original.length ? '…' : '')
}

/**
 * Procura `consulta` nos materiais `ids`. Devolve uma lista de achados
 * { id, pagina, trecho, ocorrencias } (um por página), no máximo `limite`.
 */
export async function buscar(consulta, ids, limite = 60) {
  const q = normalizar(consulta.trim())
  if (q.length < 2) return { achados: [], total: 0 }
  const achados = []
  let total = 0
  for (const id of ids) {
    const paginas = await paginasDe(id)
    paginas.forEach((p, i) => {
      let pos = p.normal.indexOf(q)
      if (pos < 0) return
      const primeira = pos
      let n = 0
      while (pos >= 0) {
        n++
        pos = p.normal.indexOf(q, pos + q.length)
      }
      total += n
      if (achados.length < limite) achados.push({ id, pagina: i + 1, trecho: trecho(p.original, primeira, q.length), ocorrencias: n })
    })
  }
  return { achados, total }
}

// páginas de um material que contêm a consulta (para o leitor)
export async function paginasCom(consulta, id) {
  const { achados } = await buscar(consulta, [id], 10000)
  return achados
}
