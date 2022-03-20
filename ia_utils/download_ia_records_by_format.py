# Dowload the tqdm progress bar tools
from tqdm.notebook import tqdm

from pathlib import Path
from internetarchive import download

def download_ia_records_by_format(records, path=".", formats=None):
    """Download records from Internet Archive given ID and desired format(s)"""
    formats = formats if formats else ["OCR Search Text", "OCR Page Index", "Page Numbers JSON"]
    
    for record in tqdm(records):
        _id = record['id']
        download(_id, destdir=path,
                 formats=formats,
                 silent = True)
