from ia_utils.parse_page_metadata import parse_page_metadata
from ia_utils.raw_pages_metadata import raw_pages_metadata

def add_page_metadata_to_db(db, records, dirname="ia-downloads", verbose=False):
    """Add page metadata to database."""
    
    for record in records:
        id_val = record["id"]
        if verbose:
            print(id_val)
            
        records = [parse_page_metadata(pmi) for pmi in raw_pages_metadata(id_val, dirname)]
    
        # Add records to the database
        db["pages_metadata"].insert_all(records)
