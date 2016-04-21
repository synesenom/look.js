var PARSE_CHUNK_SIZE = 10000;

/**
 * The network object, encapsulating all operations related to the network itself.
 */
var Network = {
  nodes: [],
  rawLinks: [],
  binnedLinks: [],
  links: [],
  time: {
    min: 0,
    max: 0,
    current: 0
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
    this.svg.graph = d3.select("body").append("svg");
    this.force = d3.layout.force();
    resize();

    // Start the force layout.
    var weight = Metrics.weights(this);
    var weightMax = d3.max(weight.values);
    this.force
        .on("tick", tick)
        .charge(UI.network.force.charge)
        .linkDistance(UI.network.force.linkDistance)
        .linkStrength(UI.network.force.linkStrength)
        .gravity(UI.network.force.gravity)
        .friction(UI.network.force.friction)
        .start();

    // Create the link lines.
    if(this.svg.links != null)
      this.svg.links.remove();
    this.svg.links = this.svg.graph.selectAll(".link")
        .data(net.links)
      .enter().append("line")
        .attr("class", "link")
        .attr("stroke-opacity", function(d){ return UI.network.link.strokeOpacity.min+UI.network.link.strokeOpacity.span*(d.weight/weightMax); })
        .attr("stroke-width", UI.network.link.strokeWidth);

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
        for (var i=li; i<li+PARSE_CHUNK_SIZE && i<numLines; i++) {
          var dt = new Date(data[i].timestamp*1000);
          var s = data[i].source;
          var t = data[i].target;
          var l = {source: nodesByName[s] || (nodesByName[s] = {id: s}),
                   target: nodesByName[t] || (nodesByName[t] = {id: t})};
          net.rawLinks.push({'date': dt, 'link': l});
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
        d3.select(".dnd > .progress-bar").style("width", percentLoaded*2.5 + "px");
      if (li < numLines) {
        setTimeout(parseLoop, 10);
      } else {
        net.nodes = d3.values(nodesByName);
        net.rawLinks = newFullLinks;
        net.state.parse = false;
        net.bin(BINS.BIN_5_MINS);
      }
    })();
  },

  bin: function(binType) {
    this.state.binning = true;
    var net = this;

    d3.select(".dnd").style("display", "block");
    d3.select(".dnd > .message").text("Binning links");
    d3.select("#resolution > .value").text(binType.label);
    this.timeStamps = [];
    this.binnedLinks = [];
    bins = {};

    var numLinks = this.rawLinks.length;
    var li = 0;
    (function binLoop() {
      for (var i=li; i<li+10000 && i<numLinks; i++) {
        var l = net.rawLinks[i];
        var bin = BINS.date(l.date, binType);
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
          net.timeStamps.push(new Date(t));

          // add links
          net.binnedLinks.push([]);
          for (var l in bins[t]) {
            net.binnedLinks[binIndex].push(bins[t][l]);
          }

          t.setTime( t.getTime() + diff );
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

        if (Dynamics.model != Dynamics.MODEL.none)
          Dynamics.on(net);
      }
    })();
  },

  // Displays the network's current state.
  show: function() {
    var net = this;

    // Update time
    dt = this.timeStamps[this.time.current];
    d3.select(".time").html(dt.toLocaleDateString() + " "
      + WEEKDAYS[net.timeStamps[net.time.current].getDay()] + " "
      + dt.toLocaleTimeString());

    // links
    var weight = Metrics.weights(this);
    var weightMax = d3.max(weight.values);
    this.svg.links = this.svg.links.data(net.links);
    this.svg.links.enter()
      .insert("line", ".node")
      .attr("class", "link")
      .attr("stroke-opacity", function(d){ return UI.network.link.strokeOpacity.min+UI.network.link.strokeOpacity.span*(d.weight/weightMax); })
      .attr("stroke-width", UI.network.link.strokeWidth);
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
      .attr("r", function(d){ return UI.network.node.r.min+UI.network.node.r.span*degree.values[d.index]/degMax; });
    DegreeDistribution.show(degree.dist);

    // other statistics
    StructuralDynamics.show(this.time.current);

    // dynamics
    Dynamics.update(this);
  },

  set: function(time) {
    if (time >= this.time.min && time <= this.time.max) {
      this.time.current = Math.floor(time);
      this.links = this.binnedLinks[this.time.current];
      this.show();
      return true;
    } else {
      return false;
    }
  }
};
