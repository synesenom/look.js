# look.js
An easy-to-use inspector for temporal networks.

# Usage
The library is a stand-alone Javascript file that uses jquery and d3, with a corresponding index.html and style file.
To use, simply drag and drop a network of the format

    source target timestamp

that is, columns separated by spaces. `source` and `target` are the labels for the corresponding terminal nodes of the links, `timestamp` is given in UNIX timestamps.
look.js works by opening `index.html` in a browser without a local server running, but note that in that case the initial test network will not load in some browsers.
