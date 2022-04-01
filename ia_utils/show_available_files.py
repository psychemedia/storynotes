from internetarchive import get_item

def show_available_files(id_val):
    """Display file types available for a particular item."""
    item = get_item(id_val)
    formats = [file_item.format for file_item in item.get_files()]
    
    return formats
