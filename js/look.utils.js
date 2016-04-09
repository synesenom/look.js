/**
 * This script some utility functions and objects
 */

var Utils = {
  // Sorts objects by date.
  sortByDate: function(a, b) {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  },

  // Extends a histogram data to a given length.
  extend: function(data, length) {
    if (data.length < length) {
      for (var i=data.length; i<10; i++)
        data.push(0);
    }
  }
};


/**
 * This object keeps track of ongoing processes on the page.
 * In case some processes exclude parallel presence, Proc
 * should be used to query if they are running.
 */
var Proc = {
  PARSE: 'parse',
  BINNING: 'binning',
  AUTO_PLAY: 'auto-play',
  HELP_MENU: 'help-menu',

  processes: {
    'parsing': false,
    'binning': false,
    'autoplaying': false,
    'help': false
  },

  on: function(proc) {
    this.processes[proc] = true;
    console.log(proc + " is on");
  },

  off: function(proc) {
    if (this.processes[proc]) {
      this.processes[proc] = false;
      console.log(proc + " is off");
    }
  },

  turn: function(proc) {
    if (this.processes[proc])
      this.off(proc);
    else
      this.on(proc);
  },

  is: function(proc) {
    return this.processes[proc];
  }
};