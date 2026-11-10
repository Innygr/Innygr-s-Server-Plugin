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


test("reapplying one enchantment replaces only its own level marker and label", () => {
  const h = createHarness();
  const chest = makeItem("minecraft:diamond_chestplate", ["§7Unrelated note"]);
  const player = makePlayer({ Chest: chest });
  const command = h.commands.get("innygr:enchant").callback;

  assert.equal(command({ sourceEntity: player }, ["vitality", 1]).status, 0);
  assert.equal(command({ sourceEntity: player }, ["safeguard", 2]).status, 0);
  assert.equal(command({ sourceEntity: player }, ["vitality", 3]).status, 0);

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
      const wolf = {
        id: `wolf-${entities.length + 1}`,
        typeId,
        location,
        valid: true,
        nameTag: "",
        tameable: {
          tamedToPlayerId: undefined,
          tame: (owner) => {
            wolf.tameable.tamedToPlayerId = owner.id;
            return true;
          },
        },
        getComponent: (component) => component === "tameable" ? wolf.tameable : null,
        remove: () => { wolf.valid = false; },
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
  };
}

test("companion summon spawns and binds one guardian wolf to its owner", () => {
  const h = createHarness();
  const player = makeCompanionPlayer("owner-1", "Tester");
  const result = h.commands.get("innygr:companion").callback(
    { sourceEntity: player }, ["summon"]
  );
  const wolves = player.dimension.getEntities({ type: "minecraft:wolf" });
  assert.equal(result.status, 0);
  assert.equal(wolves.length, 1);
  assert.equal(wolves[0].tameable.tamedToPlayerId, player.id);
  assert.equal(wolves[0].nameTag, "Tester's Guardian");
});

test("companion summon prevents a second owned wolf in the same dimension", () => {
  const h = createHarness();
  const player = makeCompanionPlayer("owner-1", "Tester");
  const command = h.commands.get("innygr:companion").callback;
  assert.equal(command({ sourceEntity: player }, ["summon"]).status, 0);
  const second = command({ sourceEntity: player }, ["summon"]);
  assert.equal(second.status, 1);
  assert.equal(player.dimension.entities.length, 1);
});

test("companion dismissal removes only the requesting player's wolf in a shared dimension", () => {
  const h = createHarness();
  const player = makeCompanionPlayer("owner-1", "Tester");
  const command = h.commands.get("innygr:companion").callback;
  command({ sourceEntity: player }, ["summon"]);
  const ownWolf = player.dimension.entities[0];
  const otherWolf = {
    typeId: "minecraft:wolf",
    valid: true,
    getComponent: () => ({ tamedToPlayerId: "owner-2" }),
    remove: () => { otherWolf.valid = false; },
  };
  player.dimension.entities.push(otherWolf);

  const result = command({ sourceEntity: player }, ["dismiss"]);
  assert.equal(result.status, 0);
  assert.equal(ownWolf.valid, false);
  assert.equal(otherWolf.valid, true);
});

test("companion dismissal without an owned wolf is a safe no-op", () => {
  const h = createHarness();
  const player = makeCompanionPlayer("owner-1", "Tester");
  const result = h.commands.get("innygr:companion").callback(
    { sourceEntity: player }, ["dismiss"]
  );
  assert.equal(result.status, 0);
  assert.equal(player.dimension.entities.length, 0);
});

test("companion ownership is scoped to the player's current dimension", () => {
  const h = createHarness();
  const player = makeCompanionPlayer("owner-1", "Tester", "overworld");
  const netherPlayer = makeCompanionPlayer("owner-1", "Tester", "nether");
  const command = h.commands.get("innygr:companion").callback;

  assert.equal(command({ sourceEntity: player }, ["summon"]).status, 0);
  assert.equal(command({ sourceEntity: netherPlayer }, ["summon"]).status, 0);
  assert.equal(player.dimension.entities.length, 1);
  assert.equal(netherPlayer.dimension.entities.length, 1);

  command({ sourceEntity: player }, ["dismiss"]);
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

  const result = h.commands.get("innygr:companion").callback(
    { sourceEntity: player }, ["summon"]
  );
  assert.equal(result.status, 1);
  assert.equal(spawned.valid, false);
});


test("companion summon reports spawn failures without throwing", () => {
  const h = createHarness();
  const player = makeCompanionPlayer("owner-1", "Tester");
  player.dimension.spawnEntity = () => { throw new Error("spawn unavailable"); };
  const result = h.commands.get("innygr:companion").callback(
    { sourceEntity: player }, ["summon"]
  );
  assert.equal(result.status, 1);
});


test("Endersteel upgrades the matching worn diamond armor piece", () => {
  const h = createHarness();
  const helmet = makeItem("minecraft:diamond_helmet", ["Existing lore"]);
  const player = makePlayer({ Head: helmet });
  const result = h.commands.get("innygr:endersteel").callback(
    { sourceEntity: player }, ["head"]
  );
  assert.equal(result.status, 0);
  assert.ok(player.slots.get("Head").lore().includes("§7Endersteel"));
  assert.ok(player.slots.get("Head").lore().includes("§0[IE:endersteel]"));
  assert.ok(player.slots.get("Head").lore().includes("Existing lore"));
});

test("Endersteel rejects the wrong armor type without changing its lore", () => {
  const h = createHarness();
  const boots = makeItem("minecraft:iron_boots");
  const player = makePlayer({ Feet: boots });
  const result = h.commands.get("innygr:endersteel").callback(
    { sourceEntity: player }, ["feet"]
  );
  assert.equal(result.status, 1);
  assert.deepEqual(boots.lore(), []);
});

test("Endersteel cannot be applied twice to the same armor piece", () => {
  const h = createHarness();
  const helmet = makeItem("minecraft:diamond_helmet", ["§0[IE:endersteel]"]);
  const player = makePlayer({ Head: helmet });
  const result = h.commands.get("innygr:endersteel").callback(
    { sourceEntity: player }, ["head"]
  );
  assert.equal(result.status, 1);
  assert.deepEqual(helmet.lore(), ["§0[IE:endersteel]"]);
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
  player.isValid = () => false;
  h.scheduled[0]();
  assert.equal(player.teleported, undefined);
});
