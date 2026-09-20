# Atomic Import Merge RPC

The import UI supports two merge execution strategies:

- `Client deep merge + PATCH` is the default and requires no database changes.
- `Atomic PostgREST RPC` is enabled when `VITE_IMPORT_MERGE_RPC` or `TWOWOLVES_IMPORT_MERGE_RPC` contains an RPC name or path.

The configured PostgreSQL function must be exposed by PostgREST and accept this JSON request:

```json
{
  "document_uuid": "existing-document-uuid",
  "incoming_document": {
    "object_type_uuid": "object-type-uuid",
    "label": "Incoming label",
    "description": "Incoming description",
    "slug": "incoming-slug",
    "data": {},
    "attrs": {}
  }
}
```

It must return the updated `document` row and perform the merge and update in one transaction. Its merge semantics must match `mergeIncomingNonEmpty`:

- Recursively merge JSON objects.
- Incoming non-empty scalar values win, including `0` and `false`.
- Incoming `null`, empty strings, empty arrays, and empty objects preserve existing values.
- Incoming non-empty arrays replace existing arrays.
- Preserve `attrs.import.source_id` and `attrs.import.external_id` from the incoming document.

Example configuration:

```text
VITE_IMPORT_MERGE_RPC=merge_import_document
TWOWOLVES_IMPORT_MERGE_RPC=merge_import_document
```

PostgREST***REMOVED***s `resolution=merge-duplicates` is not used for this mode because it replaces supplied JSONB columns rather than applying these recursive merge rules.
