# Off-hand Utility Plan

The off-hand work uses vanilla items that Bedrock players can actually equip. It does not add custom items, weapons, armor, textures, or a Resource Pack.

## Implemented prototypes

- **Defender I–III:** apply Resistance while a vanilla shield carrying the Defender marker is held in the off-hand. Normal shield blocking remains vanilla.
- **Water Affinity I–III:** a nautilus shell carrying the Water Affinity marker grants Conduit Power for underwater breathing, visibility, and mining utility while held in the off-hand.

The server reads the player's off-hand equipment through the Script API's `EquipmentSlot.Offhand`. Effects stop refreshing after the item is removed.

## Compatibility rules

- Do not replace or rewrite the shield's normal blocking behavior.
- Preserve vanilla totem and map behavior.
- Only use off-hand items supported by Bedrock's normal inventory rules.
- Do not assume arbitrary items can be placed in the off-hand.
- Keep all effects server-side and avoid client assets.

## Testing checklist

- Verify a shield and nautilus shell can be equipped normally in the off-hand on Bedrock 1.26.63.1.
- Apply each enchantment and verify the hidden marker persists after relogging.
- Confirm Defender does not interfere with shield blocking.
- Confirm Water Affinity effects stop refreshing after removing the shell.
- Check both features in multiplayer and on a disposable world.
