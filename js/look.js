// Constants
var PARSE_CHUNK_SIZE = 10000;
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
  var prevTime = NETWORK.time.current;
  switch(direction) {
    case "forward":
      NETWORK.time.current = Math.min(NETWORK.time.current+1, NETWORK.time.max);
      break;
    case "backward":
      NETWORK.time.current = Math.max(NETWORK.time.current-1, NETWORK.time.min);
      break;
    case "reset":
      NETWORK.time.current = NETWORK.time.min;
      break;
  }
  if (NETWORK.time.current != prevTime) {
    NETWORK.links = NETWORK.binnedLinks[NETWORK.time.current];
    NETWORK.show();
  } else {
    Proc.off(Proc.AUTO_PLAY);
  }
}

function resize() {
  var width = window.innerWidth,
  height = 600;
  NETWORK.svg.graph
    .attr("width", width)
    .attr("height", height);
  NETWORK.force
    .size([width, height]).start();
}

function autoPlay() {
  if (Proc.is(Proc.AUTO_PLAY)) {
    step("forward");
    setTimeout(function(){
      autoPlay();
    }, AUTO_PLAY_DT_IN_MILLISEC);    
  }
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
    Proc.off(Proc.AUTO_PLAY);
    switch (d3.select("#resolution > .value").text()) {
      case BINS.BIN_5_MINS.label:
        NETWORK.bin(BINS.BIN_HOUR, false);
        break;
      case BINS.BIN_HOUR.label:
        NETWORK.bin(BINS.BIN_DAY, false);
        break;
      case BINS.BIN_DAY.label:
        NETWORK.bin(BINS.BIN_5_MINS, false);
        break;
      default:
    }
  });

  // Dynamics
  /*
  d3.select("#dynamics > .value").on("click", function(){
    if (!Proc.is(Proc.DYNAMICS)) {
      d3.select("#dynamics > .value").text("sis");
      d3.select("#dynamics > .settings")
        .transition().duration(200)
        .style("height", 51);
      Proc.on(Proc.DYNAMICS);
    } else {
      d3.select("#dynamics > .value").text("none");
      d3.select("#dynamics > .settings")
        .transition().duration(200)
        .style("height", 0);
      Proc.off(Proc.DYNAMICS);
    }
  });
*/

  // Help
  d3.select(".help").on("click", function(){
    if (Proc.is(Proc.HELP_MENU)) {
      Proc.off(Proc.HELP_MENU);
      help("hide");
    }
  });
}

function howto() {
  d3.select("#howto-h").on("click", function(){
    Proc.on(Proc.HELP_MENU);
    help("show");
  });
  d3.select("#howto-left").on("click", function(){
    Proc.off(Proc.AUTO_PLAY);
    step("backward");
  });
  d3.select("#howto-right").on("click", function(){
    Proc.off(Proc.AUTO_PLAY);
    step("forward");
  });
  d3.select("#howto-r").on("click", function(){
    Proc.off(Proc.AUTO_PLAY);
    step("reset");
  });
  d3.select("#howto-space").on("click", function(){
    Proc.turn(Proc.AUTO_PLAY);
    if (Proc.is(Proc.AUTO_PLAY))
      autoPlay();
  });
}

function keys() {
  d3.select(document).on("keydown", function() {
    if(!Proc.is(Proc.BINNING) && !Proc.is(Proc.PARSE)) {
      switch(d3.event.which) {
        // right arrow: increase time index
        case 39:
          Proc.off(Proc.AUTO_PLAY);
          step("forward");
          break;
        // left arrow: decrease time index
        case 37:
          Proc.off(Proc.AUTO_PLAY);
          step("backward");
          break;
        // space: auto play
        case 32:
          Proc.turn(Proc.AUTO_PLAY);
          if (Proc.is(Proc.AUTO_PLAY))
            autoPlay();
          break;
        // r: reset time
        case 82:
          Proc.off(Proc.AUTO_PLAY);
          step("reset");
          break;
        // h: help menu
        case 72:
          if (!Proc.is(Proc.HELP_MENU)) {
            Proc.on(Proc.HELP_MENU);
            help("show");
          } else {
            Proc.off(Proc.HELP_MENU);
            help("hide");
          }
          break;
        // esc: exit help menu
        case 27:
          if (Proc.is(Proc.HELP_MENU)) {
            Proc.off(Proc.HELP_MENU);
            help("hide");
          }
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
        Proc.off(Proc.AUTO_PLAY);
        NETWORK.parse(reader.result);
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
  NETWORK.load("data/test.csv");
}
