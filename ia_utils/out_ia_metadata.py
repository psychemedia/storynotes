import csv

def out_ia_metadata(item):
    """Retrieve a subset of item metadata and return it as a list."""
    # This is a nested function that looks up piece of metadata if it exists
    # If it doesn't exist, we set it to ''
    def _get(_item, field):
        return _item[field] if field in _item else ''

    #item = get_item(i.identifier)
    identifier = item.metadata['identifier']
    date =  item.metadata['date']
    title = _get(item.metadata, 'title')
    volume =_get(item.metadata, 'volume')
    issue = _get(item.metadata, 'issue')
    prev_ = _get(item.metadata, 'previous_item')
    next_ = _get(item.metadata, 'next_item')
    restricted = _get(item.metadata,'access-restricted-item')
    
    return [identifier, date, title, volume, issue, prev_, next_, restricted]
