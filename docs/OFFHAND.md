# Off-hand Utility Plan

The goal is to make supported off-hand interactions more useful without replacing normal Minecraft behavior.

## Proposed directions

- **Visibility:** investigate whether a held light source can provide a reliable visibility benefit in Bedrock Dedicated Server.
- **Navigation:** investigate compass-related assistance while an item is held in the off-hand.
- **Defence:** preserve vanilla shield behavior and avoid interfering with normal defensive interactions.
- **Totems and maps:** preserve their expected vanilla behavior.

## Compatibility rule

Bedrock's off-hand support is more limited than Java Edition's. Every item and interaction must be checked against the target Bedrock version and Script API. We will not assume that arbitrary items can be equipped or that Java-style off-hand behavior exists.

## Testing checklist

- Confirm which items the target version permits in the off-hand.
- Confirm the Script API can read the relevant equipment slot.
- Check interactions in single-player and multiplayer.
- Check for conflicts with shields, totems, maps, and other packs.
- Measure performance before enabling features on the live server.
