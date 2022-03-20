
def parse_page_metadata(item):
    """Parse out page attributes from the raw page metadata construct."""
    _id = item[0]
    page_idx = item[1]
    _page_nums = item[2]
    ix = item[3]
    obj = {'id': _id,
           'page_idx': page_idx, # Maintain our own count, just in case; should be page_leaf_num-1
           'page_char_start': ix[0],
           'page_char_end': ix[1],
           'page_leaf_num': _page_nums['leafNum'],
           'page_num': _page_nums['pageNumber'],
           'page_num_conf':_page_nums['confidence']
          }
    return obj
