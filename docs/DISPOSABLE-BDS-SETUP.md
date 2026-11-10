# Disposable Bedrock Dedicated Server setup

This recipe installs **v0.1.5.3** into a separate test world on a separate Bedrock Dedicated Server instance. It intentionally does not use the live Cat Server world or its pack folders.

Microsoft's BDS documentation distinguishes per-world pack folders from the shared top-level `behavior_packs` folder. This pack must be installed per-world for testing. See [Getting Started with Bedrock Dedicated Server](https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockserver/getting-started?view=minecraft-bedrock-stable).

## 1. Isolate the server instance

Use a separate BDS install or container with its own server files and world storage. Do not reuse or bind-mount the live server's world volume.

Before the first startup, edit the **test instance's** `server.properties` and set a distinct `level-name`, such as `Innygr-Plugin-Test`. Set `gamemode=creative`, `force-gamemode=true`, `allow-cheats=true`, and `content-log-file-enabled=true` for this disposable test instance.

For a second BDS instance on the same host, choose unused UDP ports (for example, `server-port=19134` and `server-portv6=19135`). These avoid the common live-server defaults of `19132` and `19133` and set `enable-lan-visibility=false` to avoid the default LAN-discovery port bindings. If using Docker, the test container must have its own persistent data volume and publish the chosen UDP ports; do not mount the live server's data directory.

These settings are for the isolated test instance only. Microsoft's [BDS server properties reference](https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockserver/server-properties?view=minecraft-bedrock-stable) documents the gamemode, cheat, content-log, and port options.

Start this disposable server once so it creates the `worlds/Innygr-Plugin-Test/` folder, then stop only this disposable instance before copying the pack.

## 2. Copy the candidate into the test world

From the root of the disposable BDS directory, the layout should be:

```text
worlds/
└── Innygr-Plugin-Test/
    ├── behavior_packs/
    │   └── InnygrEnchantments/
    │       ├── manifest.json
    │       └── scripts/
    │           └── main.js
    └── world_behavior_packs.json
```

Extract the downloaded package into that per-world folder (adjust the source path if your download is elsewhere):

```bash
mkdir -p "worlds/Innygr-Plugin-Test/behavior_packs/InnygrEnchantments"
unzip -o "InnygrEnchantments-v0.1.5.3.mcpack" \
  -d "worlds/Innygr-Plugin-Test/behavior_packs/InnygrEnchantments"
```

Do not put this test pack in the BDS top-level shared `behavior_packs/` directory. A world-scoped install reduces the chance of enabling it in the wrong world.

## 3. Enable it only for this world

Create or edit `worlds/Innygr-Plugin-Test/world_behavior_packs.json` with:

```json
[
  {
    "pack_id": "263b6506-b1c7-4d59-a227-45d7088ba84c",
    "version": [0, 1, 5]
  }
]
```

The pack identifier and version must match `manifest.json`. The project version is `v0.1.5.3`; Bedrock's manifest and activation-list version is the first three components, `[0, 1, 5]`.

If the file already contains other packs, preserve those entries and add this object as another array item; do not replace unrelated pack entries.

## 4. Verify the instance points at the test world

In the disposable instance's `server.properties`, confirm these values:

```ini
level-name=Innygr-Plugin-Test
gamemode=creative
force-gamemode=true
allow-cheats=true
content-log-file-enabled=true
server-port=19134
server-portv6=19135
enable-lan-visibility=false
```

The `level-name` must match the folder name created on the first startup and used in the paths above. The port values above are examples; verify they are unused on your host and publish both UDP ports if using containers. Keep this test instance's own data folder separate from every live server volume. Start the test instance, join it using its test address and port, and check its console/content log for script startup, dependency, and command registration errors.

The script API dependency is `@minecraft/server` `2.10.0`; the manifest minimum engine version is `1.26.50`. Record the actual BDS build in the test report. The planned target is `1.26.63.1`.

## 5. First smoke test

As an operator, run:

```text
/innygr:companion summon
/innygr:companion dismiss
```

The command should immediately tell you the request was queued, then send a second chat message with the actual result. This is intentional: the script defers world changes until the next normal tick.

Then test one enchantment on disposable gear:

```text
/give @s diamond_chestplate
/innygr:enchant vitality 1
```

Equip the chestplate and confirm the lore marker remains after moving it between inventory and armor slot. Continue with the full [testing matrix](TESTING.md).

## 6. Disable or remove the test pack

Stop only the disposable test instance. Remove the activation entry from `world_behavior_packs.json` (or restore the backup of that file), then remove the test pack folder if no longer needed. Keep the report and exact package checksum so results stay tied to the candidate that was tested.

**Live-server rule:** no part of this recipe authorizes installation into, configuration changes to, or restart of The Cat Server. Keep this test instance and its data separate.
