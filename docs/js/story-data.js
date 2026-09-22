import sqlite3InitModule from "../vendor/sqlite-wasm/index.mjs";

export const EMBEDDING_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2";

export const SOURCES = [
  {
    key: "lang",
    label: "Lang Fairy Tale",
    dbUrl: "./lang_fairy_tale.db",
    tables: [
      {
        key: "books",
        label: "Stories",
        table: "books",
        ftsTable: "books_fts",
        titleCol: "title",
        textCol: "text",
        chapterCol: "chapter_order",
        collectionCol: "book",
        ftsTextColIndex: 1,
        defaultSelected: true,
        semanticEligible: true,
      },
    ],
  },
  {
    key: "world",
    label: "World of Tales",
    dbUrl: "./world_of_tales.db",
    tables: [
      {
        key: "tales",
        label: "Tales",
        table: "tales",
        ftsTable: "tales_fts",
        titleCol: "title",
        textCol: "text",
        chapterCol: null,
        collectionCol: null,
        ftsTextColIndex: 1,
        defaultSelected: true,
        semanticEligible: true,
      },
    ],
  },
  {
    key: "mtdf",
    label: "MTDF Demo",
    dbUrl: "./mtdf_demo.db",
    tables: [
      {
        key: "english_stories",
        label: "English Stories",
        table: "english_stories",
        ftsTable: "english_stories_fts",
        titleCol: "title",
        textCol: "text",
        chapterCol: null,
        collectionCol: null,
        ftsTextColIndex: 1,
        defaultSelected: true,
        semanticEligible: true,
      },
    ],
  },
  {
    key: "ashliman",
    label: "Ashliman Demo",
    dbUrl: "./ashliman_demo.db",
    tables: [
      {
        key: "ashliman_stories",
        label: "Ashliman Stories",
        table: "ashliman_stories",
        ftsTable: "ashliman_stories_fts",
        titleCol: "title",
        textCol: "text",
        chapterCol: null,
        collectionCol: null,
        ftsTextColIndex: 0,
        defaultSelected: true,
        semanticEligible: true,
      },
    ],
  },
];

let sqlite3 = null;
let sqliteReady = null;
const dbHandles = new Map();
const sourceState = new Map();
const semanticCorpusCache = new Map();

export function tableRef(sourceKey, tableKey) {
  return `${sourceKey}:${tableKey}`;
}

export function getSource(sourceKey) {
  return SOURCES.find((source) => source.key === sourceKey) || null;
}

export function getTable(sourceKey, tableKey) {
  const source = getSource(sourceKey);
  if (!source) return null;
  return source.tables.find((table) => table.key === tableKey) || null;
}

function readSingleValue(db, sql, bind) {
  return Number(db.selectValue(sql, bind) || 0);
}

function readRows(db, sql, bind) {
  const rows = [];
  db.exec({ sql, bind, rowMode: "object", resultRows: rows });
  return rows;
}

function blobToFloat32(blobValue) {
  if (blobValue instanceof Uint8Array) {
    const start = blobValue.byteOffset;
    const end = start + blobValue.byteLength;
    return new Float32Array(blobValue.buffer.slice(start, end));
  }
  if (blobValue instanceof ArrayBuffer) {
    return new Float32Array(blobValue);
  }
  return new Float32Array();
}

export async function initStoryData() {
  if (!sqliteReady) {
    sqliteReady = (async () => {
      sqlite3 = await sqlite3InitModule();
      return sqlite3;
    })();
  }
  return sqliteReady;
}

async function openSourceDb(source) {
  await initStoryData();
  if (dbHandles.has(source.key)) {
    return dbHandles.get(source.key);
  }

  const response = await fetch(source.dbUrl);
  if (!response.ok) {
    throw new Error(
      `Could not fetch ${source.dbUrl}: ${response.status} ${response.statusText}`,
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const ptr = sqlite3.wasm.allocFromTypedArray(bytes);
  const db = new sqlite3.oo1.DB();

  const rc = sqlite3.capi.sqlite3_deserialize(
    db.pointer,
    "main",
    ptr,
    bytes.byteLength,
    bytes.byteLength,
    sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE,
  );
  db.checkRc(rc);
  dbHandles.set(source.key, db);
  return db;
}

export async function checkFts5Enabled() {
  const source = SOURCES[0];
  const db = await openSourceDb(source);
  return (
    readSingleValue(
      db,
      "SELECT COUNT(*) FROM pragma_compile_options WHERE compile_options='ENABLE_FTS5';",
    ) > 0
  );
}

export async function ensureSourceLoaded(sourceKey) {
  const source = getSource(sourceKey);
  if (!source) {
    throw new Error(`Unknown source: ${sourceKey}`);
  }

  const db = await openSourceDb(source);
  if (sourceState.has(source.key)) {
    return { db, ...sourceState.get(source.key) };
  }

  const hasEmbeddingsTable =
    readSingleValue(
      db,
      "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='books_embeddings';",
    ) > 0;
  const hasEmbeddingsMeta =
    readSingleValue(
      db,
      "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='embeddings_metadata';",
    ) > 0;

  const tableSemantic = new Map();
  let semanticEnabled = false;

  for (const table of source.tables) {
    let tableSemanticEnabled = false;
    if (hasEmbeddingsTable && table.semanticEligible) {
      if (hasEmbeddingsMeta) {
        tableSemanticEnabled =
          readSingleValue(
            db,
            "SELECT COUNT(*) FROM embeddings_metadata WHERE model = $model AND source_table = $source_table;",
            { $model: EMBEDDING_MODEL_ID, $source_table: table.table },
          ) > 0;
      } else if (source.tables.length === 1) {
        tableSemanticEnabled =
          readSingleValue(
            db,
            "SELECT COUNT(*) FROM books_embeddings WHERE model_id = $model;",
            { $model: EMBEDDING_MODEL_ID },
          ) > 0;
      }
    }
    tableSemantic.set(table.key, tableSemanticEnabled);
    semanticEnabled = semanticEnabled || tableSemanticEnabled;
  }

  const state = {
    semanticEnabled,
    hasEmbeddingsTable,
    hasEmbeddingsMeta,
    tableSemantic,
  };
  sourceState.set(source.key, state);
  return { db, ...state };
}

export async function getSemanticEnabledTableRefs() {
  const refs = new Set();
  for (const source of SOURCES) {
    const state = await ensureSourceLoaded(source.key);
    for (const table of source.tables) {
      if (state.tableSemantic.get(table.key)) {
        refs.add(tableRef(source.key, table.key));
      }
    }
  }
  return refs;
}

export async function searchFtsRows(sourceKey, tableKey, query, limit) {
  const source = getSource(sourceKey);
  const table = getTable(sourceKey, tableKey);
  if (!source || !table) {
    throw new Error(`Unknown source/table: ${sourceKey}/${tableKey}`);
  }

  const { db } = await ensureSourceLoaded(sourceKey);
  const chapterExpr = table.chapterCol ? `b.${table.chapterCol}` : "NULL";
  const collectionExpr = table.collectionCol
    ? `b.${table.collectionCol}`
    : "NULL";

  return readRows(
    db,
    `SELECT b.rowid AS book_rowid,
                ${collectionExpr} AS book,
                b.${table.titleCol} AS title,
                ${chapterExpr} AS chapter_order,
                snippet(${table.ftsTable}, ${table.ftsTextColIndex}, '[[', ']]', ' ... ', 18) AS excerpt,
                -bm25(${table.ftsTable}) AS fts_score
         FROM ${table.ftsTable}
         JOIN ${table.table} b ON b.rowid = ${table.ftsTable}.rowid
         WHERE ${table.ftsTable} MATCH $q
         ORDER BY bm25(${table.ftsTable})
         LIMIT $limit;`,
    { $q: query, $limit: limit },
  );
}

export async function loadSemanticCorpusRows(sourceKey, tableKey) {
  const source = getSource(sourceKey);
  const table = getTable(sourceKey, tableKey);
  if (!source || !table) {
    throw new Error(`Unknown source/table: ${sourceKey}/${tableKey}`);
  }

  const ref = tableRef(sourceKey, tableKey);
  if (semanticCorpusCache.has(ref)) {
    return semanticCorpusCache.get(ref);
  }

  const { db, hasEmbeddingsMeta, tableSemantic } =
    await ensureSourceLoaded(sourceKey);
  if (!tableSemantic.get(tableKey)) {
    semanticCorpusCache.set(ref, []);
    return [];
  }

  const chapterExpr = table.chapterCol ? `b.${table.chapterCol}` : "NULL";
  const collectionExpr = table.collectionCol
    ? `b.${table.collectionCol}`
    : "NULL";

  const semanticSql = hasEmbeddingsMeta
    ? `SELECT e.book_rowid,
                e.embedding,
                ${collectionExpr} AS book,
                b.${table.titleCol} AS title,
                ${chapterExpr} AS chapter_order,
                substr(b.${table.textCol}, 1, 320) AS excerpt
           FROM books_embeddings e
           JOIN ${table.table} b ON b.rowid = e.book_rowid
          WHERE e.model_id = $model
            AND EXISTS (
                SELECT 1
                FROM embeddings_metadata m
                WHERE m.model = $model
                  AND m.source_table = $source_table
            )
          ORDER BY e.book_rowid;`
    : `SELECT e.book_rowid,
                e.embedding,
                ${collectionExpr} AS book,
                b.${table.titleCol} AS title,
                ${chapterExpr} AS chapter_order,
                substr(b.${table.textCol}, 1, 320) AS excerpt
           FROM books_embeddings e
           JOIN ${table.table} b ON b.rowid = e.book_rowid
          WHERE e.model_id = $model
          ORDER BY e.book_rowid;`;

  const rows = readRows(
    db,
    semanticSql,
    hasEmbeddingsMeta
      ? { $model: EMBEDDING_MODEL_ID, $source_table: table.table }
      : { $model: EMBEDDING_MODEL_ID },
  );

  const corpus = rows.map((row) => ({
    book_rowid: Number(row.book_rowid),
    book: row.book || source.label,
    title: row.title || "Untitled",
    chapter_order: row.chapter_order,
    excerpt: row.excerpt || "",
    embedding: blobToFloat32(row.embedding),
  }));

  semanticCorpusCache.set(ref, corpus);
  return corpus;
}

export async function fetchStoryById(sourceKey, tableKey, rowid) {
  const source = getSource(sourceKey);
  const table = getTable(sourceKey, tableKey);
  if (!source || !table) {
    throw new Error(`Unknown source/table: ${sourceKey}/${tableKey}`);
  }

  const { db } = await ensureSourceLoaded(sourceKey);
  const chapterExpr = table.chapterCol ? `b.${table.chapterCol}` : "NULL";
  const collectionExpr = table.collectionCol
    ? `b.${table.collectionCol}`
    : "NULL";

  const row = readRows(
    db,
    `SELECT b.rowid AS book_rowid,
                b.${table.titleCol} AS title,
                b.${table.textCol} AS text,
                ${chapterExpr} AS chapter_order,
                ${collectionExpr} AS book
         FROM ${table.table} b
         WHERE b.rowid = $id
         LIMIT 1;`,
    { $id: Number(rowid) },
  )[0];

  if (!row) {
    return null;
  }

  return {
    book_rowid: Number(row.book_rowid),
    title: row.title || "Untitled",
    text: row.text || "",
    chapter_order: row.chapter_order,
    book: row.book || source.label,
  };
}

function cosineSimilarity(v1, v2) {
  const len = Math.min(v1.length, v2.length);
  let dot = 0;
  let norm1 = 0;
  let norm2 = 0;
  for (let i = 0; i < len; i += 1) {
    dot += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }
  if (norm1 === 0 || norm2 === 0) return 0;
  return dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

async function fetchStoredEmbedding(sourceKey, tableKey, rowid) {
  const { db, tableSemantic } = await ensureSourceLoaded(sourceKey);
  if (!tableSemantic.get(tableKey)) {
    return null;
  }
  const row = readRows(
    db,
    `SELECT embedding
       FROM books_embeddings
      WHERE book_rowid = $id
        AND model_id = $model
      LIMIT 1;`,
    { $id: Number(rowid), $model: EMBEDDING_MODEL_ID },
  )[0];
  return row ? blobToFloat32(row.embedding) : null;
}

/**
 * Find stories whose precomputed embedding is closest to the embedding of
 * one given story (identified by sourceKey/tableKey/rowid). Uses whatever
 * embeddings are already stored in each table's `books_embeddings` table, so
 * no query text or embedding model is needed at call time.
 *
 * @param {string} sourceKey
 * @param {string} tableKey
 * @param {number} rowid
 * @param {Object} [options]
 * @param {{sourceKey: string, tableKey: string}[]} [options.candidateRefs]
 *   Tables to search for matches in. Defaults to every semantic-enabled
 *   table across all sources (i.e. matches can come from other collections
 *   too). Pass e.g. `[{ sourceKey, tableKey }]` to restrict to the same
 *   table as the source story.
 * @param {number} [options.limit=10] Max number of matches to return.
 * @returns {Promise<Array<{source_key, table_key, book_rowid, book, title,
 *   chapter_order, excerpt, similarity}>>} Sorted most-similar first.
 */
export async function findSimilarStories(sourceKey, tableKey, rowid, options = {}) {
  const { candidateRefs, limit = 10 } = options;

  const source = getSource(sourceKey);
  const table = getTable(sourceKey, tableKey);
  if (!source || !table) {
    throw new Error(`Unknown source/table: ${sourceKey}/${tableKey}`);
  }

  const targetVec = await fetchStoredEmbedding(sourceKey, tableKey, rowid);
  if (!targetVec || !targetVec.length) {
    throw new Error("No embedding is stored for this story, so similar stories can't be found.");
  }

  let refs = candidateRefs;
  if (!refs || !refs.length) {
    const enabledRefs = await getSemanticEnabledTableRefs();
    refs = Array.from(enabledRefs).map((ref) => {
      const [sk, tk] = ref.split(":");
      return { sourceKey: sk, tableKey: tk };
    });
  }

  const scored = [];
  for (const candidate of refs) {
    const candidateSource = getSource(candidate.sourceKey);
    const candidateTable = getTable(candidate.sourceKey, candidate.tableKey);
    if (!candidateSource || !candidateTable) continue;

    const corpus = await loadSemanticCorpusRows(candidate.sourceKey, candidate.tableKey);
    for (const entry of corpus) {
      const isSelf =
        candidate.sourceKey === sourceKey &&
        candidate.tableKey === tableKey &&
        entry.book_rowid === Number(rowid);
      if (isSelf) continue;

      scored.push({
        source_key: candidate.sourceKey,
        source_label: candidateSource.label,
        table_key: candidate.tableKey,
        table_label: candidateTable.label,
        book_rowid: entry.book_rowid,
        book: entry.book,
        title: entry.title,
        chapter_order: entry.chapter_order,
        excerpt: entry.excerpt,
        similarity: cosineSimilarity(targetVec, entry.embedding),
      });
    }
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit);
}
