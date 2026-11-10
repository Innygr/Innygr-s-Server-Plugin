let restrictedExecution = false;

function assertWorldWritable(operation) {
  if (restrictedExecution) {
    throw new Error(`${operation} is not allowed in restricted command execution.`);
  }
}

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "scripts", "main.js");
const source = fs.readFileSync(sourcePath, "utf8").replace(
  /^import\s*\{[\s\S]*?\}\s*from\s*["']@minecraft\/server["'];\s*/m,
  ""
);

function createHarness(randomValue = 0) {
  restrictedExecution = false;
  const callbacks = { startup: null, voidbound: null, blockBreak: null, interval: null };
  const commands = new Map();
  const enums = new Map();
  const scheduled = [];
  const math = Object.create(Math);
  math.random = () => randomValue;
  const EquipmentSlot = {
    Head: "Head", Chest: "Chest", Legs: "Legs", Feet: "Feet",
    Mainhand: "Mainhand", Offhand: "Offhand",
  };
  let defaultSpawn = { x: 0, y: 64, z: 0 };
  const overworld = {
    id: "overworld",
    topmostBlock: { y: 63, isLiquid: false },
    getTopmostBlock: () => overworld.topmostBlock,
    getBlock: () => ({ isAir: true }),
  };
  const world = {
    beforeEvents: {
      startup: { subscribe: (fn) => { callbacks.startup = fn; } },
      entityHurt: { subscribe: (fn) => { callbacks.voidbound = fn; } },
    },
    afterEvents: {
      playerBreakBlock: { subscribe: (fn) => { callbacks.blockBreak = fn; } },
    },
    getPlayers: () => [],
    getDefaultSpawnLocation: () => defaultSpawn,
    setDefaultSpawnLocation: (location) => { defaultSpawn = location; },
    overworld,
    getDimension: (id) => id === "overworld" ? overworld : { id },
  };
  const system = {
    beforeEvents: { startup: { subscribe: (fn) => { callbacks.startup = fn; } } },
    run: (fn) => scheduled.push(fn),
    runInterval: (fn) => { callbacks.interval = fn; },
  };
  class ItemStack {
    constructor(typeId, amount = 1) {
      this.typeId = typeId;
      this.amount = amount;
    }
  }
  const context = {
    CommandPermissionLevel: { Any: 0, Admin: 1 },
    CustomCommandParamType: { Enum: "Enum", Integer: "Integer" },
    CustomCommandStatus: { Success: 0, Failure: 1 },
    EntityComponentTypes: { Equippable: "equippable", Tameable: "tameable" },
    EquipmentSlot,
    ItemStack,
    system,
    world,
    Math: math,
  };
  vm.runInNewContext(source, context, { filename: sourcePath });
  callbacks.startup({
    customCommandRegistry: {
      registerEnum: (name, values) => enums.set(name, values),
      registerCommand: (definition, callback) => commands.set(definition.name, { definition, callback }),
    },
  });
  return {
    callbacks,
    commands,
    enums,
    scheduled,
    EquipmentSlot,
    world,
    invokeCommand: (name, player, args) => {
      restrictedExecution = true;
      try {
        return commands.get(name).callback({ sourceEntity: player }, args);
      } finally {
        restrictedExecution = false;
      }
    },
    flushScheduled: () => {
      assert.equal(restrictedExecution, false, "scheduled callbacks must run outside restricted execution");
      while (scheduled.length) scheduled.shift()();
    },
  };
}


function runCommand(h, name, player, args) {
  const result = h.invokeCommand(name, player, args);
  h.flushScheduled();
  return result;
}

function makeItem(typeId, lore = [], options = {}) {
  return {
    typeId,
    getLore: () => [...lore].map((entry) => {
      if (typeof entry === "string") return entry;
      return entry && typeof entry.text === "string" ? entry.text : "";
    }),
    getRawLore: () => [...lore].map((entry) => {
      if (typeof entry === "string") return { text: entry };
      return entry;
    }),
    setLore: (next) => { assertWorldWritable('ItemStack.setLore'); lore = [...next]; },
    getComponent: (id) => id === "minecraft:enchantable" && options.silkTouch
      ? { hasEnchantment: (name) => name === "silk_touch" }
      : null,
    // Test-only convenience view matching ItemStack.getLore() strings;
    // structured RawMessage entries remain objects for preservation checks.
    lore: () => [...lore].map((entry) => (
      entry && typeof entry.text === "string" ? entry.text : entry
    )),
  };
}

function makePlayer(equipment = {}) {
  const effects = new Map();
  const slots = new Map(Object.entries(equipment));
  const player = {
    id: "player-1",
    name: "Tester",
    typeId: "minecraft:player",
    location: { x: 10, y: 70, z: 10 },
    dimension: {
      getEntities: () => [],
      spawnEntity: () => { throw new Error("not used in this test"); },
    },
    getComponent: (component) => component === "equippable" ? {
      getEquipment: (slot) => slots.get(slot),
      setEquipment: (slot, item) => { assertWorldWritable('Equippable.setEquipment'); slots.set(slot, item); },
    } : null,
    getEffect: (id) => effects.get(id),
    addEffect: (id, duration, options) => effects.set(id, {
      amplifier: options.amplifier, duration,
    }),
    isValid: true,
    teleport: (location, options) => { assertWorldWritable('Entity.teleport'); player.teleported = { location, options }; },
    sendMessage: (message) => { assertWorldWritable('Player.sendMessage'); player.lastMessage = message; },
    effects,
    slots,
  };
  return player;
}

test("registers player companion command and admin utility commands", () => {
  const h = createHarness();
  assert.equal(h.commands.get("innygr:companion").definition.permissionLevel, 0);
  assert.equal(h.commands.get("innygr:enchant").definition.permissionLevel, 1);
  assert.equal(h.commands.get("innygr:endersteel").definition.permissionLevel, 1);
  assert.deepEqual(Array.from(h.enums.get("innygr:companion_action")), ["summon", "dismiss"]);
});


test("reapplying one enchantment replaces only its own level marker and label", () => {
  const h = createHarness();
  const chest = makeItem("minecraft:diamond_chestplate", ["§7Unrelated note"]);
  const player = makePlayer({ Chest: chest });
  runCommand(h, "innygr:enchant", player, ["vitality", 1]);
  runCommand(h, "innygr:enchant", player, ["safeguard", 2]);
  runCommand(h, "innygr:enchant", player, ["vitality", 3]);

  const lore = player.slots.get("Chest").lore();
  assert.ok(lore.includes("§7Unrelated note"));
  assert.ok(lore.includes("§7Vitality III"));
  assert.ok(lore.includes("§0[IE:vitality:3]"));
  assert.ok(lore.includes("§7Safeguard II"));
  assert.ok(lore.includes("§0[IE:safeguard:2]"));
  assert.equal(lore.some((line) => line === "§0[IE:vitality:1]"), false);
  assert.equal(lore.filter((line) => line.startsWith("§7Vitality ")).length, 1);
});

test("applies compatible enchantments and preserves other marker lines", () => {
  const h = createHarness();
  const chest = makeItem("minecraft:diamond_chestplate");
  const player = makePlayer({ Chest: chest });
  const queued = h.invokeCommand("innygr:enchant", player, ["vitality", 2]);
  assert.equal(queued.status, 0);
  assert.deepEqual(chest.lore(), []);
  assert.equal(h.scheduled.length, 1);
  h.flushScheduled();
  assert.equal(h.invokeCommand("innygr:enchant", player, ["safeguard", 1]).status, 0);
  h.flushScheduled();
  const lore = player.slots.get("Chest").lore();
  assert.ok(lore.includes("§0[IE:vitality:2]"));
  assert.ok(lore.includes("§0[IE:safeguard:1]"));
});

test("all enchantments accept levels I-III only in their intended equipment slot", () => {
  const labels = {
    vitality: "Vitality",
    aquatic: "Aquatic",
    prospector: "Prospector",
    safeguard: "Safeguard",
    springload: "Springload",
    defender: "Defender",
    water_affinity: "Water Affinity",
  };
  const cases = [
    ["vitality", "Chest", "minecraft:diamond_chestplate"],
    ["aquatic", "Head", "minecraft:diamond_helmet"],
    ["aquatic", "Head", "minecraft:turtle_helmet"],
    ["prospector", "Mainhand", "minecraft:diamond_pickaxe"],
    ["safeguard", "Chest", "minecraft:diamond_chestplate"],
    ["springload", "Feet", "minecraft:diamond_boots"],
    ["defender", "Offhand", "minecraft:shield"],
    ["water_affinity", "Offhand", "minecraft:nautilus_shell"],
  ];

  for (const [enchantment, slot, typeId] of cases) {
    for (const level of [1, 2, 3]) {
      const h = createHarness();
      const item = makeItem(typeId);
      const player = makePlayer({ [slot]: item });
      runCommand(h, "innygr:enchant", player, [enchantment, level]);

      const lore = player.slots.get(slot).lore();
      assert.ok(lore.includes(`§0[IE:${enchantment}:${level}]`), `${typeId} ${enchantment} ${level}`);
      assert.ok(lore.includes(`§7${labels[enchantment]} ${["", "I", "II", "III"][level]}`));
      assert.ok(lore.every((line) => typeof line !== "string" || line.length <= 50));
    }
  }
});

test("rejects invalid enchantment levels without modifying equipment", () => {
  const h = createHarness();
  const chest = makeItem("minecraft:diamond_chestplate");
  const player = makePlayer({ Chest: chest });
  const result = runCommand(h, "innygr:enchant", player, ["vitality", 4]);
  assert.equal(result.status, 0);
  assert.match(player.lastMessage, /supports levels 1-3/);
  assert.deepEqual(chest.lore(), []);
});

test("queued commands skip players who disconnect before execution", () => {
  const h = createHarness();
  const chest = makeItem("minecraft:diamond_chestplate");
  const player = makePlayer({ Chest: chest });

  const queued = h.invokeCommand("innygr:enchant", player, ["vitality", 1]);
  assert.equal(queued.status, 0);
  assert.deepEqual(chest.lore(), []);
  player.isValid = false;
  h.flushScheduled();

  assert.deepEqual(chest.lore(), []);
  assert.equal(player.lastMessage, undefined);
});

test("deferred enchantment validates the currently equipped item at execution time", () => {
  const h = createHarness();
  const firstChest = makeItem("minecraft:diamond_chestplate");
  const player = makePlayer({ Chest: firstChest });
  const queued = h.invokeCommand("innygr:enchant", player, ["vitality", 1]);
  assert.equal(queued.status, 0);
  player.slots.set("Chest", makeItem("minecraft:iron_helmet"));

  h.flushScheduled();
  assert.match(player.lastMessage, /Hold a chestplate/);
  assert.deepEqual(firstChest.lore(), []);
});

test("preserves structured RawMessage lore while reapplying an enchantment", () => {
  const h = createHarness();
  const structuredLine = { rawtext: [{ text: "An existing structured lore line" }] };
  const chest = makeItem("minecraft:diamond_chestplate", [
    structuredLine,
    "§7Vitality I",
    "§0[IE:vitality:1]",
  ]);
  const player = makePlayer({ Chest: chest });

  runCommand(h, "innygr:enchant", player, ["vitality", 2]);
  const rawLore = player.slots.get("Chest").lore();
  assert.equal(rawLore[0], structuredLine);
  assert.ok(rawLore.includes("§0[IE:vitality:2]"));
  assert.ok(rawLore.includes("§7Vitality II"));
  assert.equal(rawLore.filter((line) => typeof line === "string" && line.startsWith("§7Vitality ")).length, 1);
  assert.equal(rawLore.includes("§0[IE:vitality:1]"), false);
});

test("reads enchantment markers from the RawMessage text property", () => {
  const h = createHarness();
  const chest = makeItem("minecraft:diamond_chestplate", [
    { text: "§7Vitality II" },
    { text: "§0[IE:vitality:2]" },
  ]);
  const player = makePlayer({ Chest: chest });
  h.world.getPlayers = () => [player];

  h.callbacks.interval();
  assert.equal(player.effects.get("regeneration").amplifier, 1);
});

test("recognizes Endersteel markers returned as RawMessage text", () => {
  const h = createHarness();
  const marked = (id) => makeItem(id, [{ text: "§0[IE:endersteel]" }]);
  const player = makePlayer({
    Head: marked("minecraft:diamond_helmet"),
    Chest: marked("minecraft:diamond_chestplate"),
    Legs: marked("minecraft:diamond_leggings"),
    Feet: marked("minecraft:diamond_boots"),
  });
  const event = {
    hurtEntity: player,
    damageSource: { cause: "void" },
    cancel: false,
  };

  h.callbacks.voidbound(event);
  assert.equal(event.cancel, true);
  assert.equal(h.scheduled.length, 1);
});

test("enchantment application refuses to exceed the 20-line lore limit", () => {
  const h = createHarness();
  const initialLore = Array.from({ length: 19 }, (_, index) => `Lore line ${index + 1}`);
  const chest = makeItem("minecraft:diamond_chestplate", initialLore);
  const player = makePlayer({ Chest: chest });

  runCommand(h, "innygr:enchant", player, ["vitality", 1]);
  assert.match(player.lastMessage, /lore is full/i);
  assert.deepEqual(chest.lore(), initialLore);
});

test("Endersteel refuses to exceed the 20-line lore limit", () => {
  const h = createHarness();
  const initialLore = Array.from({ length: 19 }, (_, index) => `Lore line ${index + 1}`);
  const helmet = makeItem("minecraft:diamond_helmet", initialLore);
  const player = makePlayer({ Head: helmet });

  runCommand(h, "innygr:endersteel", player, ["head"]);
  assert.match(player.lastMessage, /lore is full/i);
  assert.deepEqual(helmet.lore(), initialLore);
});


test("Aquatic, Springload, and Water Affinity apply their configured effects", () => {
  const h = createHarness();
  const player = makePlayer({
    Head: makeItem("minecraft:diamond_helmet", ["§0[IE:aquatic:3]"]),
    Feet: makeItem("minecraft:diamond_boots", ["§0[IE:springload:2]"]),
    Offhand: makeItem("minecraft:nautilus_shell", ["§0[IE:water_affinity:1]"]),
  });
  h.world.getPlayers = () => [player];

  h.callbacks.interval();
  assert.equal(player.effects.get("water_breathing").amplifier, 0);
  assert.equal(player.effects.get("conduit_power").amplifier, 2);
  assert.equal(player.effects.get("jump_boost").amplifier, 1);
});

test("effect refresh adds missing effects but preserves stronger existing effects", () => {
  const h = createHarness();
  const chest = makeItem("minecraft:diamond_chestplate", ["§0[IE:vitality:2]"]);
  const player = makePlayer({ Chest: chest });
  player.effects.set("regeneration", { amplifier: 3, duration: 100 });
  h.world.getPlayers = () => [player];
  h.callbacks.interval();
  assert.equal(player.effects.get("regeneration").amplifier, 3);
  player.effects.delete("regeneration");
  h.callbacks.interval();
  assert.equal(player.effects.get("regeneration").amplifier, 1);
});


test("effect refresh waits until the matching effect is nearly expired", () => {
  const h = createHarness();
  const chest = makeItem("minecraft:diamond_chestplate", ["§0[IE:vitality:2]"]);
  const player = makePlayer({ Chest: chest });
  player.effects.set("regeneration", { amplifier: 1, duration: 100 });
  h.world.getPlayers = () => [player];

  h.callbacks.interval();
  assert.deepEqual(
    { ...player.effects.get("regeneration") },
    { amplifier: 1, duration: 100 }
  );

  player.effects.set("regeneration", { amplifier: 1, duration: 25 });
  h.callbacks.interval();
  assert.deepEqual(
    { ...player.effects.get("regeneration") },
    { amplifier: 1, duration: 40 }
  );
});

test("removing an enchanted item stops refreshing its remaining effect", () => {
  const h = createHarness();
  const chest = makeItem("minecraft:diamond_chestplate", ["§0[IE:vitality:1]"]);
  const player = makePlayer({ Chest: chest });
  h.world.getPlayers = () => [player];

  h.callbacks.interval();
  assert.equal(player.effects.get("regeneration").duration, 40);

  player.slots.delete("Chest");
  player.effects.set("regeneration", { amplifier: 0, duration: 12 });
  h.callbacks.interval();
  assert.equal(player.effects.get("regeneration").duration, 12);
});

test("shared effect types keep the strongest equipped enchantment level", () => {
  const h = createHarness();
  const player = makePlayer({
    Chest: makeItem("minecraft:diamond_chestplate", ["§0[IE:safeguard:2]"]),
    Offhand: makeItem("minecraft:shield", ["§0[IE:defender:3]"]),
    Head: makeItem("minecraft:diamond_helmet", ["§0[IE:aquatic:1]"]),
  });
  h.world.getPlayers = () => [player];

  h.callbacks.interval();
  assert.equal(player.effects.get("resistance").amplifier, 2);
  assert.equal(player.effects.get("conduit_power").amplifier, 0);

  player.slots.set("Chest", makeItem(
    "minecraft:diamond_chestplate",
    ["§0[IE:safeguard:3]"]
  ));
  player.slots.set("Offhand", makeItem("minecraft:shield", ["§0[IE:defender:1]"]));
  player.effects.delete("resistance");
  h.callbacks.interval();
  assert.equal(player.effects.get("resistance").amplifier, 2);
});

test("Voidbound resolves the automatic spawn height before cancelling void damage", () => {
  const h = createHarness();
  h.world.setDefaultSpawnLocation({ x: 12, y: 32767, z: -8 });
  h.world.overworld.topmostBlock = { y: 71, isLiquid: false };
  const marked = (id) => makeItem(id, ["§0[IE:endersteel]"]);
  const player = makePlayer({
    Head: marked("minecraft:diamond_helmet"),
    Chest: marked("minecraft:diamond_chestplate"),
    Legs: marked("minecraft:diamond_leggings"),
    Feet: marked("minecraft:diamond_boots"),
  });
  const event = {
    hurtEntity: player,
    damageSource: { cause: "void" },
    cancel: false,
  };
  h.callbacks.voidbound(event);
  assert.equal(event.cancel, true);
  assert.equal(h.scheduled.length, 1);
  h.flushScheduled();
  assert.equal(player.teleported.options.dimension.id, "overworld");
  assert.equal(player.teleported.options.forceProvidedPositionOnDimensionChange, true);
  assert.deepEqual(
    { ...player.teleported.location },
    { x: 12, y: 72, z: -8 }
  );
});

test("Voidbound does not cancel void damage when the automatic spawn surface is unavailable", () => {
  const h = createHarness();
  h.world.setDefaultSpawnLocation({ x: 0, y: 32767, z: 0 });
  h.world.overworld.topmostBlock = undefined;
  const marked = (id) => makeItem(id, ["§0[IE:endersteel]"]);
  const player = makePlayer({
    Head: marked("minecraft:diamond_helmet"),
    Chest: marked("minecraft:diamond_chestplate"),
    Legs: marked("minecraft:diamond_leggings"),
    Feet: marked("minecraft:diamond_boots"),
  });
  const event = {
    hurtEntity: player,
    damageSource: { cause: "void" },
    cancel: false,
  };
  h.callbacks.voidbound(event);
  assert.equal(event.cancel, false);
  assert.equal(h.scheduled.length, 0);
});

test("Voidbound does not cancel void damage when the automatic spawn surface is liquid", () => {
  const h = createHarness();
  h.world.setDefaultSpawnLocation({ x: 0, y: 32767, z: 0 });
  h.world.overworld.topmostBlock = { y: 63, isLiquid: true };
  const marked = (id) => makeItem(id, ["§0[IE:endersteel]"]);
  const player = makePlayer({
    Head: marked("minecraft:diamond_helmet"),
    Chest: marked("minecraft:diamond_chestplate"),
    Legs: marked("minecraft:diamond_leggings"),
    Feet: marked("minecraft:diamond_boots"),
  });
  const event = {
    hurtEntity: player,
    damageSource: { cause: "void" },
    cancel: false,
  };
  h.callbacks.voidbound(event);
  assert.equal(event.cancel, false);
  assert.equal(h.scheduled.length, 0);
});

test("Voidbound leaves non-void damage uncancelled", () => {
  const h = createHarness();
  const event = {
    hurtEntity: makePlayer(),
    damageSource: { cause: "fall" },
    cancel: false,
  };
  h.callbacks.voidbound(event);
  assert.equal(event.cancel, false);
  assert.equal(h.scheduled.length, 0);
});


function makeBlockBreakEvent(tool, blockId = "minecraft:coal_ore") {
  const drops = [];
  const event = {
    itemStackBeforeBreak: tool,
    brokenBlockPermutation: { type: { id: blockId } },
    block: { location: { x: 4, y: 12, z: -3 } },
    dimension: {
      spawnItem: (item, location) => drops.push({ item, location }),
    },
  };
  return { event, drops };
}


test("Prospector applies the configured threshold for all three levels", () => {
  for (const [level, chance] of [[1, 0.05], [2, 0.10], [3, 0.15]]) {
    const successfulHarness = createHarness(chance - 0.001);
    const tool = makeItem(
      "minecraft:diamond_pickaxe",
      [`§0[IE:prospector:${level}]`]
    );
    const success = makeBlockBreakEvent(tool);
    successfulHarness.callbacks.blockBreak(success.event);
    assert.equal(success.drops.length, 1, `level ${level} should pass below its threshold`);

    const boundaryHarness = createHarness(chance);
    const boundary = makeBlockBreakEvent(tool);
    boundaryHarness.callbacks.blockBreak(boundary.event);
    assert.equal(boundary.drops.length, 0, `level ${level} should fail at its threshold`);
  }
});

test("Prospector supports deepslate and Nether ore drop mappings", () => {
  const cases = [
    ["minecraft:deepslate_iron_ore", "minecraft:raw_iron"],
    ["minecraft:lit_deepslate_redstone_ore", "minecraft:redstone"],
    ["minecraft:nether_gold_ore", "minecraft:gold_nugget"],
    ["minecraft:nether_quartz_ore", "minecraft:quartz"],
  ];

  for (const [blockId, expectedDrop] of cases) {
    const h = createHarness(0);
    const tool = makeItem("minecraft:netherite_pickaxe", ["§0[IE:prospector:3]"]);
    const { event, drops } = makeBlockBreakEvent(tool, blockId);
    h.callbacks.blockBreak(event);
    assert.equal(drops.length, 1, blockId);
    assert.equal(drops[0].item.typeId, expectedDrop, blockId);
  }
});

test("Prospector ignores marked non-pickaxes", () => {
  const h = createHarness(0);
  const tool = makeItem("minecraft:diamond_axe", ["§0[IE:prospector:3]"]);
  const { event, drops } = makeBlockBreakEvent(tool);
  h.callbacks.blockBreak(event);
  assert.equal(drops.length, 0);
});

test("Prospector creates the configured bonus drop for a qualifying ore", () => {
  const h = createHarness(0);
  const tool = makeItem("minecraft:diamond_pickaxe", ["§0[IE:prospector:1]"]);
  const { event, drops } = makeBlockBreakEvent(tool);
  h.callbacks.blockBreak(event);
  assert.equal(drops.length, 1);
  assert.equal(drops[0].item.typeId, "minecraft:coal");
  assert.equal(drops[0].location.x, 4.5);
  assert.equal(drops[0].location.y, 12.5);
  assert.equal(drops[0].location.z, -2.5);
});

test("Prospector does not add a bonus drop when the pickaxe has Silk Touch", () => {
  const h = createHarness(0);
  const tool = makeItem(
    "minecraft:diamond_pickaxe",
    ["§0[IE:prospector:3]"],
    { silkTouch: true }
  );
  const { event, drops } = makeBlockBreakEvent(tool, "minecraft:diamond_ore");
  h.callbacks.blockBreak(event);
  assert.equal(drops.length, 0);
});

test("Prospector ignores blocks without a configured ore drop", () => {
  const h = createHarness(0);
  const tool = makeItem("minecraft:diamond_pickaxe", ["§0[IE:prospector:3]"]);
  const { event, drops } = makeBlockBreakEvent(tool, "minecraft:stone");
  h.callbacks.blockBreak(event);
  assert.equal(drops.length, 0);
});

test("Prospector respects its configured random bonus chance", () => {
  const succeeds = createHarness(0.049);
  const levelOneTool = makeItem("minecraft:iron_pickaxe", ["§0[IE:prospector:1]"]);
  const success = makeBlockBreakEvent(levelOneTool);
  succeeds.callbacks.blockBreak(success.event);
  assert.equal(success.drops.length, 1);

  const boundary = createHarness(0.05);
  const atBoundary = makeBlockBreakEvent(levelOneTool);
  boundary.callbacks.blockBreak(atBoundary.event);
  assert.equal(atBoundary.drops.length, 0);
});

test("Prospector ignores unmarked tools", () => {
  const h = createHarness(0);
  const tool = makeItem("minecraft:diamond_pickaxe");
  const { event, drops } = makeBlockBreakEvent(tool);
  h.callbacks.blockBreak(event);
  assert.equal(drops.length, 0);
});


function makeCompanionPlayer(id, name, dimensionId = "overworld") {
  const entities = [];
  const dimension = {
    id: dimensionId,
    getEntities: ({ type }) => entities.filter((entity) => entity.typeId === type && entity.valid),
    spawnEntity: (typeId, location) => {
      assertWorldWritable('Dimension.spawnEntity');
      const wolf = {
        id: `wolf-${entities.length + 1}`,
        typeId,
        location,
        valid: true,
        _nameTag: "",
        get nameTag() { return wolf._nameTag; },
        set nameTag(value) { assertWorldWritable('Entity.nameTag'); wolf._nameTag = value; },
        tameable: {
          tamedToPlayerId: undefined,
          tame: (owner) => {
            assertWorldWritable('Tameable.tame');
            wolf.tameable.tamedToPlayerId = owner.id;
            return true;
          },
        },
        getComponent: (component) => component === "tameable" ? wolf.tameable : null,
        remove: () => { assertWorldWritable('Entity.remove'); wolf.valid = false; },
      };
      entities.push(wolf);
      return wolf;
    },
    entities,
  };
  return {
    id,
    name,
    typeId: "minecraft:player",
    location: { x: 10, y: 70, z: 10 },
    dimension,
    isValid: true,
    sendMessage(message) { this.lastMessage = message; },
  };
}

test("companion summon spawns and binds one guardian wolf to its owner", () => {
  const h = createHarness();
  const player = makeCompanionPlayer("owner-1", "Tester");
  const result = runCommand(h, "innygr:companion", player, ["summon"]);
  const wolves = player.dimension.getEntities({ type: "minecraft:wolf" });
  assert.equal(result.status, 0);
  assert.equal(wolves.length, 1);
  assert.equal(wolves[0].tameable.tamedToPlayerId, player.id);
  assert.equal(wolves[0].nameTag, "Tester's Guardian");
});

test("two queued companion summons cannot create duplicates", () => {
  const h = createHarness();
  const player = makeCompanionPlayer("owner-1", "Tester");

  const first = h.invokeCommand("innygr:companion", player, ["summon"]);
  const second = h.invokeCommand("innygr:companion", player, ["summon"]);
  assert.equal(first.status, 0);
  assert.equal(second.status, 0);
  assert.equal(player.dimension.entities.length, 0);

  h.flushScheduled();
  assert.equal(player.dimension.getEntities({ type: "minecraft:wolf" }).length, 1);
  assert.match(player.lastMessage, /already have a guardian companion/);
});

test("companion summon prevents a second owned wolf in the same dimension", () => {
  const h = createHarness();
  const player = makeCompanionPlayer("owner-1", "Tester");
  runCommand(h, "innygr:companion", player, ["summon"]);
  const second = runCommand(h, "innygr:companion", player, ["summon"]);
  assert.equal(second.status, 0);
  assert.match(player.lastMessage, /already have a guardian companion/);
  assert.equal(player.dimension.entities.length, 1);
});

test("companion dismissal removes only the requesting player's wolf in a shared dimension", () => {
  const h = createHarness();
  const player = makeCompanionPlayer("owner-1", "Tester");
  runCommand(h, "innygr:companion", player, ["summon"]);
  const ownWolf = player.dimension.entities[0];
  const otherWolf = {
    typeId: "minecraft:wolf",
    valid: true,
    getComponent: () => ({ tamedToPlayerId: "owner-2" }),
    remove: () => { assertWorldWritable('Entity.remove'); otherWolf.valid = false; },
  };
  player.dimension.entities.push(otherWolf);

  const result = runCommand(h, "innygr:companion", player, ["dismiss"]);
  assert.equal(result.status, 0);
  assert.equal(ownWolf.valid, false);
  assert.equal(otherWolf.valid, true);
});

test("companion dismissal without an owned wolf is a safe no-op", () => {
  const h = createHarness();
  const player = makeCompanionPlayer("owner-1", "Tester");
  const result = runCommand(h, "innygr:companion", player, ["dismiss"]);
  assert.equal(result.status, 0);
  assert.equal(player.dimension.entities.length, 0);
});

test("companion ownership is scoped to the player's current dimension", () => {
  const h = createHarness();
  const player = makeCompanionPlayer("owner-1", "Tester", "overworld");
  const netherPlayer = makeCompanionPlayer("owner-1", "Tester", "nether");
  runCommand(h, "innygr:companion", player, ["summon"]);
  runCommand(h, "innygr:companion", netherPlayer, ["summon"]);
  assert.equal(player.dimension.entities.length, 1);
  assert.equal(netherPlayer.dimension.entities.length, 1);

  runCommand(h, "innygr:companion", player, ["dismiss"]);
  assert.equal(player.dimension.entities[0].valid, false);
  assert.equal(netherPlayer.dimension.entities[0].valid, true);
});


test("companion summon cleans up the spawned entity if ownership binding fails", () => {
  const h = createHarness();
  const player = makeCompanionPlayer("owner-1", "Tester");
  const spawned = {
    valid: true,
    getComponent: () => ({ tame: () => false }),
    remove: () => { spawned.valid = false; },
  };
  player.dimension.spawnEntity = () => {
    player.dimension.entities.push(spawned);
    return spawned;
  };

  const result = runCommand(h, "innygr:companion", player, ["summon"]);
  assert.equal(result.status, 0);
  assert.match(player.lastMessage, /could not be bound/);
  assert.equal(spawned.valid, false);
});


test("companion summon removes the spawned wolf if initialization throws", () => {
  const cases = [
    {
      name: "tameable component lookup",
      configure(wolf) {
        wolf.getComponent = () => { throw new Error("component unavailable"); };
      },
    },
    {
      name: "taming",
      configure(wolf) {
        wolf.getComponent = () => ({ tame: () => { throw new Error("tame failed"); } });
      },
    },
    {
      name: "name assignment",
      configure(wolf) {
        Object.defineProperty(wolf, "nameTag", {
          set() { throw new Error("name tag rejected"); },
        });
        wolf.getComponent = () => ({ tame: () => true });
      },
    },
  ];

  for (const scenario of cases) {
    const h = createHarness();
    const player = makeCompanionPlayer("owner-1", "Tester");
    let removed = false;
    const wolf = {
      typeId: "minecraft:wolf",
      getComponent: () => ({ tame: () => true }),
      remove: () => { removed = true; },
    };
    scenario.configure(wolf);
    player.dimension.spawnEntity = () => wolf;

    const result = runCommand(h, "innygr:companion", player, ["summon"]);
    assert.equal(result.status, 0, scenario.name);
    assert.match(player.lastMessage, /Could not summon/, scenario.name);
    assert.equal(removed, true, scenario.name);
  }
});

test("companion summon reports spawn failures without throwing", () => {
  const h = createHarness();
  const player = makeCompanionPlayer("owner-1", "Tester");
  player.dimension.spawnEntity = () => { throw new Error("spawn unavailable"); };
  const result = runCommand(h, "innygr:companion", player, ["summon"]);
  assert.equal(result.status, 0);
  assert.match(player.lastMessage, /Could not summon/);
});


test("Endersteel upgrades the matching worn diamond armor piece", () => {
  const h = createHarness();
  const helmet = makeItem("minecraft:diamond_helmet", ["Existing lore"]);
  const player = makePlayer({ Head: helmet });
  const result = runCommand(h, "innygr:endersteel", player, ["head"]);
  assert.equal(result.status, 0);
  assert.ok(player.slots.get("Head").lore().includes("§7Endersteel"));
  assert.ok(player.slots.get("Head").lore().includes("§0[IE:endersteel]"));
  assert.ok(player.slots.get("Head").lore().includes("Existing lore"));
});

test("Endersteel rejects the wrong armor type without changing its lore", () => {
  const h = createHarness();
  const boots = makeItem("minecraft:iron_boots");
  const player = makePlayer({ Feet: boots });
  const result = runCommand(h, "innygr:endersteel", player, ["feet"]);
  assert.equal(result.status, 0);
  assert.match(player.lastMessage, /Wear a diamond boots/);
  assert.deepEqual(boots.lore(), []);
});

test("Endersteel cannot be applied twice to the same armor piece", () => {
  const h = createHarness();
  const helmet = makeItem("minecraft:diamond_helmet", ["§0[IE:endersteel]"]);
  const player = makePlayer({ Head: helmet });
  const result = runCommand(h, "innygr:endersteel", player, ["head"]);
  assert.equal(result.status, 0);
  assert.match(player.lastMessage, /already Endersteel/);
  assert.deepEqual(helmet.lore(), ["§0[IE:endersteel]"]);
});

test("Voidbound rejects a marked non-diamond armor piece", () => {
  const h = createHarness();
  const marked = (id) => makeItem(id, ["§0[IE:endersteel]"]);
  const player = makePlayer({
    Head: marked("minecraft:netherite_helmet"),
    Chest: marked("minecraft:diamond_chestplate"),
    Legs: marked("minecraft:diamond_leggings"),
    Feet: marked("minecraft:diamond_boots"),
  });
  const event = {
    hurtEntity: player,
    damageSource: { cause: "void" },
    cancel: false,
  };

  h.callbacks.voidbound(event);
  assert.equal(event.cancel, false);
  assert.equal(h.scheduled.length, 0);
});

test("Voidbound requires all four Endersteel armor pieces", () => {
  const h = createHarness();
  const marked = (id) => makeItem(id, ["§0[IE:endersteel]"]);
  const player = makePlayer({
    Head: marked("minecraft:diamond_helmet"),
    Chest: marked("minecraft:diamond_chestplate"),
    Legs: marked("minecraft:diamond_leggings"),
    Feet: makeItem("minecraft:diamond_boots"),
  });
  const event = {
    hurtEntity: player,
    damageSource: { cause: "void" },
    cancel: false,
  };
  h.callbacks.voidbound(event);
  assert.equal(event.cancel, false);
  assert.equal(h.scheduled.length, 0);
});

test("Voidbound skips teleport if the player becomes invalid before the scheduled task", () => {
  const h = createHarness();
  const marked = (id) => makeItem(id, ["§0[IE:endersteel]"]);
  const player = makePlayer({
    Head: marked("minecraft:diamond_helmet"),
    Chest: marked("minecraft:diamond_chestplate"),
    Legs: marked("minecraft:diamond_leggings"),
    Feet: marked("minecraft:diamond_boots"),
  });
  const event = {
    hurtEntity: player,
    damageSource: { cause: "void" },
    cancel: false,
  };
  h.callbacks.voidbound(event);
  assert.equal(event.cancel, true);
  player.isValid = false;
  h.scheduled[0]();
  assert.equal(player.teleported, undefined);
});
