from pathlib import Path
import gzip

# Create a simple function to make it even easier to extract the full text content
def get_txt_from_file(id_val, dirname="ia-downloads", typ="searchtext"):
    """Retrieve text from downloaded text file."""
    if typ=="searchtext":
        p_ = Path(dirname) / id_val / f'{id_val}_hocr_searchtext.txt.gz'
        f = gzip.open(p_,'rb')
        content = f.read().decode('utf-8')
    elif typ=="djvutxt":
        p_ = Path(dirname) / id_val / f'{id_val}_djvu.txt'
        content = p_.read_text()
    else:
        content = ""
    return content
