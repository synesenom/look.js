// Constants
var PARSE_CHUNK_SIZE = 10000;
var WEEKDAYS = {0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"};
var UI = {
  node: {
    r: {min: 3, span: 4},
    opacity: {active: 1, inactive: 0.1},
    fill: {active: "#3399ff", inactive: "#000"}
  },
  link: {
    strokeOpacity: {min: 0.2, span: 0.8},
    strokeWidth: {min: 1, span: 2},
  },
  force: {
    linkStrength: {min: 0.1, span: 0.2}
  },
  histogram: {
    width: 200,
    height: 60,
    margin: {left: 40, right: 10, top: 16, bottom: 35},
    barPadding: 1,
    xTicks: 8,
    yTicks: 3
  }
};
var AUTO_PLAY_DT_IN_MILLISEC = 100;

// Processes
var Proc = {
  _proc: {
    'parsing': false,
    'binning': false,
    'autoplaying': false,
    'help': false
  },

  on: function(proc) {
    this._proc[proc] = true;
    console.log(proc + " is on");
  },

  off: function(proc) {
    if (this._proc[proc]) {
      this._proc[proc] = false;
      console.log(proc + " is off");
    }
  },

  turn: function(proc) {
    if (this._proc[proc])
      this.off(proc);
    else
      this.on(proc);
  },

  is: function(proc) {
    return this._proc[proc];
  }
}

// nodes and temporal links
var network = {nodes: [], rawLinks: [], binnedLinks: [], links: [], time: {min: 0, max: 0, current: 0}};
var force;
var timeStamps = [];
var svg, svgLink, svgNode, svgDegDist, svgWeightDist;

// Sort functions
function sortInt(a, b) {
  return parseInt(a) - parseInt(b);
}
function sortByDate(a, b) {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

// Histogram
var Hist = {
  histogram: function(samples) {
    var hist = [];
    if (samples instanceof Array) {
      samples.forEach(function(s) {
        var si = Math.round(s);
        if (hist.length-1 < si)
          for (var j=hist.length; j<si; j++)
            hist.push(0);
        hist[si-1]++;
      });
    } else {
      for (var i in samples) {
        s = samples[i];
        if (hist.length-1 < s)
          for (var j=hist.length; j<=s; j++)
            hist.push(0);
        hist[s]++;
      }
    }
    if (hist.length < 10) {
      for(var j=hist.length; j<10; j++)
        hist.push(0);
    }
    var min = 1;
    hist.forEach(function(h){
      if (h < min && h > 0)
        min = h;
    });
    var max = Math.max(...hist);
    return {hist: hist, min: min, max: max};
  },

  svg: function(id) {
    return d3.select(id)
      .attr("width", UI.histogram.width + UI.histogram.margin.left + UI.histogram.margin.right)
      .attr("height", UI.histogram.height + UI.histogram.margin.bottom + UI.histogram.margin.top)
      .append("g")
      .attr("transform", "translate(" + UI.histogram.margin.left + "," + UI.histogram.margin.top + ")");
  },

  bar: function(svgElem, barData) {
    var x = d3.scale.linear()
      .domain([0, barData.hist.length])
      .range([0, UI.histogram.width]);
    var y = d3.scale.linear()
      .domain([0, barData.max])
      .range([UI.histogram.height, 0]);

    svgElem.selectAll(".bar")
      .data(barData.hist)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d, i) { return x(i) + UI.histogram.barPadding; })
      .attr("y", function(d) { return y(d) + 1; })
      .attr("width", UI.histogram.width / barData.hist.length - UI.histogram.barPadding)
      .attr("height", function(d) { return UI.histogram.height - y(d); });

    return {x: x, y: y};
  },

  line: function(svgElem, lineData) {
    var x = d3.scale.log()
      .domain([1, lineData.hist.length])
      .range([0, UI.histogram.width]);
    var y = d3.scale.log()
      .domain([lineData.min, lineData.max])
      .range([UI.histogram.height, 0]);

    var line = d3.svg.line()
      .x(function(d, i) { return x(i+1); })
      .y(function(d) { return d > 0 ? y(d) + 1 : y(lineData.min) + 1; })
      .interpolate('basis');
    svgElem.append("path")
      .attr("d", line(lineData.hist))
      .attr("class", "path");

      return {x: x, y: y};
  },

  axes: function(svgElem, scale, log) {
    var xAxis = d3.svg.axis()
      .scale(scale.x)
      .orient("bottom");
    var yAxis = d3.svg.axis()
      .scale(scale.y)
      .orient("left");
    if (log) {
      xAxis.ticks(0, ".1s");
      yAxis.ticks(0, ".1s");
    } else {
      xAxis.ticks(UI.histogram.xTicks);
      yAxis.ticks(UI.histogram.yTicks);
    }
    svgElem.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0," + (UI.histogram.height+1) + ")")
      .call(xAxis);
    svgElem.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0," + 1 + ")")
      .call(yAxis);
  },

  labels: function(svgElem, xLabel, yLabel) {
    svgElem.append("text")
      .attr("class", "axis-label")
      .attr("text-anchor", "end")
      .attr("x", UI.histogram.width)
      .attr("y", UI.histogram.height + 30)
      .text(xLabel);
    svgElem.append("text")
      .attr("class", "axis-label")
      .attr("text-anchor", "end")
      .attr("y", -5)
      .text(yLabel);
  }
}

// Graph properties
function getDegrees(g) {
  var degrees = {};
  for (var i = 0; i < g.nodes.length; i++) {
    degrees[i] = 0;
  };
  g.links.forEach(function (d) {
    degrees[d.source.index]++;
    degrees[d.target.index]++;
  });

  var dmax = 1;
  for (i = 0; i < g.nodes.length; i++) {
    if (degrees[i] > dmax)
      dmax = degrees[i];
  };
  return {deg: degrees, max: dmax};
}
function getLinkWeights(g) {
  var weights = [];
  for (var i = 0; i<g.links.length; i++) {
    weights.push(g.links[i].weight);
  }
  return {weights: weights, min: Math.min(...weights), max: Math.max(...weights)};
}

function degreeDistribution(degrees) {
  var h = Hist.histogram(degrees);

  if (svgDegDist != null)
    svgDegDist.remove();
  svgDegDist = Hist.svg("#degree-dist");

  scale = Hist.bar(svgDegDist, h);
  Hist.axes(svgDegDist, scale, false);
  Hist.labels(svgDegDist, "degree", "freq");
}

function weightDistribution(weights) {
  var h = Hist.histogram(weights);

  if (svgWeightDist != null)
    svgWeightDist.remove();
  svgWeightDist = Hist.svg("#weight-dist");

  scale = Hist.line(svgWeightDist, h);
  Hist.axes(svgWeightDist, scale, true);
  Hist.labels(svgWeightDist, "link weight", "freq");
}

function bin(g, binType, toBuild) {
  $(".dnd").css("display", "block");
  $(".dnd > .message").text("Binning links");
  $("#resolution > .value").text(binType);
  timeStamps = [];
  g.binnedLinks = {};
  newBinnedLinks = {};
  bins = {};

  var numLinks = g.rawLinks.length;
  var li = 0;
  Proc.on('binning');
  (function binLoop() {
    for (var i=li; i<li+10000 && i<numLinks; i++) {
      var l = g.rawLinks[i];
      var dt = l.date;
      var bin = 0;
      if (binType == "days" )
        bin = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      if (binType == "hours" )
        bin = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), dt.getHours());
      if (binType == "5 min" ) {
        var m = dt.getMinutes();
        bin = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), dt.getHours(), 5*Math.floor(m/5));
      }
      if (!bins[bin]) {
        g.binnedLinks[bin] = [];
        bins[bin] = {};
        timeStamps.push(bin);
      }
      var linkId = l.link.source.id + "-" + l.link.target.id;
      if (!bins[bin][linkId]) {
        bins[bin][linkId] = 1.0;
        g.binnedLinks[bin].push(l.link);
      }
      else
        bins[bin][linkId]++;
    }
    li += 10000;
    var percentLoaded = Math.round((li / numLinks) * 100);
    if (percentLoaded < 100)
      $(".dnd > .progress-bar").css("width", percentLoaded*2.5 + "px");
    if (li < numLinks) {
      setTimeout(binLoop, 10);
    } else {
      for (var b in g.binnedLinks) {
        for (var i=0; i<g.binnedLinks[b].length; i++) {
          var l = g.binnedLinks[b][i];
          var linkId = l.source.id + "-" + l.target.id;
          l.weight = parseFloat(bins[b][linkId]);
        }
      }
      g.time.min = 0;
      g.time.max = timeStamps.length-1;
      g.time.current = g.time.min;
      g.links = g.binnedLinks[timeStamps[g.time.current]];
      $(".dnd").css("display", "none");
      $(".dnd > .message").text("");
      if(toBuild)
        build();
      show();
      Proc.off('binning');
    }
  })();
}

// loads network
function load(file) {
  var dsv = d3.dsv(" ", "text/plain");
  dsv(file, function(error, data) {
    if (error) throw error;

    // fill daily aggregates
    var nodesByName = {};
    data.forEach(function(d) {
      var dt = new Date(d.timestamp*1000);
      var s = d.source;
      var t = d.target;
      var l = {source: nodesByName[s] || (nodesByName[s] = {id: s}),
               target: nodesByName[t] || (nodesByName[t] = {id: t})};
      network.rawLinks.push({'date': dt, 'link': l});
    });
    network.rawLinks.sort(sortByDate);
    network.nodes = d3.values(nodesByName);
    bin(network, "hours", true);
  });
}

function build() {
  if (svg != null)
    svg.remove();
  svg = d3.select("body").append("svg");
  force = d3.layout.force();
  resize();

  // Start the force layout.
  var w = getLinkWeights(network);
  force
      .nodes(network.nodes)
      .links(network.links)
      .on("tick", tick)
      .charge(-150)
      .linkDistance(10)
      .linkStrength(function(d){ return UI.force.linkStrength.min+UI.force.linkStrength.span*(d.weight/w.max); })
      .gravity(0.4)
      .friction(0.4)
      .start();

  // Create the link lines.
  if(svgLink != null)
    svgLink.remove();
  svgLink = svg.selectAll(".link")
      .data(network.links)
    .enter().append("line")
      .attr("class", "link")
      .attr("stroke-opacity", function(d){ return UI.link.strokeOpacity.min+UI.link.strokeOpacity.span*(d.weight/w.max); })
      .attr("stroke-width", function(d){ return UI.link.strokeWidth.min+UI.link.strokeWidth.span*(d.weight/w.max); });

  // Create the node circles.
  var deg = getDegrees(network);
  if(svgNode != null)
    svgNode.remove();
  svgNode = svg.selectAll(".node")
      .data(network.nodes)
    .enter().append("circle")
      .attr("class", "node")
      .call(force.drag);

  function tick() {
    svgLink
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });
    svgNode
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
  }
}

function show() {
  // Update time
  dt = timeStamps[network.time.current];
  $(".time").html(dt.toLocaleDateString() + " "
                  + WEEKDAYS[timeStamps[network.time.current].getDay()] + " "
                  + dt.toLocaleTimeString());

  // links
  var w = getLinkWeights(network);
  svgLink = svgLink.data(network.links);
  svgLink.enter()
    .insert("line", ".node")
    .attr("class", "link")
    .attr("stroke-opacity", function(d){ return UI.link.strokeOpacity.min+UI.link.strokeOpacity.span*(d.weight/w.max); })
    .attr("stroke-width", function(d){ return UI.link.strokeWidth.min+UI.link.strokeWidth.span*(d.weight/w.max); });
  svgLink.exit().remove();
  weightDistribution(w.weights);

  force
    .nodes(network.nodes)
    .links(network.links)
    .start();

  // nodes
  var deg = getDegrees(network);
  svgNode.transition().duration(200)
    .attr("r", function(d){ return UI.node.r.min+UI.node.r.span*deg.deg[d.index]/deg.max; })
    .attr("opacity", function(d){ return deg.deg[d.index] > 0 ? UI.node.opacity.active : UI.node.opacity.inactive; })
    .attr("fill", function(d){ return deg.deg[d.index] > 0 ? UI.node.fill.active : UI.node.fill.inactive; });
  degreeDistribution(deg.deg);
}

function step(direction) {
  prevIndex = network.time.current;
  switch(direction) {
    case "forward":
      network.time.current = Math.min(network.time.current+1, network.time.max);
      break;
    case "backward":
      network.time.current = Math.max(network.time.current-1, network.time.min);
      break;
    case "reset":
      network.time.current = network.time.min;
      break;
  }
  if (network.time.current != prevIndex) {
    network.links = network.binnedLinks[timeStamps[network.time.current]];
    show();
  } else {
    Proc.off('autoplaying');
  }
}

function resize() {
  var width = $(window).width(),
  height = 600;//$(window).height();
  svg
    .attr("width", width)
    .attr("height", height);
  force
    .size([width, height]).start();
}

function autoPlay() {
  if (Proc.is('autoplaying')) {
    step("forward");
    setTimeout(function(){
      autoPlay();
    }, AUTO_PLAY_DT_IN_MILLISEC);    
  }
}

function help(action) {
  console.log("help", action);
  switch(action){
    case "show":
      $(".help").css("display", "block").animate({
        opacity: 1
      }, 500);
      break;
    case "hide":
      $(".help").animate({
        opacity: 0
      }, 500, function() {
        $(this).css("display", "none");
      });
      break;
  }
}

function parse(data) {
  var lines = $.trim(data).split('\n');
  var numLines = lines.length;
  var li = 1;
  var nodesByName = {};
  var newFullLinks = [];
  Proc.on('parsing');
  (function parseLoop() {
    for (var i=li; i<li+PARSE_CHUNK_SIZE && i<numLines; i++) {
      cols = lines[i].split(' ');
      var dt = new Date(cols[2]*1000);
      var s = cols[0];
      var t = cols[1];
      var l = {source: nodesByName[s] || (nodesByName[s] = {id: s}),
               target: nodesByName[t] || (nodesByName[t] = {id: t}),
               weight: 1};
      newFullLinks.push({'date': dt, 'link': l});
    }
    li += PARSE_CHUNK_SIZE;
    var percentLoaded = Math.round((li / numLines) * 100);
    if (percentLoaded < 100)
      $(".dnd > .progress-bar").css("width", percentLoaded*2.5 + "px");
    if (li < numLines) {
      setTimeout(parseLoop, 10);
    } else {
      newFullLinks.sort(sortByDate);
      network.nodes = d3.values(nodesByName);
      network.rawLinks = newFullLinks;
      Proc.off('parsing');
      bin(network, "hours", true);
    }
  })();
}

function setupControlPanel() {
  // Resolution
  $("#resolution > .value").click(function(){
    switch ($(this).text()) {
      case "hours":
        bin(network, "5 min", false);
        break;
      case "5 min":
        bin(network, "days", false);
        break;
      case "days":
        bin(network, "hours", false);
        break;
      default:
    }
  });

  // Howto
  $("#howto-h").click(function(){
    Proc.on('help');
    help("show");
  });
  $("#howto-left").click(function(){
    Proc.off('autoplaying');
    step("backward");
  });
  $("#howto-right").click(function(){
    Proc.off('autoplaying');
    step("forward");
  });
  $("#howto-r").click(function(){
    Proc.off('autoplaying');
    step("reset");
  });
  $("#howto-space").click(function(){
    Proc.turn('autoplaying');
    if (Proc.is('autoplaying'))
      autoPlay();
  });

  // Help
  $(".help").click(function(){
    if (Proc.is('help')) {
      Proc.off('help');
      help("hide");
    }
  });
}

function setupKeys() {
  $(document).keydown(function(e) {
    if(!Proc.is('binning') && !Proc.is('parsing')) {
      switch(e.which) {
        // right arrow: increase time index
        case 39:
          Proc.off('autoplaying');
          step("forward");
          break;
        // left arrow: decrease time index
        case 37:
          Proc.off('autoplaying');
          step("backward");
          break;
        // space: auto play
        case 32:
          Proc.turn('autoplaying');
          if (Proc.is('autoplaying'))
            autoPlay();
          break;
        // r: reset time
        case 82:
          Proc.off('autoplaying');
          step("reset");
          break;
        // h: help menu
        case 72:
          if (!Proc.is('help')) {
            Proc.on('help');
            help("show");
          } else {
            Proc.off('help');
            help("hide");
          }
          break;
        // esc: exit help menu
        case 27:
          if (Proc.is('help')) {
            Proc.off('help');
            help("hide");
          }
          break;
      }
    }
  });
}

function setupDragAndDrop() {
  var dndLastTarget = null;
  var dnd = {'overlay': $(".dnd"),
             'message': $(".dnd > .message"),
             'progressBar': $(".dnd > .progress-bar")}
  // Drag enter
  $(window).bind("dragenter", function(e){
    e.preventDefault();
    e.stopPropagation();
    dndLastTarget = e.target;
    dnd.overlay.css("display", "block");
    dnd.message.text("Drop file to upload");
    dnd.progressBar.css("width", "0px");
  });

  // Drag over
  $(window).on("dragover", function(e){
    e.preventDefault();
    e.stopPropagation();
    dndLastTarget = e.target;
  });

  // Drag leave
  $(window).bind("dragleave", function(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.target === dndLastTarget) {
      dnd.overlay.css("display", "none");
      dnd.message.text();
    }
  });

  // Drop
  $(window).bind("drop", function(e){
    e.preventDefault();
    e.stopPropagation();

    // Read file
    if(e.target === dndLastTarget) {
      reader = new FileReader();
      reader.onprogress = function(e) {
        if (e.lengthComputable) {
          var percentLoaded = Math.round((e.loaded / e.total) * 100);
          if (percentLoaded < 100)
            dnd.progressBar.css("width", percentLoaded*2.5 + "px");
        }
      };
      reader.readAsText(e.originalEvent.dataTransfer.files[0]);
      reader.onloadstart = function(e) {
        dnd.message.text("Reading file");
      };
      reader.onload = function(e) {
        dnd.progressBar.css("width", "0px");
        dnd.message.text("Parsing network");
        parse(reader.result);
      };
    }
  });
}

// Method to call after page loaded
$(function () {
  setupKeys();
  setupControlPanel();
  setupDragAndDrop();
  window.onresize = resize;
});
