#!/usr/bin/env python3
"""Generate semantic embeddings for books and store them in SQLite.

This script builds a `books_embeddings` table keyed by (book_rowid, model_id).
Embeddings are stored as float32 BLOB values so the browser can load and
score them efficiently.
"""

from __future__ import annotations

import argparse
import datetime as dt
import sqlite3
from typing import Iterable

import numpy as np
from sentence_transformers import SentenceTransformer

DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def batched(items: list[tuple], size: int) -> Iterable[list[tuple]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def prepare_text(title: str | None, text: str | None, max_chars: int) -> str:
    title = (title or "").strip()
    body = (text or "").strip().replace("\n", " ")
    body = " ".join(body.split())
    if len(body) > max_chars:
        body = body[:max_chars]
    if title and body:
        return f"{title}. {body}"
    return title or body


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS books_embeddings (
            book_rowid INTEGER NOT NULL,
            model_id TEXT NOT NULL,
            dims INTEGER NOT NULL,
            embedding BLOB NOT NULL,
            PRIMARY KEY (book_rowid, model_id)
        );
        """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS embeddings_metadata (
            model TEXT PRIMARY KEY,
            dims INTEGER NOT NULL,
            source_table TEXT NOT NULL,
            generated_at TEXT NOT NULL
        );
        """)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate table embeddings into SQLite"
    )
    parser.add_argument("--db", default="lang_fairy_tale.db", help="Path to SQLite DB")
    parser.add_argument(
        "--model", default=DEFAULT_MODEL, help="SentenceTransformer model"
    )
    parser.add_argument("--source-table", default="books", help="Source table name")
    parser.add_argument("--id-col", default="rowid", help="ID column or rowid alias")
    parser.add_argument("--title-col", default="title", help="Title column name")
    parser.add_argument("--text-col", default="text", help="Text column name")
    parser.add_argument(
        "--source-table-sql",
        default="",
        help="Optional full SQL query yielding columns rowid, semantic_text",
    )
    parser.add_argument(
        "--batch-size", type=int, default=32, help="Encoding batch size"
    )
    parser.add_argument(
        "--max-chars",
        type=int,
        default=1500,
        help="Max characters from each text column used for embedding",
    )
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row

    ensure_schema(conn)

    has_books_source = (
        conn.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='books_embedding_source'"
        ).fetchone()[0]
        > 0
    )

    if args.source_table_sql:
        rows = conn.execute(args.source_table_sql).fetchall()
        payload: list[tuple[int, str]] = [
            (int(row["rowid"]), str(row["semantic_text"] or "").strip()) for row in rows
        ]
    elif args.source_table == "books" and has_books_source:
        rows = conn.execute(
            "SELECT book_rowid AS rowid, semantic_text FROM books_embedding_source ORDER BY book_rowid"
        ).fetchall()
        payload = [
            (int(row["rowid"]), str(row["semantic_text"] or "").strip()) for row in rows
        ]
    else:
        sql = (
            f"SELECT {args.id_col} AS rowid, {args.title_col} AS title, {args.text_col} AS text "
            f"FROM {args.source_table} ORDER BY rowid"
        )
        rows = conn.execute(sql).fetchall()
        payload = [
            (int(row["rowid"]), prepare_text(row["title"], row["text"], args.max_chars))
            for row in rows
        ]

    if not payload:
        raise SystemExit("No rows found for embedding generation.")

    model = SentenceTransformer(args.model)

    dim = model.get_sentence_embedding_dimension()

    with conn:
        conn.execute("DELETE FROM books_embeddings WHERE model_id = ?", (args.model,))

        for chunk in batched(payload, args.batch_size):
            ids = [r[0] for r in chunk]
            texts = [r[1] for r in chunk]
            vectors = model.encode(
                texts,
                normalize_embeddings=True,
                batch_size=args.batch_size,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
            vectors = vectors.astype(np.float32)

            conn.executemany(
                """
                INSERT INTO books_embeddings (book_rowid, model_id, dims, embedding)
                VALUES (?, ?, ?, ?)
                """,
                [
                    (rowid, args.model, int(dim), sqlite3.Binary(v.tobytes()))
                    for rowid, v in zip(ids, vectors)
                ],
            )

        conn.execute(
            """
            INSERT INTO embeddings_metadata (model, dims, source_table, generated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(model) DO UPDATE SET
                dims=excluded.dims,
                source_table=excluded.source_table,
                generated_at=excluded.generated_at
            """,
            (
                args.model,
                int(dim),
                args.source_table,
                dt.datetime.utcnow().isoformat(timespec="seconds") + "Z",
            ),
        )

    count = conn.execute(
        "SELECT COUNT(*) FROM books_embeddings WHERE model_id = ?", (args.model,)
    ).fetchone()[0]
    print(f"Stored embeddings: {count} rows, model={args.model}, dims={dim}")


if __name__ == "__main__":
    main()
