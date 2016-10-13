var PARSE_CHUNK_SIZE = 10000;
var WEEKDAYS = {0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"};
var NETWORK_TYPE = {
  static: "static",
  dynamicUnix: "dynamic-unix",
  dynamicStep: "dynamic-step"
};

/**
 * The network object, encapsulating all operations related to the network itself.
 */
var Network = {
  UI: {
    node: {
      r: {min: 3, span: 4}
    },
    link: {
      strokeOpacity: {min: 0.1, span: 0.9}
    }
  },
  nodes: [],
  rawLinks: [],
  binnedLinks: [],
  links: [],
  type: NETWORK_TYPE.dynamicUnix,
  time: {
    min: 0,
    max: 0,
    current: 0,
    bin: null
  },
  timeStamps: [],
  force: null,
  svg: {
    graph: null,
    nodes: null,
    links: null
  },

  state: {
    binning: false,
    parse: false
  },

  is: function(process) {
    return this.state[process];
  },

  // Builds the network SVG.
  build: function() {
    var net = this;

    if (this.svg.graph != null)
        this.svg.graph.remove();
    this.svg.graph = d3.select("body").append("svg").style("margin-top", 20);
    this.force = d3.layout.force();
    resize();

    // Start the force layout.
    var weight = Metrics.weights(this);
    var weightMax = d3.max(weight.values);
    this.force
        .on("tick", tick)
        .charge(-150)
        .linkDistance(20)
        .linkStrength(0.6)
        .gravity(0.4)
        .friction(0.4)
        .start();

    // Create the link lines.
    if(this.svg.links != null)
      this.svg.links.remove();
    this.svg.links = this.svg.graph.selectAll(".link")
        .data(net.links)
      .enter().append("line")
        .attr("class", "link")
        .attr("stroke-opacity", function(d){ return Network.UI.link.strokeOpacity.min+Network.UI.link.strokeOpacity.span*(d.weight/weightMax); });

    // Create the node circles.
    if(this.svg.nodes != null)
      this.svg.nodes.remove();
    this.svg.nodes = this.svg.graph.selectAll(".node")
        .data(net.nodes)
      .enter().append("circle")
        .attr("class", function(d) { return "node node-"+d.id; })
        .call(net.force.drag);

    function tick() {
      net.svg.links
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
      net.svg.nodes
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
    }
  },

  // Loads a network file.
  load: function(file) {
    var net = this;
    var dsv = d3.dsv(" ", "text/plain");
    dsv(file, function(error, data) {
      if (error) throw error;

      d3.select(".dnd").style("display", "block");
      d3.select(".dnd > .message").text("Load network");
      d3.select(".dnd > .progress-bar").style("width", 0);
      var li = 0;
      var nodesByName = {};
      var numLines = data.length;
      var rawLinks = [];
      (function loadLoop() {
        // Decide network type
        net.type = NETWORK_TYPE.static;
        if (data[0].timestamp)
          net.type = NETWORK_TYPE.dynamicUnix;
        if (data[0].timestep)
          net.type = NETWORK_TYPE.dynamicStep;

        for (var i=li; i<li+PARSE_CHUNK_SIZE && i<numLines; i++) {
          var dt = 0;
          switch (net.type) {
            case NETWORK_TYPE.dynamicUnix:
              dt = new Date(data[i].timestamp*1000);
              break;
            case NETWORK_TYPE.dynamicStep:
              dt = data[i].timestep;
              break
            default:
              break;
          }
          var s = data[i].source;
          var t = data[i].target;
          var l = {source: nodesByName[s] || (nodesByName[s] = {id: s}),
                   target: nodesByName[t] || (nodesByName[t] = {id: t})};
          net.rawLinks.push({'time': dt, 'link': l});
        }
        li += PARSE_CHUNK_SIZE;
        var percentLoaded = Math.round((li / numLines) * 100);
        if (percentLoaded < 100)
          d3.select(".dnd > .progress-bar").style("width", percentLoaded*2.5 + "px");
        if (li < numLines) {
          setTimeout(loadLoop, 10);
        } else {
          net.nodes = d3.values(nodesByName);
          net.bin(BINS.BIN_5_MINS);
        }
      })();
    });
  },

  // Parses a network from a CSV file converted to a string.
  parse: function(data) {
    this.state.parse = true;
    var net = this;
    var lines = data.trim().split('\n');
    var numLines = lines.length;
    var li = 1;
    var nodesByName = {};
    var newFullLinks = [];
    (function parseLoop() {
      // Decide if network is dynamic or static
      var header = lines[0].split(' ');
      net.type = NETWORK_TYPE.static;
      if (header.length > 2)
        net.type = (header[2] == "timestamp") ? NETWORK_TYPE.dynamicUnix : NETWORK_TYPE.dynamicStep;

      // Read links
      for (var i=li; i<li+PARSE_CHUNK_SIZE && i<numLines; i++) {
        var cols = lines[i].split(' ');
        var dt = 0;
        switch (net.type) {
          case NETWORK_TYPE.dynamicUnix:
            dt = new Date((+cols[2]) * 1000);
            break;
          case NETWORK_TYPE.dynamicStep:
            dt = +cols[2];
            break;
          default:
            break;
        }
        var s = cols[0];
        var t = cols[1];
        var l = {source: nodesByName[s] || (nodesByName[s] = {id: s}),
                 target: nodesByName[t] || (nodesByName[t] = {id: t}),
                 weight: 1};
        newFullLinks.push({'time': dt, 'link': l});
      }
      // Update progress bar
      li += PARSE_CHUNK_SIZE;
      var percentLoaded = Math.round((li / numLines) * 100);
      if (percentLoaded < 100)
        d3.select(".dnd > .progress-bar").style("width", percentLoaded*2.5 + "px");

      // Continue parsing if there are edges left
      if (li < numLines) {
        setTimeout(parseLoop, 10);
      } else {
        // Update network
        net.nodes = d3.values(nodesByName);
        net.rawLinks = newFullLinks;
        net.state.parse = false;
        net.bin(BINS.BIN_5_MINS);
      }
    })();
  },

  bin: function(binType) {
    this.state.binning = true;

    d3.select(".dnd").style("display", "block");
    d3.select(".dnd > .message").text("Binning links");
    d3.select("#resolution > .value").text(binType.label);
    this.time.bin = binType.msec;
    this.timeStamps = [];
    this.binnedLinks = [];
    bins = {};

    var net = this;
    var numLinks = this.rawLinks.length;
    var li = 0;
    (function binLoop() {
      for (var i=li; i<li+10000 && i<numLinks; i++) {
        var l = net.rawLinks[i];
        var bin = l.time;
        switch (net.type) {
          case NETWORK_TYPE.dynamicUnix:
            bin = BINS.date(l.time, binType);
            break;
          default:
            break;
        }

        if (!bins[bin]) {
          bins[bin] = {};
          net.timeStamps.push(bin);
        }
        var linkId = l.link.source.id + "-" + l.link.target.id;
        if (!bins[bin][linkId]) {
          bins[bin][linkId] = l.link;
          bins[bin][linkId].weight = 1.0;
        }
        else
          bins[bin][linkId].weight++;
      }
      li += 10000;
      var percentLoaded = Math.round((li / numLinks) * 100);
      if (percentLoaded < 100)
        d3.select(".dnd > .progress-bar").style("width", percentLoaded*2.5 + "px");
      if (li < numLinks) {
        setTimeout(binLoop, 10);
      } else {
        // Add links
        var diff = binType.msec;
        var timeMin = d3.min(d3.values(net.timeStamps));
        var timeMax = d3.max(d3.values(net.timeStamps));
        net.timeStamps = [];
        var binIndex = 0;
        for (var t=timeMin; t<=timeMax; ) {
          switch (net.type) {
            case NETWORK_TYPE.dynamicUnix:
              net.timeStamps.push(new Date(t));
              break;
            default:
              net.timeStamps.push(t);
              break;
          }

          // add links
          net.binnedLinks.push([]);
          for (var l in bins[t]) {
            net.binnedLinks[binIndex].push(bins[t][l]);
          }

          switch (net.type) {
            case NETWORK_TYPE.dynamicUnix:
              t.setTime( t.getTime() + diff );
              break;
            default:
              t++;
              break;
          }
          binIndex++;
        }
        bins = null;

        // Set min/max and current time indices
        net.time.min = 0;
        net.time.max = net.timeStamps.length-1;
        net.time.current = net.time.min;
        net.links = net.binnedLinks[net.time.current];
        d3.select(".dnd").style("display", "none");
        d3.select(".dnd > .message").text("");

        // get structural dynamics
        StructuralDynamics.create(net);

        // build and show
        net.build();
        net.show();
        net.state.binning = false;

        if (!Dynamics.is(Dynamics.MODEL.none))
          Dynamics.on(net);
      }
    })();
  },

  // Displays the network's current state.
  show: function() {
    var net = this;

    // Update time
    switch (net.type) {
      case NETWORK_TYPE.dynamicUnix:
        dt = this.timeStamps[this.time.current];
        d3.select(".time").html(dt.toLocaleDateString() + " "
          + WEEKDAYS[net.timeStamps[net.time.current].getDay()] + " "
          + dt.toLocaleTimeString());
        break;
      case NETWORK_TYPE.static:
        d3.select(".time").html("static");
        break;
      default:
        d3.select(".time").html("step " + this.time.current);
        break;
    }

    // links
    var weight = Metrics.weights(this);
    var weightMax = d3.max(weight.values);
    this.svg.links = this.svg.links.data(net.links);
    this.svg.links.enter()
      .insert("line", ".node")
      .attr("class", "link")
      .attr("stroke-opacity", function(d){ return Network.UI.link.strokeOpacity.min+Network.UI.link.strokeOpacity.span*(d.weight/weightMax); });
    this.svg.links.exit().remove();
    WeightDistribution.show(weight.dist);

    // force
    this.force
      .nodes(net.nodes)
      .links(net.links)
      .start();

    // nodes
    var degree = Metrics.degrees(this);
    var degMax = Math.max(d3.max(d3.values(degree.values)), 1);
    this.svg.nodes
      .classed("active", function(d){ return degree.values[d.index] > 0; })
      .transition().duration(AUTO_PLAY_DT_IN_MILLISEC)
      .attr("r", function(d){ return Network.UI.node.r.min+Network.UI.node.r.span*degree.values[d.index]/degMax; });
    DegreeDistribution.show(degree.dist);

    // other statistics
    StructuralDynamics.show(this.time.current);

    // dynamics
    Dynamics.update(this);
  },

  set: function(time) {
    if (time >= this.time.min && time <= this.time.max) {
      this.time.current = Math.round(time);
      this.links = this.binnedLinks[this.time.current];
      this.show();
      return true;
    } else {
      return false;
    }
  }
};
