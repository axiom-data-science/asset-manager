# Branding architecture

## Recommendation

Keep branded implementations in this application for now, but expose them through a typed `AppVariantDefinition`. Treat that definition as an extraction-ready boundary rather than publishing the full application as a dependency today.

Extract an application core package only when a second application variant has separate ownership or release needs. The current MODL implementation imports private application hooks, state, services, and UI components, and the project does not yet expose a stable library API.

## Ownership boundary

The application owns routing, authentication, authorization, API services, domain types, state/query providers, default layouts, accessibility behavior, and core workflow semantics.

A brand may supply:

- Site name, title, favicon, logos, and theme tokens.
- Login, home, document-entry, header, and document-success presentation.
- Known-schema CSV upload definitions and optional navigation entries.
- Domain-specific labels and filtering of choices exposed by the application.

A brand must not replace authorization checks, OIDC behavior, data-integrity rules, or core route contracts.

## Proposed boundary

```ts
export interface AppVariantDefinition {
  id: string
  branding: AppVariantBranding
  components?: Partial<AppVariantComponents>
  navigation?: readonly BrandNavigationItem[]
  workflows?: readonly WorkflowContribution[]
  csvImportViews?: readonly KnownCSVImportView[]
  features?: Readonly<Record<string, boolean>>
}
```

Resolve the active definition once in an `AppVariantProvider` and access it through `useAppVariant()`. Component overrides should be React component types rendered through JSX, not component functions invoked directly. Shared component props belong to the application variant API and must not import types from an individual variant.

Runtime configuration should select a bundled brand by explicit brand ID. Hostname and query-string detection may remain as development or compatibility fallbacks, but brand selection should not depend on a loose hostname substring match.

Known-schema CSV views should remain declarative configurations over the shared `CSVImportPage`. A brand may register those definitions, but must not copy import orchestration or persistence code.

## Migration sequence

1. Add tests for default, environment, hostname, and query-string variant resolution.
2. Move shared override props out of `app-variants/modl` and define a typed application-owned contract.
3. Return component types from the registry and render overrides through JSX.
4. Add `AppVariantProvider` and `useAppVariant()` so the variant is resolved once.
5. Add explicit runtime variant configuration and preserve selection through authentication redirects.
6. Apply title, favicon, asset paths, and CSS theme variables from the active definition.
7. Add declarative navigation and known-schema CSV view registration where product needs require them.
8. Introduce a narrow public brand API facade before moving any brand to a separate package.
9. Consider extracting the core application only after a second independently maintained branded shell proves the boundary.

Each migration step should pass tests and `npm run build`. Browser checks remain necessary for authentication redirects, header/layout behavior, assets, theme application, navigation, and branded workflows.