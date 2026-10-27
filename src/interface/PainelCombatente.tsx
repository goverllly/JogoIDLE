import type { CombatenteEstado } from '../combate/tipos.ts'
import { HABILIDADES_PREVIEW, obterItemArte, urlArte } from '../conteudo/bibliotecaArte.ts'
import { TEXTOS } from '../conteudo/textos.ts'
import {
  formatarCritico,
  formatarUltimoGolpe,
  formatarVida,
  proporcaoRecarga,
  proporcaoVida,
} from './formatar.ts'

interface PropriedadesPainel {
  combatente: CombatenteEstado
}

export function PainelCombatente({ combatente }: PropriedadesPainel) {
  const vida = proporcaoVida(combatente)
  const recarga = proporcaoRecarga(combatente)
  const habilidades = (HABILIDADES_PREVIEW[combatente.id] ?? [])
    .map((id) => obterItemArte(id))
    .filter((item): item is NonNullable<typeof item> => item !== undefined)

  return (
    <article className={combatente.vivo ? 'carta' : 'carta tombou'}>
      <header className="carta-cabecalho">
        <h3>{combatente.nome}</h3>
        <p>{combatente.vivo ? TEXTOS.emCombate : TEXTOS.tombou}</p>
      </header>

      <div className="medida">
        <div className="medida-rotulo">
          <span>{TEXTOS.vida}</span>
          <span>{formatarVida(combatente.vida, combatente.atributos.vidaMaxima)}</span>
        </div>
        <div className="barra" aria-hidden="true">
          <span className="vida" style={{ width: `${vida * 100}%` }} />
        </div>
      </div>

      <div className="medida">
        <div className="medida-rotulo">
          <span>{TEXTOS.recarga}</span>
        </div>
        <div className="barra" aria-hidden="true">
          <span className="recarga" style={{ width: `${recarga * 100}%` }} />
        </div>
      </div>

      {habilidades.length > 0 ? (
        <div className="habilidades-preview">
          <p>{TEXTOS.habilidades}</p>
          <ul>
            {habilidades.map((item) => (
              <li key={item.id}>
                <img src={urlArte(item.caminho)} alt={item.nome} title={item.nome} width={36} height={36} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <dl className="atributos">
        <div>
          <dt>{TEXTOS.ataque}</dt>
          <dd>{combatente.atributos.ataque}</dd>
        </div>
        <div>
          <dt>{TEXTOS.defesa}</dt>
          <dd>{combatente.atributos.defesa}</dd>
        </div>
        <div>
          <dt>{TEXTOS.velocidade}</dt>
          <dd>{combatente.atributos.velocidade}</dd>
        </div>
        <div>
          <dt>{TEXTOS.critico}</dt>
          <dd>{formatarCritico(combatente.atributos.chanceCritico)}</dd>
        </div>
        <div className="golpe">
          <dt>{TEXTOS.ultimoGolpe}</dt>
          <dd>{formatarUltimoGolpe(combatente)}</dd>
        </div>
      </dl>
    </article>
  )
}
