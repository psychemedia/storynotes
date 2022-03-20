import itertools
import json
import gzip
from pathlib import Path

def raw_pages_metadata(id_val, dirname="ia-downloads"):
    """Get page metadata."""

    p_ = Path(dirname) / id_val

    # Get the page numbers
    with open(p_ / f'{id_val}_page_numbers.json', 'r') as f:
        # We can ignore the last value
        page_numbers = json.load(f)
    
    # Get the page character indexes
    with gzip.open(p_ / f'{id_val}_hocr_pageindex.json.gz', 'rb') as g:
        # The last element seems to be redundant
        page_indexes = json.loads(g.read().decode('utf-8'))[:-1]

    # Add the id and an index count
    return zip(itertools.repeat(id_val), range(len(page_indexes)),
               page_numbers['pages'], page_indexes)
