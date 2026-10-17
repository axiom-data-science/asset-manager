# MODL app variant handoff

## Current behavior

- The MODL entry page offers creation of a new MODL record and lists records available to the signed-in user.
- Each listed MODL record is a collapsed-by-default, light-gray group. Expanding a group displays existing related metadata and the applicable create actions.
- Asset collector metadata records are listed before compact create buttons for the configured collector types.
- Existing variable metadata records are linked for editing. When no variable metadata record exists, the configured create action is shown instead.
- The create-document-success page presents the created/updated record, expected-child creation actions, and the MODL records list.

Child object types and predicates are hydrated from the MODL object type's `expected_child_types` configuration. Child records are identified through relationships to their parent using the configured `to_parent_predicate`. The MODL UI recognizes collector/collection object types by their slug and variable metadata by the `variable_metadata` slug.

## Configuration and follow-up

Confirm the live backend configuration provides the expected child types, valid `to_parent_predicate` values, and the expected collector and variable-metadata object-type slugs. This cannot be verified from the repository alone.

## Validation

Targeted ESLint and `npm run build` passed during implementation. The production build continues to report existing Vite dependency externalization and large-chunk warnings.
