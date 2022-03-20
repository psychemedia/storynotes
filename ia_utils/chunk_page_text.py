
from pandas import read_sql
from ia_utils.get_txt_from_file import get_txt_from_file

def chunk_page_text(db, id_val):
    """Chunk text according to page_index values."""
    
    q = f'SELECT * FROM pages_metadata WHERE id="{id_val}"'
    page_indexes = read_sql(q, db.conn).to_dict(orient="records")
    
    text = get_txt_from_file(id_val)
        
    for ix in page_indexes:
        ix["page_text"] = text[ix["page_char_start"]:ix["page_char_end"]].strip()

    return page_indexes
