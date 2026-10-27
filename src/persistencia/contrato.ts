export interface ProgressoSalvo {
  versao: 1
  ondaAlcancada: number
}

export interface RepositorioProgresso {
  carregar(): ProgressoSalvo | null
  salvar(progresso: ProgressoSalvo): void
}
