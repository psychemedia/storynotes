from tqdm.notebook import tqdm
import dateparser

def add_patched_metadata_records_to_db(db, data_records):
    """Add metadata records to database."""
    # Patch records to include a parsed datetime element
    for record in tqdm(data_records):
        # Parse the raw date into a date object
        # Need to handle a YYYY - YYYY exception
        # If we detect this form, use the last year for the record
        if len(record['date'].split()[0]) > 1:
            record['datetime'] = dateparser.parse(record['date'].split()[-1])
        else:
            record['datetime'] = dateparser.parse(record['date'])

        record['is_index'] = 'index' in record['title'].lower() # We assign the result of a logical test

    # Add records to the database
    db["metadata"].insert_all(data_records)
