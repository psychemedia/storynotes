def create_db_table_pages_metadata(db, drop=True):
    if drop:
        db["pages_metadata"].drop(ignore=True)
    db["pages_metadata"].create({
        "id": str,
        "page_idx": int, # This is just a count as we work through the pages 
        "page_char_start": int,
        "page_char_end": int,
        "page_leaf_num": int, 
        "page_num": str,
        "page_num_conf": float # A confidence value relating to the page number detection
    }, pk=("id", "page_idx")) # compound foreign keys not currently available via sqlite_utils?
