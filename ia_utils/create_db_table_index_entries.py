def create_db_table_index_entries(db, drop=True):
    """Create an index_entries database table and an associated full-text search table."""
    # If we want to remove the table completely, we can drop  it
    table_name = "index_entries"
    db[table_name].drop(ignore=True)
    db[f"{table_name}_fts"].drop(ignore=True)

    db[table_name].create({
        "source_id": str, 
        "year": str,
        "vol": str,
        "index_term": str, 
        "typ": str,
        "subsidiary": str,
        "page_num": int
    })

    # Enable full text search
    # This creates an extra virtual table ({table_name}_fts) to support the full text search
    db[table_name].enable_fts(["source_id", "index_term", "subsidiary", "year", "vol", "page_num"],
                                 create_triggers=True, tokenize="porter")
