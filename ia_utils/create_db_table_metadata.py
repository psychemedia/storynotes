import datetime

def create_db_table_metadata(db, drop=True):
    # If we want to remove the table completely, we can drop  it
    if drop:
        db["metadata"].drop(ignore=True)
        db["metadata"].create({
            "id": str,
            "date": str,
            "datetime": datetime.datetime, # Use an actual time representation
            "series": str,
            "vol": str,
            "iss": str,
            "title": str, 
            "next_id": str, 
            "prev_id": str,
            "is_index": bool, # Is the record an index record
            "restricted": str, # should really be boolean
        }, pk=("id"))
