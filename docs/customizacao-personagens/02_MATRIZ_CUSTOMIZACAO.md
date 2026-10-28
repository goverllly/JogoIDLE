# 02 — Matriz de customização

Legenda: **OK** = asset atual · **FUTURO** = exige asset novo · **N/A** = não aplicável

## Por categoria

| Opção | Guerreiro | Bárbaro | Mago | Arqueiro | Status |
|-------|-----------|---------|------|----------|--------|
| Cor da pele | OK | OK | OK | OK | tint cabeça |
| Tint vestimenta | OK | OK | OK | OK | tint corpo |
| Tint metal/elmo | OK | OK | OK | N/A | sem mesh elmo no Rogue |
| Cor da capa | OK | OK | OK | OK | tint capa |
| Mostrar/ocultar capa | OK | OK | OK | OK | visibility |
| Mostrar/ocultar elmo | OK | OK | OK | N/A | default oculto no Studio |
| Escala 0.9–1.12 | OK | OK | OK | OK | só visual |
| Pose apresentação | OK | OK | OK | OK | Idle / Unarmed / 2H / Spellcasting |
| Estilos de cabelo | FUTURO | FUTURO | FUTURO | FUTURO | sem mesh |
| Barba | FUTURO | FUTURO | FUTURO | FUTURO | sem mesh |
| Olhos / rosto | FUTURO | FUTURO | FUTURO | FUTURO | sem mesh/morph |
| Variantes de capa | FUTURO | FUTURO | FUTURO | FUTURO | 1 mesh/classe |
| Peças de roupa | FUTURO | FUTURO | FUTURO | FUTURO | atlas único |
| Cabeça sem capuz (Arqueiro) | — | — | — | FUTURO | só Hooded no repo |

## Paletas (IDs estáveis)

- **skin:** fair, tan, olive, bronze, pale, ash  
- **armor:** steel, crimson, royal, forest, sand, shadow, ice, abyss  
- **metal:** gold, silver, copper, bronze, emerald, ruby, sapphire  
- **capeColor:** crimson, navy, forest, black, ivory, purple, gold  
- **stance:** Idle, Unarmed_Idle, 2H_Melee_Idle, Spellcasting  

## Equipamentos vs aparência

| Sistema | Efeito visual | Atributos |
|---------|---------------|-----------|
| Aparência nascimento | tint + elmo/capa | nenhum |
| Arma/offhand | mesh gear no GLB | gameplay |
| Armadura inventário | glow raridade (sem troca de malha) | gameplay |
| Cosméticos unlock | IDs em `cosmetics` apenas | nenhum; **não** sobrescrevem appearance |