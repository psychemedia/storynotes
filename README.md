# storynotes
Tools to support the creation and searching of story related collections

View the online textbook here:  https://psychemedia.github.io/storynotes/


[Notes & Queries index database (datasette-lite)](https://lite.datasette.io/?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpsychemedia%2Fstorynotes%2Fmain%2Fnq_demo.db%3Fraw%3Dtrue#/nq_demo/index_entries?_search=fairy+&_filter_column=&_filter_op=exact&_filter_value=&_sort=rowid)

## Lang Fairy Tale DB Search (GitHub Pages)

A static browser-based full-text search UI for `lang_fairy_tale.db` is available at:

- `docs/lang-fairy-search.html`

This page uses the official SQLite WASM runtime (`@sqlite.org/sqlite-wasm`) in the browser and requires FTS5 support.

Once published via GitHub Pages for this repository, it should be available at:

- `https://psychemedia.github.io/storynotes/lang-fairy-search.html`

### Semantic Search Setup

The search page can run in two modes:

- `FTS`: SQLite full text search over `books_fts`
- `Semantic`: cosine similarity over precomputed embeddings stored in the DB

To generate embeddings (using the same MiniLM family model used by the browser query encoder):

```bash
python ia_utils/generate_books_embeddings.py --db lang_fairy_tale.db --model sentence-transformers/all-MiniLM-L6-v2
```

Then copy/update the published DB for GitHub Pages:

```bash
cp lang_fairy_tale.db docs/lang_fairy_tale.db
```

Notes:

- Semantic mode in `docs/lang-fairy-search.html` is enabled only when `books_embeddings` exists and contains rows.
- Query embedding in browser uses `Xenova/all-MiniLM-L6-v2`; corpus embeddings are generated in Python with `sentence-transformers/all-MiniLM-L6-v2`.
- The search page is configured to use local vendored assets for SQLite WASM/runtime and model files under `docs/vendor/` and `docs/models/` (self-contained deployment).

