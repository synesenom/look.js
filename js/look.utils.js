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
 * Object managing the automatic play of the network dynamics.
 */
var AutoPlay = {
  isOn: false,

  run: function(func) {
    if (this.isOn) {
      func();
      setTimeout(function(){
        AutoPlay.run(func);
      }, AUTO_PLAY_DT_IN_MILLISEC);
    }
  },

  on: function(func) {
    if (!this.isOn) {
      this.isOn = true;
      this.run(func);
      return false;
    } else
      return true;
  },

  off: function() {
    this.isOn = false;
  },

  is: function() {
    return this.isOn;
  }
};

var Help = {
  isOn: false,

  on: function() {
    // show help
    if (!this.isOn) {
      this.isOn = true;
      d3.select(".help").style("display", "block")
        .transition().duration(500)
        .style("opacity", 1);
      return false;
    } else
      return true;
  },

  off: function() {
    this.isOn = false;
    d3.select(".help")
      .transition().duration(500)
      .style("opacity", 0)
      .each("end", function() {
        d3.select(".help").style("display", "none");
      });
  },

  is: function() {
    return this.isOn;
  }
};
