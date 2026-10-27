import type { SessaoCombate } from '../aplicacao/sessaoCombate.ts'
import type { CombatenteEstado, Lado } from '../combate/tipos.ts'
import { descreverSituacao, TEXTOS } from '../conteudo/textos.ts'
import { Arena } from './Arena.tsx'
import { FaixaTesouro } from './FaixaTesouro.tsx'
import { GaleriaArte } from './GaleriaArte.tsx'
import { PainelCombatente } from './PainelCombatente.tsx'
import { useEstadoCombate } from './useEstadoCombate.ts'

interface PropriedadesAplicacao {
  sessao: SessaoCombate
}

export function App({ sessao }: PropriedadesAplicacao) {
  const estado = useEstadoCombate(sessao)
  const herois = estado.combatentes.filter((combatente) => combatente.lado === 'heroi')
  const monstros = estado.combatentes.filter((combatente) => combatente.lado === 'monstro')

  return (
    <main>
      <header className="topo">
        <div>
          <p className="selo">{TEXTOS.subtitulo}</p>
          <h1>{TEXTOS.titulo}</h1>
          <p className="descricao">{TEXTOS.descricao}</p>
        </div>
        <div className="resumo">
          <p className="onda">{TEXTOS.onda(estado.onda)}</p>
          <p className="status" aria-live="polite">
            {descreverSituacao(estado.fase, estado.motivoIntervalo)}
          </p>
        </div>
      </header>

      <FaixaTesouro />
      <Arena sessao={sessao} />
      <p className="instrucao">{TEXTOS.instrucao}</p>

      <div className="grupos">
        <Grupo lado="heroi" titulo={TEXTOS.herois} combatentes={herois} />
        <Grupo lado="monstro" titulo={TEXTOS.monstros} combatentes={monstros} />
      </div>

      <GaleriaArte />
    </main>
  )
}

function Grupo({
  lado,
  titulo,
  combatentes,
}: {
  lado: Lado
  titulo: string
  combatentes: CombatenteEstado[]
}) {
  return (
    <section className={lado} aria-label={titulo}>
      <h2>{titulo}</h2>
      <div className="cartas">
        {combatentes.map((combatente) => (
          <PainelCombatente key={combatente.id} combatente={combatente} />
        ))}
      </div>
    </section>
  )
}
