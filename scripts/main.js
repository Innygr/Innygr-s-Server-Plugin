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
const ENDERSTEEL_PIECES = {
  head: {
    slot: EquipmentSlot.Head,
    typeId: "minecraft:diamond_helmet",
    name: "diamond helmet",
  },
  chest: {
    slot: EquipmentSlot.Chest,
    typeId: "minecraft:diamond_chestplate",
    name: "diamond chestplate",
  },
  legs: {
    slot: EquipmentSlot.Legs,
    typeId: "minecraft:diamond_leggings",
    name: "diamond leggings",
  },
  feet: {
    slot: EquipmentSlot.Feet,
    typeId: "minecraft:diamond_boots",
    name: "diamond boots",
  },
};
const ENDERSTEEL_MARKER = `${PACK_PREFIX}endersteel]`;

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

function hasEndersteel(item) {
  if (!item) return false;
  try {
    return item.getLore().includes(ENDERSTEEL_MARKER);
  } catch {
    return false;
  }
}

function applyEndersteel(player, pieceName) {
  const piece = ENDERSTEEL_PIECES[pieceName];
  if (!piece) {
    return commandResult(CustomCommandStatus.Failure, "Choose head, chest, legs, or feet.");
  }

  const equippable = getEquippable(player);
  if (!equippable) {
    return commandResult(CustomCommandStatus.Failure, "Equipment access is unavailable.");
  }

  const item = equippable.getEquipment(piece.slot);
  if (!item || item.typeId !== piece.typeId) {
    return commandResult(
      CustomCommandStatus.Failure,
      `Wear a ${piece.name} in the matching armor slot first.`
    );
  }

  if (hasEndersteel(item)) {
    return commandResult(CustomCommandStatus.Failure, "That armor piece is already Endersteel.");
  }

  const lore = item.getLore();
  lore.push("§7Endersteel");
  lore.push(ENDERSTEEL_MARKER);
  item.setLore(lore);
  equippable.setEquipment(piece.slot, item);

  return commandResult(
    CustomCommandStatus.Success,
    `Upgraded your diamond ${piece.name} to Endersteel.`
  );
}

function hasFullEndersteelSet(equippable) {
  return [
    EquipmentSlot.Head,
    EquipmentSlot.Chest,
    EquipmentSlot.Legs,
    EquipmentSlot.Feet,
  ].every((slot) => hasEndersteel(equippable.getEquipment(slot)));
}

function handleVoidbound(event) {
  try {
    const player = event.hurtEntity;
    if (!player || player.typeId !== "minecraft:player") return;
    if (event.damageSource?.cause !== "void") return;

    const equippable = getEquippable(player);
    if (!equippable || !hasFullEndersteelSet(equippable)) return;

    // Cancel the void hit first so lethal damage cannot win the race against
    // the cross-dimension teleport. The actual teleport runs next tick because
    // before-event callbacks must not directly modify world state.
    event.cancel = true;
    system.run(() => {
      try {
        if (!player.isValid()) return;
        const spawn = world.getDefaultSpawnLocation();
        const overworld = world.getDimension("overworld");
        player.teleport(
          { x: spawn.x, y: spawn.y + 1, z: spawn.z },
          { dimension: overworld, checkForBlocks: true }
        );
        player.sendMessage("§5[Endersteel] §rVoidbound returned you to the Overworld.");
      } catch {
        // A failed teleport must not interrupt the server tick.
      }
    });
  } catch {
    // Never interrupt normal damage handling if the event cannot be processed.
  }
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
      applyEffectIfNeeded(player, "conduit_power", aquaticLevel - 1);
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
      applyEffectIfNeeded(player, "conduit_power", waterAffinityLevel - 1);
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

  registry.registerEnum("innygr:companion_action", ["summon", "dismiss"]);

  registry.registerCommand(
    {
      name: "innygr:companion",
      description: "Summon or dismiss your personal guardian companion.",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
      mandatoryParameters: [
        {
          type: CustomCommandParamType.Enum,
          name: "innygr:companion_action",
        },
      ],
    },
    (origin, args) => {
      const player = origin.sourceEntity;
      if (!player || player.typeId !== "minecraft:player") {
        return commandResult(
          CustomCommandStatus.Failure,
          "Run this command in-game as a player."
        );
      }

      const ownedWolves = player.dimension
        .getEntities({ type: "minecraft:wolf" })
        .filter((entity) => {
          try {
            const tameable = entity.getComponent(EntityComponentTypes.Tameable);
            return tameable?.tamedToPlayerId === player.id;
          } catch {
            return false;
          }
        });

      if (args[0] === "dismiss") {
        for (const wolf of ownedWolves) {
          try {
            wolf.remove();
          } catch {
            // Continue dismissing any remaining owned companions.
          }
        }
        return commandResult(
          CustomCommandStatus.Success,
          ownedWolves.length
            ? "Your guardian companion has been dismissed."
            : "You do not have a guardian companion in this dimension."
        );
      }

      if (ownedWolves.length > 0) {
        return commandResult(
          CustomCommandStatus.Failure,
          "You already have a guardian companion in this dimension. Dismiss it first."
        );
      }

      try {
        const location = player.location;
        const wolf = player.dimension.spawnEntity("minecraft:wolf", {
          x: location.x + 1.5,
          y: location.y,
          z: location.z,
        });
        const tameable = wolf.getComponent(EntityComponentTypes.Tameable);
        if (!tameable?.tame(player)) {
          wolf.remove();
          return commandResult(
            CustomCommandStatus.Failure,
            "The guardian companion could not be bound to you."
          );
        }
        wolf.nameTag = `${player.name}'s Guardian`;
        return commandResult(
          CustomCommandStatus.Success,
          "Your guardian companion has been summoned. It recognizes you as its owner and can defend you when threatened."
        );
      } catch {
        return commandResult(
          CustomCommandStatus.Failure,
          "Could not summon a guardian companion here."
        );
      }
    }
  );

  registry.registerEnum("innygr:endersteel_piece", ["head", "chest", "legs", "feet"]);

  registry.registerCommand(
    {
      name: "innygr:endersteel",
      description: "Upgrade one equipped diamond armor piece to Endersteel.",
      permissionLevel: CommandPermissionLevel.Admin,
      cheatsRequired: false,
      mandatoryParameters: [
        {
          type: CustomCommandParamType.Enum,
          name: "innygr:endersteel_piece",
        },
      ],
    },
    (origin, args) => {
      const source = origin.sourceEntity;
      if (!source || source.typeId !== "minecraft:player") {
        return commandResult(
          CustomCommandStatus.Failure,
          "Run this command in-game as a player."
        );
      }
      return applyEndersteel(source, args[0]);
    }
  );

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
world.beforeEvents.entityHurt.subscribe(handleVoidbound);

// One check per second per online player. No client-side scripts or assets.
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    updatePlayerEnchantments(player);
  }
}, 20);
