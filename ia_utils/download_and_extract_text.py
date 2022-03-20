from internetarchive import download
from ia_utils.get_txt_from_file import get_txt_from_file

def download_and_extract_text(id_val, p="ia-downloads", typ="searchtext", verbose=False):
    """Download search text from Internet Archive, extract the text and return it."""
    if verbose:
        print(f"Downloading {id_val} issue text")
    if typ=="searchtext":
        download(id_val, destdir=p, silent = True,
             formats=["OCR Search Text"])
    elif typ=="djvutxt":
        download(id_val, destdir=p, silent = True,
             formats=["DjVuTXT"])
    else:
        return ''
    
    text = get_txt_from_file(id_val, typ=typ)
    return text
