import {
  CommandPermissionLevel,
  CustomCommandParamType,
  CustomCommandStatus,
  EntityComponentTypes,
  EquipmentSlot,
  Player,
  system,
  world,
} from "@minecraft/server";

const PACK_PREFIX = "§0[IE:";
const ENCHANTMENT_DEFINITIONS = {
  vitality: {
    displayName: "Vitality",
    slot: EquipmentSlot.Chest,
    accepts: (typeId) => typeId.endsWith("_chestplate"),
    maxLevel: 3,
  },
  aquatic: {
    displayName: "Aquatic",
    slot: EquipmentSlot.Head,
    accepts: (typeId) =>
      typeId.endsWith("_helmet") || typeId === "minecraft:turtle_helmet",
    maxLevel: 3,
  },
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
    const slotName = enchantment === "vitality" ? "a chestplate" : "a helmet";
    return commandResult(
      CustomCommandStatus.Failure,
      `Equip ${slotName} first, then run this command again.`
    );
  }

  const lore = item.getLore().filter(
    (line) => !line.startsWith(PACK_PREFIX)
  );
  lore.push(`§7${definition.displayName} ${["", "I", "II", "III"][level]}`);
  lore.push(getMarkerLine(enchantment, level));
  item.setLore(lore);
  equippable.setEquipment(definition.slot, item);

  return commandResult(
    CustomCommandStatus.Success,
    `Applied ${definition.displayName} ${["", "I", "II", "III"][level]}.`
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

    const vitalityLevel = readEnchantmentLevel(chest, "vitality");
    if (vitalityLevel > 0) {
      applyEffectIfNeeded(player, "regeneration", vitalityLevel - 1);
    }

    const aquaticLevel = readEnchantmentLevel(helmet, "aquatic");
    if (aquaticLevel > 0) {
      applyEffectIfNeeded(player, "water_breathing", 0);
      applyEffectIfNeeded(player, "dolphins_grace", aquaticLevel - 1);
    }
  } catch {
    // Players can change dimensions, disconnect, or have invalid entities
    // between scheduled ticks. The next interval safely tries again.
  }
}

system.beforeEvents.startup.subscribe((event) => {
  const registry = event.customCommandRegistry;

  registry.registerEnum("innygr:enchantment", ["vitality", "aquatic"]);

  registry.registerCommand(
    {
      name: "innygr:enchant",
      description: "Apply a prototype Innygr enchantment to equipped armor.",
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
          "Run this command as a player while wearing the target armor."
        );
      }

      const player = source;
      const enchantment = args[0];
      const level = args[1];

      return applyEnchantment(player, enchantment, level);
    }
  );
});

// One check per second per online player. No client-side scripts or assets.
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    updatePlayerEnchantments(player);
  }
}, 20);
