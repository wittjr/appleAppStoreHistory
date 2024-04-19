# appleAppStoreHistory

Simple script to pull historical version history from the Apple App Store. It stores all that Data
in JSON files, for ease of processing, and CSV files and generates a summary CSV showing each app 
and the number of days between releases.  The JSON files are mostly a simple cache of info for an 
app for a day.

To run, copy/rename the example.env to .env and add the App IDs for the apps you want to retrieve, they look 
something like id297606951. Then run 'node index.js'. The output will be in an output directory.