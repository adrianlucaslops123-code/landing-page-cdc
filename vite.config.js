import { defineConfig } from 'vite'

// No modo "artefato" as bibliotecas vêm do CDN (jsDelivr), versões travadas,
// em vez de irem dentro do pacote. É o formato que a página publicada usa.
const CDN = {
  three: 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.min.js',
  gsap: 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/index.js',
  'gsap/ScrollTrigger': 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/ScrollTrigger.js',
  'gsap/SplitText': 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/SplitText.js',
  'gsap/ScrambleTextPlugin': 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/ScrambleTextPlugin.js',
  lenis: 'https://cdn.jsdelivr.net/npm/lenis@1.3.27/dist/lenis.mjs',
  'pdfjs-dist/legacy/build/pdf.min.mjs': 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/legacy/build/pdf.min.mjs',
}

function bibliotecasDoCdn() {
  return {
    name: 'bibliotecas-do-cdn',
    enforce: 'pre',
    resolveId(id) {
      if (CDN[id]) return { id: CDN[id], external: true }
    },
  }
}

export default defineConfig(({ mode }) => ({
  // caminhos relativos: o dist/ funciona na raiz de um domínio ou numa subpasta
  base: './',
  plugins: mode === 'artefato' ? [bibliotecasDoCdn()] : [],
  build: {
    target: 'es2020',
    outDir: mode === 'artefato' ? 'dist-artefato' : 'dist',
    assetsInlineLimit: 0,
  },
}))
