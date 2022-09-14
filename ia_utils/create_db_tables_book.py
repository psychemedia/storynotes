def create_db_tables_book(db, drop=True):
    """Create a database table and an associated full-text search table."""
    # If required, drop any previously defined tables of the same name
    table_name = "stories"
    if drop:
        db[table_name].drop(ignore=True)
        db[f"{table_name}_fts"].drop(ignore=True)
    elif db[table_name].exists():
        print(f"Table {table_name} exists...")
        return

    # This schema has been evolved iteratively as I have identified structure
    # that can be usefully mined...

    db[table_name].create({
        "book_id": str,
        "book_title": str,
        "story_id": str,
        "story_title": str,
        "story_text": str,
        "last_para": str, # sometimes contains provenance
        "first_line": str, # maybe we want to review the openings, or create an index...
        "provenance": str, # attempt at provenance
        "chapter_order": int, # Sort order of stories in book
    }, pk=("story_id"))

    # Enable full text search
    # This creates an extra virtual table (issues_fts) to support the full text search
    # A stemmer is applied to support the efficacy of the full-text searching
    db[table_name].enable_fts(["story_title", "story_text"], create_triggers=True)
