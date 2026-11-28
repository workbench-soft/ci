# Play upload with What's New

## 2026-11-28 First version

The nightly bundles of the app repos go straight to the Play `production` track (workspace#338). On 2026-11-27 most of those releases had empty notes, since each repo called `r0adkll/upload-google-play` with no `whatsNewDirectory`.

- **Action** `actions/play-upload` writes a `whatsnew-<locale>` file per store language, then calls `r0adkll/upload-google-play` with `whatsNewDirectory`, `status: completed` and `changesNotSentForReview` false.
- **Languages** `en-US`, `en-AU`, `ru-RU`, `de-DE`, `fr-FR`, `es-ES`, `zh-CN`, `ja-JP`, `ko-KR` and `no-NO`, from `notes.json` keyed by language prefix. The text matches `scripts/store-notes.json` of `workspace`.
- **Missing listing language** a Play edit with notes for a language the listing lacks still passes validation (checked on 2026-11-27), so all 10 files go every time.
- **Own notes** a repo passes `notes_dir` to send its own `whatsnew-*` files in place of the shared text.
- **Extras** `mapping_file` sends the R8 mapping, and `changes_not_sent_for_review: true` keeps the fallback upload of a repo whose app Play won't send for review on its own.
- **Format** `notes.json` keeps one `"lang": "text"` line per language with no escaped quotes, since the step reads it with `sed` and needs no Node on the runner.
