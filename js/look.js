// Constants
var WEEKDAYS = {0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"};
var AUTO_PLAY_DT_IN_MILLISEC = 100;
var BINS = {
  BIN_5_MINS: { label: "5 mins", msec: 300000 },
  BIN_HOUR: {label: "hour", msec: 3600000},
  BIN_DAY: {label: "day", msec: 86400000},

  date: function (date, binType) {
    switch (binType) {
      case this.BIN_DAY:
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      case this.BIN_HOUR:
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
      case this.BIN_5_MINS:
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), 5*Math.floor(date.getMinutes()/5));
    }
  },
};


function step(direction) {
  var change = false;
  switch(direction) {
    case "forward":
      change = Network.set(Network.time.current+1);
      break;
    case "backward":
      change = Network.set(Network.time.current-1);
      break;
    case "reset":
      change = Network.set(Network.time.min);
      break;
  }
  if (!change) {
    AutoPlay.off();
  }
}

function resize() {
  var width = window.innerWidth,
  height = 600;
  Network.svg.graph
    .attr("width", width)
    .attr("height", height);
  Network.force
    .size([width, height]).start();
}

function help(action) {
  switch(action){
    case "show":
      d3.select(".help").style("display", "block")
        .transition().duration(500)
        .style("opacity", 1);
      break;
    case "hide":
      d3.select(".help")
        .transition().duration(500)
        .style("opacity", 0)
        .each("end", function() {
        d3.select(".help").style("display", "none");
      });
      break;
  }
}

function control() {
  // Resolution
  d3.select("#resolution > .value").on("click", function(){
    AutoPlay.off();
    switch (d3.select("#resolution > .value").text()) {
      case BINS.BIN_5_MINS.label:
        Network.bin(BINS.BIN_HOUR, false);
        break;
      case BINS.BIN_HOUR.label:
        Network.bin(BINS.BIN_DAY, false);
        break;
      case BINS.BIN_DAY.label:
        Network.bin(BINS.BIN_5_MINS, false);
        break;
      default:
    }
  });

  // Dynamics
  function getParams() {
    return {
      beta: document.getElementById("beta").value,
      gamma: document.getElementById("gamma").value
    };
  }
  d3.select("#dynamics-model").on("click", function(){
    Dynamics.set(getParams());
    Dynamics.switchModel(Network);
  });
  d3.select("#reset").on("click", function(){
    Dynamics.set(getParams());
    Dynamics.on(Network);
  });
  d3.select("#beta").on("input", function(){ Dynamics.set(getParams()); });
  d3.select("#gamma").on("input", function(){ Dynamics.set(getParams()); });

  // Help
  d3.select(".help").on("click", function(){ Help.off(); });
}

function howto() {
  d3.select("#howto-h").on("click", function(){
    Help.on();
  });
  d3.select("#howto-left").on("click", function(){
    AutoPlay.off();
    step("backward");
  });
  d3.select("#howto-right").on("click", function(){
    AutoPlay.off();
    step("forward");
  });
  d3.select("#howto-r").on("click", function(){
    AutoPlay.off();
    step("reset");
  });
  d3.select("#howto-space").on("click", function(){
    if (AutoPlay.on(function(){ step("forward"); }))
      AutoPlay.off();
  });
}

function keys() {
  d3.select(document).on("keydown", function() {
    if(!Network.is('binning') && !Network.is("parse")) {
      switch(d3.event.which) {
        // right arrow: increase time index
        case 39:
          AutoPlay.off();
          step("forward");
          break;
        // left arrow: decrease time index
        case 37:
          AutoPlay.off();
          step("backward");
          break;
        // space: auto play
        case 32:
          if (AutoPlay.on(function(){ step("forward"); }))
            AutoPlay.off();
          break;
        // r: reset time
        case 82:
          AutoPlay.off();
          step("reset");
          break;
        // h: help menu
        case 72:
          if (Help.on())
            Help.off();
          break;
        // esc: exit help menu
        case 27:
          Help.off();
          break;
      }
    }
  });
}

function dragAndDrop() {
  var dndLastTarget = null;
  var dnd = {'overlay': d3.select(".dnd"),
             'message': d3.select(".dnd > .message"),
             'progressBar': d3.select(".dnd > .progress-bar")}
  // Drag enter
  d3.select(window).on("dragenter", function(){
    var e = d3.event;
    e.preventDefault();
    e.stopPropagation();
    dndLastTarget = e.target;
    dnd.overlay.style("display", "block");
    dnd.message.text("Drop file to upload");
    dnd.progressBar.style("width", "0px");
  });

  // Drag over
  d3.select(window).on("dragover", function(){
    var e = d3.event;
    e.preventDefault();
    e.stopPropagation();
    dndLastTarget = e.target;
  });

  // Drag leave
  d3.select(window).on("dragleave", function(){
    var e = d3.event;
    e.preventDefault();
    e.stopPropagation();
    if(e.target === dndLastTarget) {
      dnd.overlay.style("display", "none");
      dnd.message.text();
    }
  });

  // Drop
  d3.select(window).on("drop", function(){
    var e = d3.event;
    e.preventDefault();
    e.stopPropagation();

    // Read file
    if(e.target === dndLastTarget) {
      reader = new FileReader();
      reader.onprogress = function(e) {
        if (e.lengthComputable) {
          var percentLoaded = Math.round((e.loaded / e.total) * 100);
          if (percentLoaded < 100)
            dnd.progressBar.style("width", percentLoaded*2.5 + "px");
        }
      };
      reader.readAsText(e.dataTransfer.files[0]);
      reader.onloadstart = function(e) {
        dnd.message.text("Reading file");
      };
      reader.onload = function(e) {
        dnd.progressBar.style("width", "0px");
        dnd.message.text("Parsing network");
        AutoPlay.off();
        Network.parse(reader.result);
      };
    }
  });
}

// Method to call after page loaded
window.onload = function (){
  keys();
  control();
  howto();
  dragAndDrop();
  window.onresize = resize;
  Network.load("data/test.csv");
}
