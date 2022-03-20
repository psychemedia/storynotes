import csv

# Specify the file name we want to read data in from
def open_metadata_records(fn='nandq_internet_archive.txt'):
    """Open and read metadata records file."""

    with open(fn, 'r') as f:
        # We are going to load the data into a data structure known as a dictionary, or dict
        # Each item in the dictionary contains several elements as `key:value` pairs
        # The key matches the column name in the CSV data file,
        # along with the corresponding value in a given item row

        # Read the data in
        csv_data = csv.DictReader(f)

        # And convert it to a list of data records
        data_records = list(csv_data)
        
    return data_records
