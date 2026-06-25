BEGIN;

-- Canonical source text for embedding generation.
CREATE TABLE IF NOT EXISTS books_embedding_source (
    book_rowid INTEGER PRIMARY KEY,
    semantic_text TEXT NOT NULL
);

INSERT OR REPLACE INTO books_embedding_source (book_rowid, semantic_text)
SELECT
    rowid,
    trim(coalesce(title, '') || '. ' || substr(coalesce(text, ''), 1, 1800))
FROM books;

CREATE TRIGGER IF NOT EXISTS books_embedding_source_ai
AFTER INSERT ON books
BEGIN
    INSERT OR REPLACE INTO books_embedding_source (book_rowid, semantic_text)
    VALUES (
        NEW.rowid,
        trim(coalesce(NEW.title, '') || '. ' || substr(coalesce(NEW.text, ''), 1, 1800))
    );
END;

CREATE TRIGGER IF NOT EXISTS books_embedding_source_au
AFTER UPDATE OF title, text ON books
BEGIN
    INSERT OR REPLACE INTO books_embedding_source (book_rowid, semantic_text)
    VALUES (
        NEW.rowid,
        trim(coalesce(NEW.title, '') || '. ' || substr(coalesce(NEW.text, ''), 1, 1800))
    );
END;

CREATE TRIGGER IF NOT EXISTS books_embedding_source_ad
AFTER DELETE ON books
BEGIN
    DELETE FROM books_embedding_source WHERE book_rowid = OLD.rowid;
END;

CREATE TABLE IF NOT EXISTS books_embeddings (
    book_rowid INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    dims INTEGER NOT NULL,
    embedding BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (book_rowid, model_id)
);

CREATE INDEX IF NOT EXISTS idx_books_embeddings_model_id
ON books_embeddings (model_id);

CREATE TABLE IF NOT EXISTS embeddings_metadata (
    model TEXT PRIMARY KEY,
    dims INTEGER NOT NULL,
    source_table TEXT NOT NULL,
    generated_at TEXT NOT NULL
);

CREATE VIEW IF NOT EXISTS books_client_search AS
SELECT
    rowid AS book_rowid,
    book,
    title,
    chapter_order,
    substr(text, 1, 320) AS excerpt
FROM books;

COMMIT;
