import { useMemo, useState } from 'react'
import {
  ITENS_ARTE,
  PACOTES_ARTE,
  type CategoriaArte,
  type ItemArte,
  urlArte,
} from '../conteudo/bibliotecaArte.ts'
import { TEXTOS } from '../conteudo/textos.ts'

type FiltroCategoria = CategoriaArte | 'todos'

export function GaleriaArte() {
  const [filtro, setFiltro] = useState<FiltroCategoria>('todos')
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<ItemArte | null>(null)

  const itens = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    return ITENS_ARTE.filter((item) => {
      if (filtro !== 'todos' && item.categoria !== filtro) {
        return false
      }
      if (!termo) {
        return true
      }
      return item.nome.toLocaleLowerCase('pt-BR').includes(termo) || item.arquivo.toLowerCase().includes(termo)
    })
  }, [busca, filtro])

  return (
    <section className="galeria" aria-labelledby="galeria-titulo">
      <header className="galeria-cabecalho">
        <div>
          <h2 id="galeria-titulo">{TEXTOS.galeriaTitulo}</h2>
          <p>{TEXTOS.galeriaDescricao(ITENS_ARTE.length, PACOTES_ARTE.length)}</p>
        </div>
        <label className="galeria-busca">
          <span className="visually-hidden">{TEXTOS.galeriaBusca}</span>
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder={TEXTOS.galeriaBusca}
            autoComplete="off"
          />
        </label>
      </header>

      <div className="galeria-filtros" role="tablist" aria-label={TEXTOS.galeriaFiltros}>
        <BotaoFiltro ativo={filtro === 'todos'} onClick={() => setFiltro('todos')} rotulo={TEXTOS.galeriaTodos} />
        {PACOTES_ARTE.map((pacote) => (
          <BotaoFiltro
            key={pacote.id}
            ativo={filtro === pacote.id}
            onClick={() => setFiltro(pacote.id)}
            rotulo={`${pacote.titulo} (${pacote.itens.length})`}
          />
        ))}
      </div>

      <p className="galeria-contagem" aria-live="polite">
        {TEXTOS.galeriaContagem(itens.length)}
      </p>

      <ul className="galeria-grade">
        {itens.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={selecionado?.id === item.id ? 'galeria-item ativo' : 'galeria-item'}
              onClick={() => setSelecionado(item)}
              aria-pressed={selecionado?.id === item.id}
            >
              <img src={urlArte(item.caminho)} alt="" width={64} height={64} loading="lazy" />
              <span>{item.nome}</span>
            </button>
          </li>
        ))}
      </ul>

      {selecionado ? (
        <aside className="galeria-detalhe" aria-live="polite">
          <img src={urlArte(selecionado.caminho)} alt="" width={128} height={128} />
          <div>
            <h3>{selecionado.nome}</h3>
            <p>{PACOTES_ARTE.find((pacote) => pacote.id === selecionado.categoria)?.titulo}</p>
            <p className="galeria-caminho">{selecionado.caminho}</p>
          </div>
        </aside>
      ) : null}
    </section>
  )
}

function BotaoFiltro({
  ativo,
  onClick,
  rotulo,
}: {
  ativo: boolean
  onClick: () => void
  rotulo: string
}) {
  return (
    <button type="button" role="tab" aria-selected={ativo} className={ativo ? 'filtro ativo' : 'filtro'} onClick={onClick}>
      {rotulo}
    </button>
  )
}
