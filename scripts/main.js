import {
  CommandPermissionLevel,
  CustomCommandParamType,
  CustomCommandStatus,
  EntityComponentTypes,
  EquipmentSlot,
  ItemStack,
  system,
  world,
} from "@minecraft/server";

const PACK_PREFIX = "§0[IE:";
const ROMAN_LEVELS = ["", "I", "II", "III"];

const ENCHANTMENT_DEFINITIONS = {
  vitality: {
    displayName: "Vitality",
    slot: EquipmentSlot.Chest,
    accepts: (typeId) => typeId.endsWith("_chestplate"),
    slotName: "a chestplate",
    maxLevel: 3,
  },
  aquatic: {
    displayName: "Aquatic",
    slot: EquipmentSlot.Head,
    accepts: (typeId) =>
      typeId.endsWith("_helmet") || typeId === "minecraft:turtle_helmet",
    slotName: "a helmet",
    maxLevel: 3,
  },
  prospector: {
    displayName: "Prospector",
    slot: EquipmentSlot.Mainhand,
    accepts: (typeId) => typeId.endsWith("_pickaxe"),
    slotName: "a pickaxe in your main hand",
    maxLevel: 3,
  },
  safeguard: {
    displayName: "Safeguard",
    slot: EquipmentSlot.Chest,
    accepts: (typeId) => typeId.endsWith("_chestplate"),
    slotName: "a chestplate",
    maxLevel: 3,
  },
  springload: {
    displayName: "Springload",
    slot: EquipmentSlot.Feet,
    accepts: (typeId) => typeId.endsWith("_boots"),
    slotName: "boots",
    maxLevel: 3,
  },
  defender: {
    displayName: "Defender",
    slot: EquipmentSlot.Offhand,
    accepts: (typeId) => typeId === "minecraft:shield",
    slotName: "a shield in your off hand",
    maxLevel: 3,
  },
  water_affinity: {
    displayName: "Water Affinity",
    slot: EquipmentSlot.Offhand,
    accepts: (typeId) => typeId === "minecraft:nautilus_shell",
    slotName: "a nautilus shell in your off hand",
    maxLevel: 3,
  },
};

const PROSPECTOR_CHANCES = [0, 0.05, 0.10, 0.15];
const ORE_BONUS_DROPS = {
  "minecraft:coal_ore": "minecraft:coal",
  "minecraft:deepslate_coal_ore": "minecraft:coal",
  "minecraft:iron_ore": "minecraft:raw_iron",
  "minecraft:deepslate_iron_ore": "minecraft:raw_iron",
  "minecraft:copper_ore": "minecraft:raw_copper",
  "minecraft:deepslate_copper_ore": "minecraft:raw_copper",
  "minecraft:gold_ore": "minecraft:raw_gold",
  "minecraft:deepslate_gold_ore": "minecraft:raw_gold",
  "minecraft:redstone_ore": "minecraft:redstone",
  "minecraft:lit_redstone_ore": "minecraft:redstone",
  "minecraft:deepslate_redstone_ore": "minecraft:redstone",
  "minecraft:lit_deepslate_redstone_ore": "minecraft:redstone",
  "minecraft:lapis_ore": "minecraft:lapis_lazuli",
  "minecraft:deepslate_lapis_ore": "minecraft:lapis_lazuli",
  "minecraft:diamond_ore": "minecraft:diamond",
  "minecraft:deepslate_diamond_ore": "minecraft:diamond",
  "minecraft:emerald_ore": "minecraft:emerald",
  "minecraft:deepslate_emerald_ore": "minecraft:emerald",
  "minecraft:nether_quartz_ore": "minecraft:quartz",
  "minecraft:nether_gold_ore": "minecraft:gold_nugget",
};

function commandResult(status, message) {
  return { status, message };
}

function getEquippable(player) {
  return player.getComponent(EntityComponentTypes.Equippable);
}

function getMarkerLine(enchantment, level) {
  return `${PACK_PREFIX}${enchantment}:${level}]`;
}

function readEnchantmentLevel(item, enchantment) {
  if (!item) return 0;

  try {
    const marker = new RegExp(
      `^\\u00A70\\[IE:${enchantment}:([1-3])\\]$`
    );

    for (const line of item.getLore()) {
      const match = line.match(marker);
      if (match) return Number(match[1]);
    }
  } catch {
    // Invalid or unavailable item lore is treated as no custom enchantment.
  }

  return 0;
}

function applyEnchantment(player, enchantment, level) {
  const definition = ENCHANTMENT_DEFINITIONS[enchantment];
  if (!definition) {
    return commandResult(
      CustomCommandStatus.Failure,
      "Unknown prototype enchantment."
    );
  }

  if (!Number.isInteger(level) || level < 1 || level > definition.maxLevel) {
    return commandResult(
      CustomCommandStatus.Failure,
      `${definition.displayName} supports levels 1-${definition.maxLevel}.`
    );
  }

  const equippable = getEquippable(player);
  if (!equippable) {
    return commandResult(CustomCommandStatus.Failure, "Equipment access is unavailable.");
  }

  const item = equippable.getEquipment(definition.slot);
  if (!item || !definition.accepts(item.typeId)) {
    return commandResult(
      CustomCommandStatus.Failure,
      `Hold ${definition.slotName}, then run this command again.`
    );
  }

  // Replace only this enchantment's marker so compatible vanilla items can
  // carry multiple Innygr enchantments at once.
  const markerPrefix = `${PACK_PREFIX}${enchantment}:`;
  const lore = [];
  for (const line of item.getLore()) {
    if (line.startsWith(markerPrefix)) {
      if (lore.length && lore[lore.length - 1].startsWith(`§7${definition.displayName} `)) {
        lore.pop();
      }
      continue;
    }
    lore.push(line);
  }
  lore.push(`§7${definition.displayName} ${ROMAN_LEVELS[level]}`);
  lore.push(getMarkerLine(enchantment, level));
  item.setLore(lore);
  equippable.setEquipment(definition.slot, item);

  return commandResult(
    CustomCommandStatus.Success,
    `Applied ${definition.displayName} ${ROMAN_LEVELS[level]}.`
  );
}

function applyEffectIfNeeded(player, effectId, amplifier) {
  const existing = player.getEffect(effectId);

  // Do not overwrite a stronger effect supplied by another source.
  if (existing && existing.amplifier > amplifier) return;

  // Refresh only when the current effect is about to expire.
  if (
    existing &&
    existing.amplifier === amplifier &&
    existing.duration > 25
  ) {
    return;
  }

  player.addEffect(effectId, 40, {
    amplifier,
    showParticles: false,
  });
}

function updatePlayerEnchantments(player) {
  try {
    const equippable = getEquippable(player);
    if (!equippable) return;

    const chest = equippable.getEquipment(EquipmentSlot.Chest);
    const helmet = equippable.getEquipment(EquipmentSlot.Head);
    const boots = equippable.getEquipment(EquipmentSlot.Feet);
    const offhand = equippable.getEquipment(EquipmentSlot.Offhand);

    const vitalityLevel = readEnchantmentLevel(chest, "vitality");
    if (vitalityLevel > 0) {
      applyEffectIfNeeded(player, "regeneration", vitalityLevel - 1);
    }

    const aquaticLevel = readEnchantmentLevel(helmet, "aquatic");
    if (aquaticLevel > 0) {
      applyEffectIfNeeded(player, "water_breathing", 0);
      applyEffectIfNeeded(player, "dolphins_grace", aquaticLevel - 1);
    }

    const safeguardLevel = readEnchantmentLevel(chest, "safeguard");
    if (safeguardLevel > 0) {
      applyEffectIfNeeded(player, "resistance", safeguardLevel - 1);
    }

    const springloadLevel = readEnchantmentLevel(boots, "springload");
    if (springloadLevel > 0) {
      applyEffectIfNeeded(player, "jump_boost", springloadLevel - 1);
    }

    const defenderLevel = readEnchantmentLevel(offhand, "defender");
    if (defenderLevel > 0) {
      applyEffectIfNeeded(player, "resistance", defenderLevel - 1);
    }

    const waterAffinityLevel = readEnchantmentLevel(offhand, "water_affinity");
    if (waterAffinityLevel > 0) {
      applyEffectIfNeeded(player, "water_breathing", 0);
      applyEffectIfNeeded(player, "dolphins_grace", waterAffinityLevel - 1);
    }
  } catch {
    // Players can change dimensions, disconnect, or have invalid entities
    // between scheduled ticks. The next interval safely tries again.
  }
}

function handleProspectorBlockBreak(event) {
  try {
    const tool = event.itemStackBeforeBreak;
    if (!tool || !tool.typeId.endsWith("_pickaxe")) return;

    const level = readEnchantmentLevel(tool, "prospector");
    if (level < 1) return;

    const blockId = event.brokenBlockPermutation.type.id;
    const bonusDropId = ORE_BONUS_DROPS[blockId];
    if (!bonusDropId) return;

    // Silk Touch keeps its normal block drop and does not receive a bonus.
    const enchantable = tool.getComponent("minecraft:enchantable");
    if (enchantable?.hasEnchantment("silk_touch")) return;

    if (Math.random() >= PROSPECTOR_CHANCES[level]) return;

    const location = event.block.location;
    event.dimension.spawnItem(
      new ItemStack(bonusDropId, 1),
      {
        x: location.x + 0.5,
        y: location.y + 0.5,
        z: location.z + 0.5,
      }
    );
  } catch {
    // A failed bonus must never interrupt normal block breaking.
  }
}

system.beforeEvents.startup.subscribe((event) => {
  const registry = event.customCommandRegistry;

  registry.registerEnum("innygr:enchantment", [
    "vitality",
    "aquatic",
    "prospector",
    "safeguard",
    "springload",
    "defender",
    "water_affinity",
  ]);

  registry.registerCommand(
    {
      name: "innygr:enchant",
      description: "Apply a prototype Innygr enchantment to equipped gear.",
      permissionLevel: CommandPermissionLevel.Admin,
      cheatsRequired: false,
      mandatoryParameters: [
        {
          type: CustomCommandParamType.Enum,
          name: "innygr:enchantment",
        },
        {
          type: CustomCommandParamType.Integer,
          name: "level",
        },
      ],
    },
    (origin, args) => {
      const source = origin.sourceEntity;
      if (!source || source.typeId !== "minecraft:player") {
        return commandResult(
          CustomCommandStatus.Failure,
          "Run this command as a player while holding the target item."
        );
      }

      return applyEnchantment(source, args[0], args[1]);
    }
  );
});

world.afterEvents.playerBreakBlock.subscribe(handleProspectorBlockBreak);

// One check per second per online player. No client-side scripts or assets.
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    updatePlayerEnchantments(player);
  }
}, 20);
