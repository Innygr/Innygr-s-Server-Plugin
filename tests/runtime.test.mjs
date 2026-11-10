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
  const world = {
    beforeEvents: {
      startup: { subscribe: (fn) => { callbacks.startup = fn; } },
      entityHurt: { subscribe: (fn) => { callbacks.voidbound = fn; } },
    },
    afterEvents: {
      playerBreakBlock: { subscribe: (fn) => { callbacks.blockBreak = fn; } },
    },
    getPlayers: () => [],
    getDefaultSpawnLocation: () => ({ x: 0, y: 64, z: 0 }),
    getDimension: (id) => ({ id }),
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
  return { callbacks, commands, enums, scheduled, EquipmentSlot, world };
}

function makeItem(typeId, lore = [], options = {}) {
  return {
    typeId,
    getLore: () => [...lore],
    setLore: (next) => { lore = [...next]; },
    getComponent: (id) => id === "minecraft:enchantable" && options.silkTouch
      ? { hasEnchantment: (name) => name === "silk_touch" }
      : null,
    lore: () => [...lore],
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
      setEquipment: (slot, item) => slots.set(slot, item),
    } : null,
    getEffect: (id) => effects.get(id),
    addEffect: (id, duration, options) => effects.set(id, {
      amplifier: options.amplifier, duration,
    }),
    isValid: () => true,
    teleport: (location, options) => { player.teleported = { location, options }; },
    sendMessage: (message) => { player.lastMessage = message; },
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

test("applies compatible enchantments and preserves other marker lines", () => {
  const h = createHarness();
  const chest = makeItem("minecraft:diamond_chestplate");
  const player = makePlayer({ Chest: chest });
  const command = h.commands.get("innygr:enchant").callback;
  assert.equal(command({ sourceEntity: player }, ["vitality", 2]).status, 0);
  assert.equal(command({ sourceEntity: player }, ["safeguard", 1]).status, 0);
  const lore = player.slots.get("Chest").lore();
  assert.ok(lore.includes("§0[IE:vitality:2]"));
  assert.ok(lore.includes("§0[IE:safeguard:1]"));
});

test("rejects invalid enchantment levels without modifying equipment", () => {
  const h = createHarness();
  const chest = makeItem("minecraft:diamond_chestplate");
  const player = makePlayer({ Chest: chest });
  const result = h.commands.get("innygr:enchant").callback(
    { sourceEntity: player }, ["vitality", 4]
  );
  assert.equal(result.status, 1);
  assert.deepEqual(chest.lore(), []);
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

test("Voidbound cancels void damage and schedules a return to the Overworld", () => {
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
  assert.equal(h.scheduled.length, 1);
  h.scheduled[0]();
  assert.equal(player.teleported.options.dimension.id, "overworld");
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

test("Prospector creates the configured bonus drop for a qualifying ore", () => {
  const h = createHarness(0);
  const tool = makeItem("minecraft:diamond_pickaxe", ["§0[IE:prospector:1]"]);
  const { event, drops } = makeBlockBreakEvent(tool);
  h.callbacks.blockBreak(event);
  assert.equal(drops.length, 1);
  assert.equal(drops[0].item.typeId, "minecraft:coal");
  assert.deepEqual(drops[0].location, { x: 4.5, y: 12.5, z: -2.5 });
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
