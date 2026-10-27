import { ARTE_HUD, obterItemArte, urlArte } from '../conteudo/bibliotecaArte.ts'
import { TEXTOS } from '../conteudo/textos.ts'

const ITENS_FAIXA = [
  ARTE_HUD.ouro,
  ARTE_HUD.pilhaOuro,
  ARTE_HUD.saco,
  ARTE_HUD.bau,
  ARTE_HUD.bauMagico,
  ARTE_HUD.chave,
  ARTE_HUD.pocaoCura,
  ARTE_HUD.pocaoMana,
] as const

/** Prévia visual de moedas, baús e poções na HUD (sem economia no motor ainda). */
export function FaixaTesouro() {
  return (
    <div className="faixa-tesouro" aria-label={TEXTOS.faixaTesouro}>
      {ITENS_FAIXA.map((id) => {
        const item = obterItemArte(id)
        if (!item) {
          return null
        }
        return (
          <figure key={item.id} className="faixa-tesouro-item">
            <img src={urlArte(item.caminho)} alt={item.nome} width={40} height={40} />
            <figcaption>{item.nome}</figcaption>
          </figure>
        )
      })}
    </div>
  )
}
