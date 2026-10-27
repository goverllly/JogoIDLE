import { useEffect, useRef } from 'react'
import type { SessaoCombate } from '../aplicacao/sessaoCombate.ts'
import { criarJogo } from '../apresentacao/criarJogo.ts'
import { TEXTOS } from '../conteudo/textos.ts'

interface PropriedadesArena {
  sessao: SessaoCombate
}

export function Arena({ sessao }: PropriedadesArena) {
  const moldura = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const elemento = moldura.current
    if (!elemento) {
      return
    }

    let jogo: ReturnType<typeof criarJogo> | null = null
    let cancelado = false
    const quadro = window.requestAnimationFrame(() => {
      if (cancelado) {
        return
      }
      jogo = criarJogo(elemento, sessao)
    })

    return () => {
      cancelado = true
      window.cancelAnimationFrame(quadro)
      jogo?.destroy(true)
    }
  }, [sessao])

  return (
    <section className="arena-moldura" aria-label={TEXTOS.subtitulo}>
      <div ref={moldura} className="arena" />
    </section>
  )
}
