import Phaser from 'phaser'
import type { SessaoCombate } from '../aplicacao/sessaoCombate.ts'
import type { CombatenteEstado, Lado } from '../combate/tipos.ts'
import { HABILIDADES_PREVIEW } from '../conteudo/bibliotecaArte.ts'
import { descreverSituacao, TEXTOS } from '../conteudo/textos.ts'
import {
  DECORACOES_ARENA,
  carregarArteNoLoader,
  chaveTexturaArte,
  idsArteUsadosNaArena,
} from './decoracaoArena.ts'
import { LARGURA_ARENA } from './medidas.ts'
import { ALTURA_SPRITE, LARGURA_SPRITE, chaveTextura, desenharSilhueta } from './sprites.ts'

const DURACAO_INVESTIDA_MS = 180
const DISTANCIA_INVESTIDA = 34
const DURACAO_DANO_MS = 800
const DURACAO_ICONE_GOLPE_MS = 420
const LARGURA_BARRA = 72
const ALTURA_BARRA = 8

const ESTILO_NOME: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Georgia, Palatino, serif',
  fontSize: '15px',
  color: '#efe4d2',
}

const ESTILO_ESTADO: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Georgia, Palatino, serif',
  fontSize: '13px',
  color: '#c4553a',
}

interface AtorVisual {
  raiz: Phaser.GameObjects.Container
  sprite: Phaser.GameObjects.Image
  barraVida: Phaser.GameObjects.Rectangle
  nome: Phaser.GameObjects.Text
  estado: Phaser.GameObjects.Text
  iconeHabilidade: Phaser.GameObjects.Image | null
  danoVistoEmMs: number | null
  ataqueVistoEmMs: number | null
  baseX: number
  baseY: number
}

interface NumeroDano {
  texto: Phaser.GameObjects.Text
  inicioMs: number
  x: number
  y: number
}

export class CenaArena extends Phaser.Scene {
  private readonly sessao: SessaoCombate
  private readonly atores = new Map<string, AtorVisual>()
  private readonly numeros: NumeroDano[] = []
  private textoOnda: Phaser.GameObjects.Text | null = null
  private textoSituacao: Phaser.GameObjects.Text | null = null

  constructor(sessao: SessaoCombate) {
    super('arena')
    this.sessao = sessao
  }

  preload(): void {
    carregarArteNoLoader(this.load, idsArteUsadosNaArena())
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#120f0c')
    this.desenharCripta()
    this.colocarDecoracoes()
    const estado = this.sessao.obterEstado()
    const contagem: Record<Lado, number> = { heroi: 0, monstro: 0 }

    for (const combatente of estado.combatentes) {
      this.criarTextura(combatente.id)
      const indice = contagem[combatente.lado]
      contagem[combatente.lado] += 1
      this.atores.set(combatente.id, this.criarAtor(combatente, indice))
    }

    this.textoOnda = this.criarTexto(88, 28, 28, '#efe4d2')
    this.textoSituacao = this.criarTexto(48, 64, 18, '#e0b15c')

    const chaveOuro = chaveTexturaArte('tesouro:gold_coin')
    if (this.textures.exists(chaveOuro)) {
      this.add.image(56, 40, chaveOuro).setDisplaySize(36, 36).setDepth(5)
    }
  }

  update(): void {
    const estado = this.sessao.obterEstado()
    this.textoOnda?.setText(TEXTOS.onda(estado.onda))
    this.textoSituacao?.setText(descreverSituacao(estado.fase, estado.motivoIntervalo))

    for (const combatente of estado.combatentes) {
      const ator = this.atores.get(combatente.id)
      if (!ator) {
        continue
      }
      this.atualizarAtor(ator, combatente, estado.decorridoMs)
    }

    this.atualizarNumeros(estado.decorridoMs)
  }

  private criarTexto(x: number, y: number, tamanho: number, cor: string): Phaser.GameObjects.Text {
    const texto = this.add.text(x, y, '', {
      fontFamily: 'Georgia, Palatino, serif',
      fontSize: `${tamanho}px`,
      color: cor,
    })
    texto.setResolution(2)
    texto.setDepth(5)
    return texto
  }

  private criarTextura(id: string): void {
    const chave = chaveTextura(id)
    if (this.textures.exists(chave)) {
      return
    }

    const grafico = this.make.graphics({ x: 0, y: 0 }, false)
    desenharSilhueta(grafico, id)
    grafico.generateTexture(chave, LARGURA_SPRITE, ALTURA_SPRITE)
    grafico.destroy()
  }

  private criarAtor(combatente: CombatenteEstado, indice: number): AtorVisual {
    const { x, y } = posicao(combatente.lado, indice)
    const sprite = this.add.image(0, 0, chaveTextura(combatente.id)).setOrigin(0.5, 1)
    sprite.setFlipX(combatente.lado === 'monstro')

    const barraFundo = this.add.rectangle(-36, -124, LARGURA_BARRA, ALTURA_BARRA, 0x2a211c).setOrigin(0, 0.5)
    barraFundo.setStrokeStyle(1, 0x4a3b32)
    const barraVida = this.add.rectangle(-36, -124, LARGURA_BARRA, ALTURA_BARRA, 0x9a3b32).setOrigin(0, 0.5)
    const nome = this.add.text(0, -154, combatente.nome, {
      ...ESTILO_NOME,
      color: combatente.lado === 'heroi' ? '#d7e2ea' : '#e7d0c4',
    }).setOrigin(0.5, 1)
    const estado = this.add.text(0, -136, '', ESTILO_ESTADO).setOrigin(0.5, 1)
    nome.setResolution(2)
    estado.setResolution(2)

    const idHabilidade = HABILIDADES_PREVIEW[combatente.id]?.[0]
    let iconeHabilidade: Phaser.GameObjects.Image | null = null
    if (idHabilidade) {
      const chave = chaveTexturaArte(idHabilidade)
      if (this.textures.exists(chave)) {
        iconeHabilidade = this.add.image(0, -188, chave).setDisplaySize(36, 36).setOrigin(0.5, 1).setAlpha(0)
      }
    }

    const filhos: Phaser.GameObjects.GameObject[] = [sprite, barraFundo, barraVida, nome, estado]
    if (iconeHabilidade) {
      filhos.push(iconeHabilidade)
    }
    const raiz = this.add.container(x, y, filhos)
    raiz.setDepth(10)

    return {
      raiz,
      sprite,
      barraVida,
      nome,
      estado,
      iconeHabilidade,
      danoVistoEmMs: combatente.ultimoDanoEmMs,
      ataqueVistoEmMs: combatente.ultimoAtaqueEmMs,
      baseX: x,
      baseY: y,
    }
  }

  private atualizarAtor(ator: AtorVisual, combatente: CombatenteEstado, momentoMs: number): void {
    const maxima = combatente.atributos.vidaMaxima
    const proporcao = maxima <= 0 ? 0 : Math.max(0, combatente.vida / maxima)
    ator.barraVida.setScale(proporcao, 1)
    ator.barraVida.setFillStyle(corDaVida(proporcao))
    ator.sprite.setAlpha(combatente.vivo ? 1 : 0.35)
    ator.estado.setText(combatente.vivo ? '' : TEXTOS.tombou)

    const atacouHa = combatente.ultimoAtaqueEmMs === null ? Number.POSITIVE_INFINITY : momentoMs - combatente.ultimoAtaqueEmMs
    const investida = combatente.vivo && atacouHa >= 0 && atacouHa < DURACAO_INVESTIDA_MS
    const direcao = combatente.lado === 'heroi' ? 1 : -1
    ator.raiz.setPosition(ator.baseX + (investida ? direcao * DISTANCIA_INVESTIDA : 0), ator.baseY)

    if (
      combatente.ultimoAtaqueEmMs !== null
      && combatente.ultimoAtaqueEmMs !== ator.ataqueVistoEmMs
      && ator.iconeHabilidade
    ) {
      ator.ataqueVistoEmMs = combatente.ultimoAtaqueEmMs
      ator.iconeHabilidade.setAlpha(1)
    }

    if (ator.iconeHabilidade) {
      if (atacouHa < DURACAO_ICONE_GOLPE_MS) {
        ator.iconeHabilidade.setAlpha(1 - atacouHa / DURACAO_ICONE_GOLPE_MS)
        ator.iconeHabilidade.setY(-188 - atacouHa * 0.04)
      } else {
        ator.iconeHabilidade.setAlpha(0)
        ator.iconeHabilidade.setY(-188)
      }
    }

    if (combatente.ultimoDanoEmMs !== null && combatente.ultimoDanoEmMs !== ator.danoVistoEmMs && combatente.ultimoDanoRecebido !== null) {
      ator.danoVistoEmMs = combatente.ultimoDanoEmMs
      this.soltarDano(ator.baseX, ator.baseY - 200, combatente.ultimoDanoRecebido, combatente.ultimoDanoFoiCritico, combatente.ultimoDanoEmMs)
    }
  }

  private colocarDecoracoes(): void {
    for (const decoracao of DECORACOES_ARENA) {
      const chave = chaveTexturaArte(decoracao.idArte)
      if (!this.textures.exists(chave)) {
        continue
      }
      this.add
        .image(decoracao.x, decoracao.y, chave)
        .setOrigin(0.5, 1)
        .setScale(decoracao.escala)
        .setDepth(2)
    }
  }

  private soltarDano(x: number, y: number, dano: number, critico: boolean, inicioMs: number): void {
    const texto = this.add.text(x, y, critico ? TEXTOS.golpeCritico(dano) : String(dano), {
      fontFamily: 'Georgia, Palatino, serif',
      fontSize: '18px',
      color: critico ? '#e0b15c' : '#f4efe6',
    })
    texto.setOrigin(0.5, 1)
    texto.setResolution(2)
    texto.setDepth(20)
    this.numeros.push({ texto, inicioMs, x, y })
  }

  private atualizarNumeros(momentoMs: number): void {
    for (let indice = this.numeros.length - 1; indice >= 0; indice -= 1) {
      const numero = this.numeros[indice]
      if (!numero) {
        continue
      }
      const idade = momentoMs - numero.inicioMs
      if (idade > DURACAO_DANO_MS) {
        numero.texto.destroy()
        this.numeros.splice(indice, 1)
        continue
      }
      numero.texto.setPosition(numero.x, numero.y - idade * 0.02)
      numero.texto.setAlpha(1 - idade / DURACAO_DANO_MS)
    }
  }

  private desenharCripta(): void {
    const cripta = this.add.graphics()
    cripta.fillStyle(0x1c1713, 1)
    cripta.fillRect(36, 250, LARGURA_ARENA - 72, 230)
    cripta.fillStyle(0x2a221c, 1)
    cripta.fillRect(36, 430, LARGURA_ARENA - 72, 36)
    cripta.fillStyle(0x2c261f, 1)
    cripta.fillRect(78, 148, 28, 282)
    cripta.fillRect(LARGURA_ARENA - 106, 148, 28, 282)
    cripta.fillStyle(0x4e4338, 1)
    cripta.fillRect(64, 136, 56, 16)
    cripta.fillRect(LARGURA_ARENA - 120, 136, 56, 16)

    cripta.lineStyle(2, 0x4a3d32, 0.85)
    cripta.lineBetween(140, 400, 280, 368)
    cripta.lineBetween(690, 378, 820, 412)
    cripta.lineBetween(300, 448, 460, 452)

    cripta.fillStyle(0x3a2a22, 1)
    cripta.fillRect(458, 408, 44, 14)
    cripta.fillStyle(0xc4553a, 1)
    cripta.fillTriangle(480, 376, 464, 410, 496, 410)
    cripta.fillStyle(0xe0b15c, 1)
    cripta.fillTriangle(480, 388, 472, 410, 488, 410)
    cripta.setDepth(0)
  }
}

function posicao(lado: Lado, indice: number): { x: number; y: number } {
  if (lado === 'heroi') {
    return { x: 230 + indice * 160, y: 430 }
  }
  return { x: 590 + indice * 160, y: 430 }
}

function corDaVida(proporcao: number): number {
  if (proporcao > 0.55) {
    return 0x7f9a62
  }
  if (proporcao > 0.28) {
    return 0xc9a15b
  }
  return 0xa33b32
}
