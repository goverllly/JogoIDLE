import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { criarSessao } from './aplicacao/sessaoCombate.ts'
import { aleatorioNativo } from './combate/aleatorio.ts'
import { DEFINICOES } from './conteudo/definicoes.ts'
import { App } from './interface/App.tsx'
import { criarRepositorioLocal } from './persistencia/armazenamentoLocal.ts'
import './index.css'

const sessao = criarSessao({
  definicoes: DEFINICOES,
  repositorio: criarRepositorioLocal(),
  aleatorio: aleatorioNativo(),
})

sessao.iniciar()

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    sessao.parar()
  })
}

const raiz = document.getElementById('root')
if (!raiz) {
  throw new Error('Não foi possível encontrar o elemento raiz da interface.')
}

createRoot(raiz).render(
  <StrictMode>
    <App sessao={sessao} />
  </StrictMode>,
)
