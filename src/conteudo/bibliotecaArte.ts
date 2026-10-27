/** Catálogo tipado de arte em public/assets (NewGameAssets). */

export type CategoriaArte =
  | 'pocoes'
  | 'racoes'
  | 'arcano'
  | 'sagrado'
  | 'berserker'
  | 'druida'
  | 'gelo'
  | 'tesouro'

export interface ItemArte {
  readonly id: string
  readonly categoria: CategoriaArte
  readonly nome: string
  readonly arquivo: string
  readonly caminho: string
}

export interface PacoteArte {
  readonly id: CategoriaArte
  readonly titulo: string
  readonly pasta: string
  readonly itens: readonly ItemArte[]
}

export function urlArte(caminho: string): string {
  return `/assets/${caminho}`
}

export const PACOTES_ARTE: readonly PacoteArte[] = [
  {
    id: 'pocoes',
    titulo: 'Poções',
    pasta: '20_classic_fantasy_potions',
    itens: [
      { id: 'pocoes:amethyst_purple_curse_potion', categoria: 'pocoes', nome: 'Poção da Maldição Ametista', arquivo: 'amethyst_purple_curse_potion.png', caminho: '20_classic_fantasy_potions/amethyst_purple_curse_potion.png' },
      { id: 'pocoes:antidote', categoria: 'pocoes', nome: 'Antídoto', arquivo: 'antidote.png', caminho: '20_classic_fantasy_potions/antidote.png' },
      { id: 'pocoes:berserker_rage', categoria: 'pocoes', nome: 'Fúria do Berserker', arquivo: 'berserker_rage.png', caminho: '20_classic_fantasy_potions/berserker_rage.png' },
      { id: 'pocoes:dragons_breath', categoria: 'pocoes', nome: 'Sopro do Dragão', arquivo: 'dragons_breath.png', caminho: '20_classic_fantasy_potions/dragons_breath.png' },
      { id: 'pocoes:emerald_green_poison_potion', categoria: 'pocoes', nome: 'Poção de Veneno Esmeralda', arquivo: 'emerald_green_poison_potion.png', caminho: '20_classic_fantasy_potions/emerald_green_poison_potion.png' },
      { id: 'pocoes:energy_tonic', categoria: 'pocoes', nome: 'Tônico de Energia', arquivo: 'energy_tonic.png', caminho: '20_classic_fantasy_potions/energy_tonic.png' },
      { id: 'pocoes:eternal_potion', categoria: 'pocoes', nome: 'Poção Eterna', arquivo: 'eternal_potion.png', caminho: '20_classic_fantasy_potions/eternal_potion.png' },
      { id: 'pocoes:focus_potion', categoria: 'pocoes', nome: 'Poção de Foco', arquivo: 'focus_potion.png', caminho: '20_classic_fantasy_potions/focus_potion.png' },
      { id: 'pocoes:frost_resist', categoria: 'pocoes', nome: 'Resistência ao Gelo', arquivo: 'frost_resist.png', caminho: '20_classic_fantasy_potions/frost_resist.png' },
      { id: 'pocoes:golden_elixir_of_vitality', categoria: 'pocoes', nome: 'Elixir Dourado de Vitalidade', arquivo: 'golden_elixir_of_vitality.png', caminho: '20_classic_fantasy_potions/golden_elixir_of_vitality.png' },
      { id: 'pocoes:greater_healing', categoria: 'pocoes', nome: 'Cura Maior', arquivo: 'greater_healing.png', caminho: '20_classic_fantasy_potions/greater_healing.png' },
      { id: 'pocoes:greater_mana', categoria: 'pocoes', nome: 'Mana Maior', arquivo: 'greater_mana.png', caminho: '20_classic_fantasy_potions/greater_mana.png' },
      { id: 'pocoes:haste_potion', categoria: 'pocoes', nome: 'Poção de Pressa', arquivo: 'haste_potion.png', caminho: '20_classic_fantasy_potions/haste_potion.png' },
      { id: 'pocoes:lesser_healing', categoria: 'pocoes', nome: 'Cura Menor', arquivo: 'lesser_healing.png', caminho: '20_classic_fantasy_potions/lesser_healing.png' },
      { id: 'pocoes:mana_rejuvenation', categoria: 'pocoes', nome: 'Rejuvenescimento de Mana', arquivo: 'mana_rejuvenation.png', caminho: '20_classic_fantasy_potions/mana_rejuvenation.png' },
      { id: 'pocoes:nirvana_brew', categoria: 'pocoes', nome: 'Fermento do Nirvana', arquivo: 'nirvana_brew.png', caminho: '20_classic_fantasy_potions/nirvana_brew.png' },
      { id: 'pocoes:ruby_red_healing_potion', categoria: 'pocoes', nome: 'Poção de Cura Rubi', arquivo: 'ruby_red_healing_potion.png', caminho: '20_classic_fantasy_potions/ruby_red_healing_potion.png' },
      { id: 'pocoes:sapphire_blue_mana_potion', categoria: 'pocoes', nome: 'Poção de Mana Safira', arquivo: 'sapphire_blue_mana_potion.png', caminho: '20_classic_fantasy_potions/sapphire_blue_mana_potion.png' },
      { id: 'pocoes:shadow_veiling', categoria: 'pocoes', nome: 'Véu das Sombras', arquivo: 'shadow_veiling.png', caminho: '20_classic_fantasy_potions/shadow_veiling.png' },
      { id: 'pocoes:stamina_draught', categoria: 'pocoes', nome: 'Trago de Resistência', arquivo: 'stamina_draught.png', caminho: '20_classic_fantasy_potions/stamina_draught.png' },
    ],
  },
  {
    id: 'racoes',
    titulo: 'Rações e provisões',
    pasta: 'Vol14_Campfire_Rations_Grim_Provisions',
    itens: [
      { id: 'racoes:01_roasted_monster_meat', categoria: 'racoes', nome: 'Carne assada de monstro', arquivo: '01_roasted_monster_meat.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/01_roasted_monster_meat.png' },
      { id: 'racoes:02_hardtack_biscuit', categoria: 'racoes', nome: 'Biscoito de viagem', arquivo: '02_hardtack_biscuit.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/02_hardtack_biscuit.png' },
      { id: 'racoes:03_cured_ham', categoria: 'racoes', nome: 'Presunto curado', arquivo: '03_cured_ham.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/03_cured_ham.png' },
      { id: 'racoes:04_mystery_stew', categoria: 'racoes', nome: 'Ensopado misterioso', arquivo: '04_mystery_stew.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/04_mystery_stew.png' },
      { id: 'racoes:05_salted_fish', categoria: 'racoes', nome: 'Peixe salgado', arquivo: '05_salted_fish.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/05_salted_fish.png' },
      { id: 'racoes:06_black_bread', categoria: 'racoes', nome: 'Pão negro', arquivo: '06_black_bread.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/06_black_bread.png' },
      { id: 'racoes:07_cheese_wedge', categoria: 'racoes', nome: 'Fatia de queijo', arquivo: '07_cheese_wedge.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/07_cheese_wedge.png' },
      { id: 'racoes:08_dried_jerky', categoria: 'racoes', nome: 'Carne seca', arquivo: '08_dried_jerky.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/08_dried_jerky.png' },
      { id: 'racoes:09_mushroom_soup', categoria: 'racoes', nome: 'Sopa de cogumelos', arquivo: '09_mushroom_soup.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/09_mushroom_soup.png' },
      { id: 'racoes:10_flagon_of_mead', categoria: 'racoes', nome: 'Caneca de hidromel', arquivo: '10_flagon_of_mead.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/10_flagon_of_mead.png' },
      { id: 'racoes:11_leather_waterskin', categoria: 'racoes', nome: 'Cantil de couro', arquivo: '11_leather_waterskin.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/11_leather_waterskin.png' },
      { id: 'racoes:12_boiled_maggots', categoria: 'racoes', nome: 'Larvas fervidas', arquivo: '12_boiled_maggots.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/12_boiled_maggots.png' },
      { id: 'racoes:13_smoked_sausage', categoria: 'racoes', nome: 'Linguiça defumada', arquivo: '13_smoked_sausage.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/13_smoked_sausage.png' },
      { id: 'racoes:14_roasted_chestnuts', categoria: 'racoes', nome: 'Castanhas assadas', arquivo: '14_roasted_chestnuts.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/14_roasted_chestnuts.png' },
      { id: 'racoes:15_iron_ration_can', categoria: 'racoes', nome: 'Ração de ferro', arquivo: '15_iron_ration_can.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/15_iron_ration_can.png' },
      { id: 'racoes:16_spiced_rum', categoria: 'racoes', nome: 'Rum temperado', arquivo: '16_spiced_rum.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/16_spiced_rum.png' },
      { id: 'racoes:17_honeycomb', categoria: 'racoes', nome: 'Favo de mel', arquivo: '17_honeycomb.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/17_honeycomb.png' },
      { id: 'racoes:18_boiled_tubers', categoria: 'racoes', nome: 'Tubérculos fervidos', arquivo: '18_boiled_tubers.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/18_boiled_tubers.png' },
      { id: 'racoes:19_roast_fowl', categoria: 'racoes', nome: 'Ave assada', arquivo: '19_roast_fowl.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/19_roast_fowl.png' },
      { id: 'racoes:20_travelers_tea', categoria: 'racoes', nome: 'Chá do viajante', arquivo: '20_travelers_tea.png', caminho: 'Vol14_Campfire_Rations_Grim_Provisions/20_travelers_tea.png' },
    ],
  },
  {
    id: 'arcano',
    titulo: 'Magia arcana e cronomancia',
    pasta: 'Vol21_Arcane_Chrono_Magic',
    itens: [
      { id: 'arcano:01_arcane_missiles', categoria: 'arcano', nome: 'Mísseis arcanos', arquivo: '01_arcane_missiles.png', caminho: 'Vol21_Arcane_Chrono_Magic/01_arcane_missiles.png' },
      { id: 'arcano:02_chrono_hourglass', categoria: 'arcano', nome: 'Ampulheta cronomântica', arquivo: '02_chrono_hourglass.png', caminho: 'Vol21_Arcane_Chrono_Magic/02_chrono_hourglass.png' },
      { id: 'arcano:03_teleport_rift', categoria: 'arcano', nome: 'Fenda de teleporte', arquivo: '03_teleport_rift.png', caminho: 'Vol21_Arcane_Chrono_Magic/03_teleport_rift.png' },
      { id: 'arcano:04_phase_blink', categoria: 'arcano', nome: 'Piscadela de fase', arquivo: '04_phase_blink.png', caminho: 'Vol21_Arcane_Chrono_Magic/04_phase_blink.png' },
      { id: 'arcano:05_gravity_collapse', categoria: 'arcano', nome: 'Colapso gravitacional', arquivo: '05_gravity_collapse.png', caminho: 'Vol21_Arcane_Chrono_Magic/05_gravity_collapse.png' },
      { id: 'arcano:06_arcane_rune_shield', categoria: 'arcano', nome: 'Escudo de runa arcana', arquivo: '06_arcane_rune_shield.png', caminho: 'Vol21_Arcane_Chrono_Magic/06_arcane_rune_shield.png' },
      { id: 'arcano:07_void_warp', categoria: 'arcano', nome: 'Distorção do vazio', arquivo: '07_void_warp.png', caminho: 'Vol21_Arcane_Chrono_Magic/07_void_warp.png' },
      { id: 'arcano:08_time_rewind', categoria: 'arcano', nome: 'Rebobinar o tempo', arquivo: '08_time_rewind.png', caminho: 'Vol21_Arcane_Chrono_Magic/08_time_rewind.png' },
      { id: 'arcano:09_temporal_stasis', categoria: 'arcano', nome: 'Estase temporal', arquivo: '09_temporal_stasis.png', caminho: 'Vol21_Arcane_Chrono_Magic/09_temporal_stasis.png' },
      { id: 'arcano:10_mana_singularity', categoria: 'arcano', nome: 'Singularidade de mana', arquivo: '10_mana_singularity.png', caminho: 'Vol21_Arcane_Chrono_Magic/10_mana_singularity.png' },
      { id: 'arcano:11_dimensional_slash', categoria: 'arcano', nome: 'Corte dimensional', arquivo: '11_dimensional_slash.png', caminho: 'Vol21_Arcane_Chrono_Magic/11_dimensional_slash.png' },
      { id: 'arcano:12_astral_projection', categoria: 'arcano', nome: 'Projeção astral', arquivo: '12_astral_projection.png', caminho: 'Vol21_Arcane_Chrono_Magic/12_astral_projection.png' },
      { id: 'arcano:13_chronomancer_pocketwatch', categoria: 'arcano', nome: 'Relógio do cronomante', arquivo: '13_chronomancer_pocketwatch.png', caminho: 'Vol21_Arcane_Chrono_Magic/13_chronomancer_pocketwatch.png' },
      { id: 'arcano:14_arcane_barrage', categoria: 'arcano', nome: 'Barragem arcana', arquivo: '14_arcane_barrage.png', caminho: 'Vol21_Arcane_Chrono_Magic/14_arcane_barrage.png' },
      { id: 'arcano:15_warp_prism', categoria: 'arcano', nome: 'Prisma de dobra', arquivo: '15_warp_prism.png', caminho: 'Vol21_Arcane_Chrono_Magic/15_warp_prism.png' },
      { id: 'arcano:16_gravity_well', categoria: 'arcano', nome: 'Poço gravitacional', arquivo: '16_gravity_well.png', caminho: 'Vol21_Arcane_Chrono_Magic/16_gravity_well.png' },
      { id: 'arcano:17_time_dilation_field', categoria: 'arcano', nome: 'Campo de dilatação', arquivo: '17_time_dilation_field.png', caminho: 'Vol21_Arcane_Chrono_Magic/17_time_dilation_field.png' },
      { id: 'arcano:18_spatial_anchor', categoria: 'arcano', nome: 'Âncora espacial', arquivo: '18_spatial_anchor.png', caminho: 'Vol21_Arcane_Chrono_Magic/18_spatial_anchor.png' },
      { id: 'arcano:19_mana_surge_tome', categoria: 'arcano', nome: 'Tomo de surto de mana', arquivo: '19_mana_surge_tome.png', caminho: 'Vol21_Arcane_Chrono_Magic/19_mana_surge_tome.png' },
      { id: 'arcano:20_wormhole_nexus', categoria: 'arcano', nome: 'Nexo de buraco de minhoca', arquivo: '20_wormhole_nexus.png', caminho: 'Vol21_Arcane_Chrono_Magic/20_wormhole_nexus.png' },
    ],
  },
  {
    id: 'sagrado',
    titulo: 'Luz sagrada',
    pasta: 'Vol22_Holy_Light_Divine_Smite',
    itens: [
      { id: 'sagrado:01_radiant_smite', categoria: 'sagrado', nome: 'Golpe radiante', arquivo: '01_radiant_smite.png', caminho: 'Vol22_Holy_Light_Divine_Smite/01_radiant_smite.png' },
      { id: 'sagrado:02_hammer_of_wrath', categoria: 'sagrado', nome: 'Martelo da ira', arquivo: '02_hammer_of_wrath.png', caminho: 'Vol22_Holy_Light_Divine_Smite/02_hammer_of_wrath.png' },
      { id: 'sagrado:03_pillar_of_dawn', categoria: 'sagrado', nome: 'Pilar da alvorada', arquivo: '03_pillar_of_dawn.png', caminho: 'Vol22_Holy_Light_Divine_Smite/03_pillar_of_dawn.png' },
      { id: 'sagrado:04_holy_nova', categoria: 'sagrado', nome: 'Nova sagrada', arquivo: '04_holy_nova.png', caminho: 'Vol22_Holy_Light_Divine_Smite/04_holy_nova.png' },
      { id: 'sagrado:05_consecrated_ground', categoria: 'sagrado', nome: 'Solo consagrado', arquivo: '05_consecrated_ground.png', caminho: 'Vol22_Holy_Light_Divine_Smite/05_consecrated_ground.png' },
      { id: 'sagrado:06_divine_bulwark', categoria: 'sagrado', nome: 'Baluarte divino', arquivo: '06_divine_bulwark.png', caminho: 'Vol22_Holy_Light_Divine_Smite/06_divine_bulwark.png' },
      { id: 'sagrado:07_seal_of_atonement', categoria: 'sagrado', nome: 'Selo da expiação', arquivo: '07_seal_of_atonement.png', caminho: 'Vol22_Holy_Light_Divine_Smite/07_seal_of_atonement.png' },
      { id: 'sagrado:08_solar_flare', categoria: 'sagrado', nome: 'Explosão solar', arquivo: '08_solar_flare.png', caminho: 'Vol22_Holy_Light_Divine_Smite/08_solar_flare.png' },
      { id: 'sagrado:09_shackles_of_light', categoria: 'sagrado', nome: 'Grilhões de luz', arquivo: '09_shackles_of_light.png', caminho: 'Vol22_Holy_Light_Divine_Smite/09_shackles_of_light.png' },
      { id: 'sagrado:10_aura_of_fortitude', categoria: 'sagrado', nome: 'Aura de fortitude', arquivo: '10_aura_of_fortitude.png', caminho: 'Vol22_Holy_Light_Divine_Smite/10_aura_of_fortitude.png' },
      { id: 'sagrado:11_spear_of_retribution', categoria: 'sagrado', nome: 'Lança da retribuição', arquivo: '11_spear_of_retribution.png', caminho: 'Vol22_Holy_Light_Divine_Smite/11_spear_of_retribution.png' },
      { id: 'sagrado:12_blades_of_justice', categoria: 'sagrado', nome: 'Lâminas da justiça', arquivo: '12_blades_of_justice.png', caminho: 'Vol22_Holy_Light_Divine_Smite/12_blades_of_justice.png' },
      { id: 'sagrado:13_purifying_wave', categoria: 'sagrado', nome: 'Onda purificadora', arquivo: '13_purifying_wave.png', caminho: 'Vol22_Holy_Light_Divine_Smite/13_purifying_wave.png' },
      { id: 'sagrado:14_angelic_leap', categoria: 'sagrado', nome: 'Salto angelical', arquivo: '14_angelic_leap.png', caminho: 'Vol22_Holy_Light_Divine_Smite/14_angelic_leap.png' },
      { id: 'sagrado:15_martyr_sacrifice', categoria: 'sagrado', nome: 'Sacrifício do mártir', arquivo: '15_martyr_sacrifice.png', caminho: 'Vol22_Holy_Light_Divine_Smite/15_martyr_sacrifice.png' },
      { id: 'sagrado:16_retributive_thorns', categoria: 'sagrado', nome: 'Espinhos retributivos', arquivo: '16_retributive_thorns.png', caminho: 'Vol22_Holy_Light_Divine_Smite/16_retributive_thorns.png' },
      { id: 'sagrado:17_litany_of_courage', categoria: 'sagrado', nome: 'Ladainha de coragem', arquivo: '17_litany_of_courage.png', caminho: 'Vol22_Holy_Light_Divine_Smite/17_litany_of_courage.png' },
      { id: 'sagrado:18_arbitration_scales', categoria: 'sagrado', nome: 'Balança da arbitragem', arquivo: '18_arbitration_scales.png', caminho: 'Vol22_Holy_Light_Divine_Smite/18_arbitration_scales.png' },
      { id: 'sagrado:19_hand_of_salvation', categoria: 'sagrado', nome: 'Mão da salvação', arquivo: '19_hand_of_salvation.png', caminho: 'Vol22_Holy_Light_Divine_Smite/19_hand_of_salvation.png' },
      { id: 'sagrado:20_execution_guillotine', categoria: 'sagrado', nome: 'Guilhotina da execução', arquivo: '20_execution_guillotine.png', caminho: 'Vol22_Holy_Light_Divine_Smite/20_execution_guillotine.png' },
    ],
  },
  {
    id: 'berserker',
    titulo: 'Combate berserker',
    pasta: 'Vol24_Berserker_Bloodfury_Combat_Skills',
    itens: [
      { id: 'berserker:01_furious_cleave', categoria: 'berserker', nome: 'Cutilada furiosa', arquivo: '01_furious_cleave.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/01_furious_cleave.png' },
      { id: 'berserker:02_bloody_decapitation', categoria: 'berserker', nome: 'Decapitação sangrenta', arquivo: '02_bloody_decapitation.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/02_bloody_decapitation.png' },
      { id: 'berserker:03_ground_tremor_slam', categoria: 'berserker', nome: 'Batida do tremor', arquivo: '03_ground_tremor_slam.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/03_ground_tremor_slam.png' },
      { id: 'berserker:04_brutal_stomp', categoria: 'berserker', nome: 'Pisada brutal', arquivo: '04_brutal_stomp.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/04_brutal_stomp.png' },
      { id: 'berserker:05_blood_boil_surge', categoria: 'berserker', nome: 'Surto de sangue fervente', arquivo: '05_blood_boil_surge.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/05_blood_boil_surge.png' },
      { id: 'berserker:06_frenzy_battering', categoria: 'berserker', nome: 'Espancamento frenético', arquivo: '06_frenzy_battering.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/06_frenzy_battering.png' },
      { id: 'berserker:07_shattering_sunder', categoria: 'berserker', nome: 'Rajada estilhaçante', arquivo: '07_shattering_sunder.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/07_shattering_sunder.png' },
      { id: 'berserker:08_undying_rage_roar', categoria: 'berserker', nome: 'Rugido da fúria imortal', arquivo: '08_undying_rage_roar.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/08_undying_rage_roar.png' },
      { id: 'berserker:09_gore_impale', categoria: 'berserker', nome: 'Empalamento sangrento', arquivo: '09_gore_impale.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/09_gore_impale.png' },
      { id: 'berserker:10_rage_ignited_tackle', categoria: 'berserker', nome: 'Investida inflamada', arquivo: '10_rage_ignited_tackle.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/10_rage_ignited_tackle.png' },
      { id: 'berserker:11_blood_drain_bite', categoria: 'berserker', nome: 'Mordida drenadora', arquivo: '11_blood_drain_bite.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/11_blood_drain_bite.png' },
      { id: 'berserker:12_skull_crusher', categoria: 'berserker', nome: 'Esmaga-crânios', arquivo: '12_skull_crusher.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/12_skull_crusher.png' },
      { id: 'berserker:13_savage_leap', categoria: 'berserker', nome: 'Salto selvagem', arquivo: '13_savage_leap.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/13_savage_leap.png' },
      { id: 'berserker:14_berserk_regeneration', categoria: 'berserker', nome: 'Regeneração berserk', arquivo: '14_berserk_regeneration.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/14_berserk_regeneration.png' },
      { id: 'berserker:15_chain_cleaver_throw', categoria: 'berserker', nome: 'Arremesso de cutelo', arquivo: '15_chain_cleaver_throw.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/15_chain_cleaver_throw.png' },
      { id: 'berserker:16_crimson_spikes_burst', categoria: 'berserker', nome: 'Estalo de espinhos carmesim', arquivo: '16_crimson_spikes_burst.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/16_crimson_spikes_burst.png' },
      { id: 'berserker:17_armor_rend', categoria: 'berserker', nome: 'Rasgo de armadura', arquivo: '17_armor_rend.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/17_armor_rend.png' },
      { id: 'berserker:18_reckless_swing', categoria: 'berserker', nome: 'Golpe temerário', arquivo: '18_reckless_swing.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/18_reckless_swing.png' },
      { id: 'berserker:19_bloodline_awakening', categoria: 'berserker', nome: 'Despertar do sangue', arquivo: '19_bloodline_awakening.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/19_bloodline_awakening.png' },
      { id: 'berserker:20_final_deathblow', categoria: 'berserker', nome: 'Golpe final da morte', arquivo: '20_final_deathblow.png', caminho: 'Vol24_Berserker_Bloodfury_Combat_Skills/20_final_deathblow.png' },
    ],
  },
  {
    id: 'druida',
    titulo: 'Magia druidica',
    pasta: 'Vol25_Druid_Shapeshifting_Nature_Magic',
    itens: [
      { id: 'druida:01_grizzly_paw_swipe', categoria: 'druida', nome: 'Pata do urso', arquivo: '01_grizzly_paw_swipe.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/01_grizzly_paw_swipe.png' },
      { id: 'druida:02_panther_fang_crunch', categoria: 'druida', nome: 'Presa da pantera', arquivo: '02_panther_fang_crunch.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/02_panther_fang_crunch.png' },
      { id: 'druida:03_strangling_vine_lash', categoria: 'druida', nome: 'Chicote de vinhas', arquivo: '03_strangling_vine_lash.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/03_strangling_vine_lash.png' },
      { id: 'druida:04_briar_patch_snare', categoria: 'druida', nome: 'Armadilha de espinhos', arquivo: '04_briar_patch_snare.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/04_briar_patch_snare.png' },
      { id: 'druida:05_awakened_treant_call', categoria: 'druida', nome: 'Chamado do ent', arquivo: '05_awakened_treant_call.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/05_awakened_treant_call.png' },
      { id: 'druida:06_verdant_rain_shower', categoria: 'druida', nome: 'Chuva verdante', arquivo: '06_verdant_rain_shower.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/06_verdant_rain_shower.png' },
      { id: 'druida:07_choking_pollen_burst', categoria: 'druida', nome: 'Explosão de pólen', arquivo: '07_choking_pollen_burst.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/07_choking_pollen_burst.png' },
      { id: 'druida:08_forked_sky_lightning', categoria: 'druida', nome: 'Relâmpago bifurcado', arquivo: '08_forked_sky_lightning.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/08_forked_sky_lightning.png' },
      { id: 'druida:09_ironwood_carapace', categoria: 'druida', nome: 'Carapaça de ferro-vivo', arquivo: '09_ironwood_carapace.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/09_ironwood_carapace.png' },
      { id: 'druida:10_howling_wolf_spirit', categoria: 'druida', nome: 'Espírito do lobo', arquivo: '10_howling_wolf_spirit.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/10_howling_wolf_spirit.png' },
      { id: 'druida:11_charging_antler_ram', categoria: 'druida', nome: 'Investida de chifres', arquivo: '11_charging_antler_ram.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/11_charging_antler_ram.png' },
      { id: 'druida:12_hornet_swarm_plague', categoria: 'druida', nome: 'Enxame de vespas', arquivo: '12_hornet_swarm_plague.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/12_hornet_swarm_plague.png' },
      { id: 'druida:13_solar_zenith_ray', categoria: 'druida', nome: 'Raio do zênite', arquivo: '13_solar_zenith_ray.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/13_solar_zenith_ray.png' },
      { id: 'druida:14_lunar_crescent_arc', categoria: 'druida', nome: 'Arco da lua crescente', arquivo: '14_lunar_crescent_arc.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/14_lunar_crescent_arc.png' },
      { id: 'druida:15_quicksand_mud_vortex', categoria: 'druida', nome: 'Vórtice de areia movediça', arquivo: '15_quicksand_mud_vortex.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/15_quicksand_mud_vortex.png' },
      { id: 'druida:16_sprouting_vitality_bud', categoria: 'druida', nome: 'Broto de vitalidade', arquivo: '16_sprouting_vitality_bud.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/16_sprouting_vitality_bud.png' },
      { id: 'druida:17_feather_storm_barrage', categoria: 'druida', nome: 'Rajada de penas', arquivo: '17_feather_storm_barrage.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/17_feather_storm_barrage.png' },
      { id: 'druida:18_venomous_fang_spit', categoria: 'druida', nome: 'Cuspe de presa venenosa', arquivo: '18_venomous_fang_spit.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/18_venomous_fang_spit.png' },
      { id: 'druida:19_uprooted_boulder_hurl', categoria: 'druida', nome: 'Arremesso de pedregulho', arquivo: '19_uprooted_boulder_hurl.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/19_uprooted_boulder_hurl.png' },
      { id: 'druida:20_hibernation_cocoon', categoria: 'druida', nome: 'Casulo de hibernação', arquivo: '20_hibernation_cocoon.png', caminho: 'Vol25_Druid_Shapeshifting_Nature_Magic/20_hibernation_cocoon.png' },
    ],
  },
  {
    id: 'gelo',
    titulo: 'Artes glaciais',
    pasta: 'Vol26_Frost_Glacial_Arts',
    itens: [
      { id: 'gelo:01_icicle_volley_rain', categoria: 'gelo', nome: 'Chuva de estalactites', arquivo: '01_icicle_volley_rain.png', caminho: 'Vol26_Frost_Glacial_Arts/01_icicle_volley_rain.png' },
      { id: 'gelo:02_frost_buckler_orbit', categoria: 'gelo', nome: 'Broquel de geada', arquivo: '02_frost_buckler_orbit.png', caminho: 'Vol26_Frost_Glacial_Arts/02_frost_buckler_orbit.png' },
      { id: 'gelo:03_snowflake_rune_sigil', categoria: 'gelo', nome: 'Sigilo do floco', arquivo: '03_snowflake_rune_sigil.png', caminho: 'Vol26_Frost_Glacial_Arts/03_snowflake_rune_sigil.png' },
      { id: 'gelo:04_shatter_frost_cleave', categoria: 'gelo', nome: 'Cutilada estilhaçante', arquivo: '04_shatter_frost_cleave.png', caminho: 'Vol26_Frost_Glacial_Arts/04_shatter_frost_cleave.png' },
      { id: 'gelo:05_glacial_pillar_cage', categoria: 'gelo', nome: 'Gaiola de pilares glaciais', arquivo: '05_glacial_pillar_cage.png', caminho: 'Vol26_Frost_Glacial_Arts/05_glacial_pillar_cage.png' },
      { id: 'gelo:06_permafrost_greaves_lock', categoria: 'gelo', nome: 'Grevas do permafrost', arquivo: '06_permafrost_greaves_lock.png', caminho: 'Vol26_Frost_Glacial_Arts/06_permafrost_greaves_lock.png' },
      { id: 'gelo:07_rime_comet_crash', categoria: 'gelo', nome: 'Cometa de geada', arquivo: '07_rime_comet_crash.png', caminho: 'Vol26_Frost_Glacial_Arts/07_rime_comet_crash.png' },
      { id: 'gelo:08_arctic_gale_breath', categoria: 'gelo', nome: 'Sopro da ventania ártica', arquivo: '08_arctic_gale_breath.png', caminho: 'Vol26_Frost_Glacial_Arts/08_arctic_gale_breath.png' },
      { id: 'gelo:09_ice_mirror_simulacrum', categoria: 'gelo', nome: 'Simulacro do espelho de gelo', arquivo: '09_ice_mirror_simulacrum.png', caminho: 'Vol26_Frost_Glacial_Arts/09_ice_mirror_simulacrum.png' },
      { id: 'gelo:10_glacier_cliff_collapse', categoria: 'gelo', nome: 'Desabamento glacial', arquivo: '10_glacier_cliff_collapse.png', caminho: 'Vol26_Frost_Glacial_Arts/10_glacier_cliff_collapse.png' },
      { id: 'gelo:11_zero_kelvin_crystal', categoria: 'gelo', nome: 'Cristal de zero kelvin', arquivo: '11_zero_kelvin_crystal.png', caminho: 'Vol26_Frost_Glacial_Arts/11_zero_kelvin_crystal.png' },
      { id: 'gelo:12_avalanching_snow_boulder', categoria: 'gelo', nome: 'Boulder de avalanche', arquivo: '12_avalanching_snow_boulder.png', caminho: 'Vol26_Frost_Glacial_Arts/12_avalanching_snow_boulder.png' },
      { id: 'gelo:13_black_ice_glide_path', categoria: 'gelo', nome: 'Trilha de gelo negro', arquivo: '13_black_ice_glide_path.png', caminho: 'Vol26_Frost_Glacial_Arts/13_black_ice_glide_path.png' },
      { id: 'gelo:14_frostbite_blight_brand', categoria: 'gelo', nome: 'Marca da geada', arquivo: '14_frostbite_blight_brand.png', caminho: 'Vol26_Frost_Glacial_Arts/14_frostbite_blight_brand.png' },
      { id: 'gelo:15_floating_ice_floe', categoria: 'gelo', nome: 'Banco de gelo flutuante', arquivo: '15_floating_ice_floe.png', caminho: 'Vol26_Frost_Glacial_Arts/15_floating_ice_floe.png' },
      { id: 'gelo:16_frozen_sundial_stasis', categoria: 'gelo', nome: 'Relógio de sol congelado', arquivo: '16_frozen_sundial_stasis.png', caminho: 'Vol26_Frost_Glacial_Arts/16_frozen_sundial_stasis.png' },
      { id: 'gelo:17_ice_lotus_sanctuary', categoria: 'gelo', nome: 'Santuário do lótus de gelo', arquivo: '17_ice_lotus_sanctuary.png', caminho: 'Vol26_Frost_Glacial_Arts/17_ice_lotus_sanctuary.png' },
      { id: 'gelo:18_stalactite_icicle_drop', categoria: 'gelo', nome: 'Queda de estalactite', arquivo: '18_stalactite_icicle_drop.png', caminho: 'Vol26_Frost_Glacial_Arts/18_stalactite_icicle_drop.png' },
      { id: 'gelo:19_blizzard_whiteout_veil', categoria: 'gelo', nome: 'Véu da nevasca', arquivo: '19_blizzard_whiteout_veil.png', caminho: 'Vol26_Frost_Glacial_Arts/19_blizzard_whiteout_veil.png' },
      { id: 'gelo:20_frost_drake_roar', categoria: 'gelo', nome: 'Rugido do drake glacial', arquivo: '20_frost_drake_roar.png', caminho: 'Vol26_Frost_Glacial_Arts/20_frost_drake_roar.png' },
    ],
  },
  {
    id: 'tesouro',
    titulo: 'Moedas, gemas e baús',
    pasta: 'dark_fantasy_currency_and_chests',
    itens: [
      { id: 'tesouro:ancient_bronze_coin', categoria: 'tesouro', nome: 'Moeda de bronze antiga', arquivo: 'ancient_bronze_coin.png', caminho: 'dark_fantasy_currency_and_chests/ancient_bronze_coin.png' },
      { id: 'tesouro:broken_wooden_chest', categoria: 'tesouro', nome: 'Baú de madeira quebrado', arquivo: 'broken_wooden_chest.png', caminho: 'dark_fantasy_currency_and_chests/broken_wooden_chest.png' },
      { id: 'tesouro:dark_magic_chest', categoria: 'tesouro', nome: 'Baú de magia sombria', arquivo: 'dark_magic_chest.png', caminho: 'dark_fantasy_currency_and_chests/dark_magic_chest.png' },
      { id: 'tesouro:emerald', categoria: 'tesouro', nome: 'Esmeralda', arquivo: 'emerald.png', caminho: 'dark_fantasy_currency_and_chests/emerald.png' },
      { id: 'tesouro:gold_bars', categoria: 'tesouro', nome: 'Barras de ouro', arquivo: 'gold_bars.png', caminho: 'dark_fantasy_currency_and_chests/gold_bars.png' },
      { id: 'tesouro:gold_coin', categoria: 'tesouro', nome: 'Moeda de ouro', arquivo: 'gold_coin.png', caminho: 'dark_fantasy_currency_and_chests/gold_coin.png' },
      { id: 'tesouro:gold_coins_stack', categoria: 'tesouro', nome: 'Pilha de moedas de ouro', arquivo: 'gold_coins_stack.png', caminho: 'dark_fantasy_currency_and_chests/gold_coins_stack.png' },
      { id: 'tesouro:golden_jewel_chest', categoria: 'tesouro', nome: 'Baú de joias douradas', arquivo: 'golden_jewel_chest.png', caminho: 'dark_fantasy_currency_and_chests/golden_jewel_chest.png' },
      { id: 'tesouro:golden_magic_key', categoria: 'tesouro', nome: 'Chave mágica dourada', arquivo: 'golden_magic_key.png', caminho: 'dark_fantasy_currency_and_chests/golden_magic_key.png' },
      { id: 'tesouro:iron_key', categoria: 'tesouro', nome: 'Chave de ferro', arquivo: 'iron_key.png', caminho: 'dark_fantasy_currency_and_chests/iron_key.png' },
      { id: 'tesouro:locked_iron_chest', categoria: 'tesouro', nome: 'Baú de ferro trancado', arquivo: 'locked_iron_chest.png', caminho: 'dark_fantasy_currency_and_chests/locked_iron_chest.png' },
      { id: 'tesouro:magic_orb', categoria: 'tesouro', nome: 'Orbe mágico', arquivo: 'magic_orb.png', caminho: 'dark_fantasy_currency_and_chests/magic_orb.png' },
      { id: 'tesouro:money_bag', categoria: 'tesouro', nome: 'Saco de dinheiro', arquivo: 'money_bag.png', caminho: 'dark_fantasy_currency_and_chests/money_bag.png' },
      { id: 'tesouro:purple_crystal', categoria: 'tesouro', nome: 'Cristal púrpura', arquivo: 'purple_crystal.png', caminho: 'dark_fantasy_currency_and_chests/purple_crystal.png' },
      { id: 'tesouro:royal_purple_chest', categoria: 'tesouro', nome: 'Baú real púrpura', arquivo: 'royal_purple_chest.png', caminho: 'dark_fantasy_currency_and_chests/royal_purple_chest.png' },
      { id: 'tesouro:ruby', categoria: 'tesouro', nome: 'Rubi', arquivo: 'ruby.png', caminho: 'dark_fantasy_currency_and_chests/ruby.png' },
      { id: 'tesouro:sapphire', categoria: 'tesouro', nome: 'Safira', arquivo: 'sapphire.png', caminho: 'dark_fantasy_currency_and_chests/sapphire.png' },
      { id: 'tesouro:silver_coins_stack', categoria: 'tesouro', nome: 'Pilha de moedas de prata', arquivo: 'silver_coins_stack.png', caminho: 'dark_fantasy_currency_and_chests/silver_coins_stack.png' },
      { id: 'tesouro:skeleton_key', categoria: 'tesouro', nome: 'Chave-mestra', arquivo: 'skeleton_key.png', caminho: 'dark_fantasy_currency_and_chests/skeleton_key.png' },
      { id: 'tesouro:wooden_chest', categoria: 'tesouro', nome: 'Baú de madeira', arquivo: 'wooden_chest.png', caminho: 'dark_fantasy_currency_and_chests/wooden_chest.png' },
    ],
  },
] as const

export const ITENS_ARTE: readonly ItemArte[] = PACOTES_ARTE.flatMap((pacote) => pacote.itens)

export function obterItemArte(id: string): ItemArte | undefined {
  return ITENS_ARTE.find((item) => item.id === id)
}

export function obterItemPorCaminho(caminho: string): ItemArte | undefined {
  return ITENS_ARTE.find((item) => item.caminho === caminho)
}

/** Ícones usados na HUD e na arena (prévia visual; motor ainda não consome). */
export const ARTE_HUD = {
  ouro: 'tesouro:gold_coin',
  pilhaOuro: 'tesouro:gold_coins_stack',
  saco: 'tesouro:money_bag',
  bau: 'tesouro:wooden_chest',
  bauMagico: 'tesouro:dark_magic_chest',
  chave: 'tesouro:iron_key',
  pocaoCura: 'pocoes:greater_healing',
  pocaoMana: 'pocoes:greater_mana',
} as const

export const HABILIDADES_PREVIEW: Record<string, readonly string[]> = {
  'vigia-da-cinza': ['berserker:01_furious_cleave', 'berserker:08_undying_rage_roar', 'berserker:14_berserk_regeneration'],
  'clerigo-das-brasas': ['sagrado:01_radiant_smite', 'sagrado:06_divine_bulwark', 'sagrado:19_hand_of_salvation'],
  'horror-rastejante': ['druida:03_strangling_vine_lash', 'druida:18_venomous_fang_spit'],
  'aparicao-da-laje': ['gelo:01_icicle_volley_rain', 'gelo:19_blizzard_whiteout_veil'],
}
