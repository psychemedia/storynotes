def create_db_table_issues(db, drop=True):
    """Create an issues database table and an associated full-text search table."""
    table_name = "issues"
    # If required, drop any previously defined tables of the same name
    if drop:
        db[table_name].drop(ignore=True)
        db[f"{table_name}_fts"].drop(ignore=True)
    elif db[table_name].exists():
        print(f"Table {table_name} exists...")
        return

    # Create the table structure for the simple issues table
    db[table_name].create({
            "id": str,
            "content": str
        }, pk=("id"), foreign_keys=[ ("id", "metadata", "id"), # local-table-id, foreign-table, foreign-table-id)
    ])
    
    # Enable full text search
    # This creates an extra virtual table (issues_fts) to support the full text search
    # A stemmer is applied to support the efficacy of the full-text searching
    db[table_name].enable_fts(["id", "content"],
                            create_triggers=True, tokenize="porter")
