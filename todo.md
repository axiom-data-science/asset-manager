- Tell the type that schema should be gotten from somewhere else
- Tell type that records should be gotten from somewhere else



- Get schema from somewhere else
- Save data to somwhere else
- Get item from somewhere else when editing


- Tell parent type:
- Needs a child object of type that matches ...
- Add tab that let's user create the child object


- Move context back into tanstack. Attach it to all use.. hooks by default, and clear it as types/schemas/etc are updated


## Branding

- [x] Add a typed application-owned `AppVariantDefinition` and variant resolver tests.
- [ ] Resolve the active brand once through a provider instead of calling `getBrand()` at each override point.
- [x] Render registered component types through JSX; remove the core variant contract's dependency on MODL prop types.
- [x] Add explicit runtime variant configuration, with hostname and query selection retained as compatibility/development fallbacks.
- [ ] Support brand metadata, assets, theme tokens, navigation additions, and known-schema CSV view definitions through the typed boundary.
- [ ] Keep routing, authentication, authorization, API services, and core workflow behavior application-owned.
- [ ] Defer publishing the application as a dependency until a second independently maintained branded application proves the package boundary.
- See `src/app-variants/README.md` for the recommended architecture and migration sequence.