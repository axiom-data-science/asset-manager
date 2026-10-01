# Custom Input Handoff

## Shared file upload migration

`src/manage/custom_inputs/file_upload.tsx` now wraps `Inputs.FileUploadInput` from `@axdspub/axiom-ui-forms` instead of maintaining a separate upload UI.

Current dependency: `@axdspub/axiom-ui-forms@^1.2.2-alpha.3`.

The shared component callback receives `{ fileName, fileData, parsedCsvData, file }` and may return a string. The asset-manager adapter:

- forwards `fileData`, parsed CSV data, and the filename through the existing `onFileUploaded` callback;
- uploads the original `File` through `uploadFileToPostgrest`;
- returns `${APPS_API_BASE_URL}/rpc/get_document_file?uuid=${fileUuid}` so the backend URL becomes the form value;
- supplies `getPreviewUrl={(fileRef) => fileRef}` for saved-file access;
- delegates selection, drag-and-drop, progress, errors, removal, CSV parsing, and immediate previews to the shared forms component.

The forms package retains its in-memory preview fallback when `onFileUpload` is not supplied. This asset-manager wrapper always supplies the backend callback.

## Validation

Automated validation completed on 2026-09-30:

```text
npm run build  # passed
```

Existing Quicktype browser-externalization and large-chunk warnings remain.

## Remaining browser checks

Use an authenticated create/edit form containing `custom:file_upload`:

1. Select or drop an image and confirm its immediate local preview.
2. Save the document and confirm the field stores a `get_document_file?uuid=...` URL, not the local filename.
3. Reload or edit the document and confirm the saved file can be opened through the backend URL.
4. Remove the file, save, and confirm the field is cleared.
5. Upload a CSV through a consumer that supplies `onFileUploaded` and confirm parsed CSV behavior is unchanged.

Because the backend URL does not include the original extension, restored files may use the shared component's generic link preview rather than an inline media preview. If restored inline previews are required, extend `getPreviewUrl` to return file metadata or add a backend metadata lookup without restoring the old upload UI.

## Follow-up

`src/manage/custom_inputs/csv_upload_for_sample_file.tsx` still has its own migration task. Reuse the forms package's CSV/file input behavior where possible and preserve its sample-file-specific mapping logic.