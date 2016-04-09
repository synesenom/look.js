/**
 * This script contains objects responsible for various plots.
 */

/**
 * Object that encapsulates methods generating several elements of a plot.
 */
var Plot = {
  svg: function(id) {
    return d3.select(id)
      .attr("width", UI.histogram.width + UI.histogram.margin.left + UI.histogram.margin.right)
      .attr("height", UI.histogram.height + UI.histogram.margin.bottom + UI.histogram.margin.top)
      .append("g")
      .attr("transform", "translate(" + UI.histogram.margin.left + "," + UI.histogram.margin.top + ")");
  },

  scale: function(data, type) {
    switch(type) {
      case "linlin":
        return {
          x: d3.scale.linear()
            .domain([0, data.length])
            .range([0, UI.histogram.width]),
          y: d3.scale.linear()
            .domain([0, d3.max(data)])
            .range([UI.histogram.height, 0])
        };
      case "loglog":
        return {
          x: d3.scale.log()
            .domain([1, data.length])
            .range([0, UI.histogram.width]),
          y: d3.scale.log()
            .domain([1, d3.max(data)])
            .range([UI.histogram.height, 0])
        };
    }
  },

  axes: function(scale, type, xTicks, yTicks) {
    var axes = {
      x: d3.svg.axis()
          .scale(scale.x)
          .orient("bottom"),
      y: d3.svg.axis()
          .scale(scale.y)
          .orient("left")
    };
    switch(type) {
      case "linlin":
        axes.x.ticks(xTicks);
        axes.y.ticks(yTicks);
        break;
      case "loglog":
        axes.x.ticks(0, ".1s");
        axes.y.ticks(0, ".1s");
        break;
    }
    return axes;
  },

  addAxes: function(svg, axes) {
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + (UI.histogram.height+1) + ")")
      .call(axes.x);
    svg.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(0," + 1 + ")")
      .call(axes.y);
  },

  addLabels: function(svg, xLabel, yLabel) {
    svg.append("text")
      .attr("class", "x axis-label")
      .attr("text-anchor", "end")
      .attr("x", UI.histogram.width)
      .attr("y", UI.histogram.height + 30)
      .text(xLabel);
    svg.append("text")
      .attr("class", "y axis-label")
      .attr("text-anchor", "begin")
      .attr("y", -5)
      .text(yLabel);
  },

  addText: function(svg, x, y, text, color) {
    return svg.append("text")
      .attr("class", "histogram-label")
      .attr("stroke", color)
      .attr("text-anchor", "end")
      .attr("x", x)
      .attr("y", y-5)
      .text(text);
  },

  verticalMarker: function(svg, scale, x) {
    return svg.append("line")
      .attr("x1", scale.x(x))
      .attr("y1", 1)
      .attr("x2", scale.x(x))
      .attr("y2", UI.histogram.height + 1)
      .style("stroke-width", 1)
      .style("stroke", "crimson")
      .style("fill", "none");
  }
};


/**
 * Degree distribution calculator and plot handler.
 */
var DegreeDistribution = {
  svg: null,
  axes: {x: null, y: null},
  scale: {x: null, y: null},

  get: function(g) {
    // get degrees
    var degrees = {};
    for (var i = 0; i < g.nodes.length; i++) {
      degrees[i] = 0;
    }
    g.links.forEach(function (d) {
      degrees[d.source.index]++;
      degrees[d.target.index]++;
    });

    // make histogram
    var dist = [];
    var xmax = d3.max(d3.values(degrees));
    for (var i=0; i<xmax+1; i++) dist.push(0);
    for (var i in degrees) {
      dist[degrees[i]]++;
    }
    Utils.extend(dist, 10);

    return {values: degrees, dist: dist};
  },

  show: function(data) {
    // create svg if it doesn't exist
    if (!this.svg) {
      // create svg and add elements
      this.svg = Plot.svg("#degree-dist");
      var scale = this.scale = Plot.scale(data, "linlin");
      this.axes = Plot.axes(this.scale, "linlin", UI.histogram.xTicks, UI.histogram.yTicks);
      Plot.addAxes(this.svg, this.axes);
      Plot.addLabels(this.svg, "degree", "freq");

      // add plot
      this.svg.selectAll(".degree-dist-bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "degree-dist-bar")
        .attr("x", function(d, i) { return scale.x(i) + UI.histogram.barPadding; })
        .attr("y", function(d) { return scale.y(d) + 1; })
        .attr("width", UI.histogram.width / data.length - UI.histogram.barPadding)
        .attr("height", function(d) { return UI.histogram.height - scale.y(d); });
    } else {
      // update scale, axes and bars
      var scale = {
        x: this.scale.x.domain([0, data.length]),
        y: this.scale.y.domain([0, d3.max(data)])
      };
      var axes = this.axes;
      this.svg.select(".x.axis")
        .transition().duration(AUTO_PLAY_DT_IN_MILLISEC)
        .call(axes.x);
      this.svg.select(".y.axis")
        .transition().duration(AUTO_PLAY_DT_IN_MILLISEC)
        .call(axes.y);

      var bars = this.svg.selectAll(".degree-dist-bar")
        .data(data);
      bars.enter().append("rect")
        .attr("class", "degree-dist-bar");
      bars
        .transition().duration(AUTO_PLAY_DT_IN_MILLISEC)
        .attr("x", function(d, i) { return scale.x(i) + UI.histogram.barPadding; })
        .attr("y", function(d) { return scale.y(d) + 1; })
        .attr("width", UI.histogram.width / data.length - UI.histogram.barPadding)
        .attr("height", function(d) { return UI.histogram.height - scale.y(d); })
      bars.exit()
        .transition().duration(AUTO_PLAY_DT_IN_MILLISEC)
        .attr("height", 0)
        .remove();
    }
  }
};


/**
 * Link weight distribution calculator and plot handler.
 */
var WeightDistribution = {
  svg: null,
  axes: {x: null, y: null},
  scale: {x: null, y: null},
  line: null,

  get: function(g) {
    // get weights
    var weights = [];
    for (var i = 0; i<g.links.length; i++) {
      weights.push(g.links[i].weight);
    }

    // make histogram
    var dist = []
    var xmax = d3.max(weights);
    for (var i=0; i<xmax; i++) dist.push(0);
    for (var i=0; i<weights.length; i++) {
      dist[weights[i]-1]++;
    }

    // expand if necessary
    if (dist.length < 10) {
      for (var i=dist.length; i<10; i++)
        dist.push(0);
    }

    return {values: weights, dist: dist};
  },

  show: function(data) {
    // create svg if it doesn't exist
    if (!this.svg) {
      // create svg and add elements
      this.svg = Plot.svg("#weight-dist");
      var scale = this.scale = Plot.scale(data, "loglog");
      this.axes = Plot.axes(this.scale, "loglog", UI.histogram.xTicks, UI.histogram.yTicks);
      Plot.addAxes(this.svg, this.axes);
      Plot.addLabels(this.svg, "link weight", "freq");

      // add plot
      var line = this.line = d3.svg.line()
        .x(function(d, i) { return scale.x(i+1); })
        .y(function(d) { return d > 0 ? scale.y(d) + 1 : scale.y(1) + 1; })
        .interpolate('basis');
      this.svg.append("path")
        .attr("d", line(data))
        .attr("stroke", "#3399ff")
        .attr("class", "weight-dist-line");
    } else {
      // update scale, axes and bars
      var scale = {
        x: this.scale.x.domain([1, data.length]),
        y: this.scale.y.domain([1, d3.max(data)])
      };
      var axes = this.axes;
      this.svg.select(".x.axis")
        .transition().duration(AUTO_PLAY_DT_IN_MILLISEC)
        .call(axes.x);
      this.svg.select(".y.axis")
        .transition().duration(AUTO_PLAY_DT_IN_MILLISEC)
        .call(axes.y);

      var line = this.line
        .x(function(d, i) { return scale.x(i+1); })
        .y(function(d) { return d > 0 ? scale.y(d) + 1 : scale.y(1) + 1; });
      this.svg.select(".weight-dist-line")
        .transition().duration(AUTO_PLAY_DT_IN_MILLISEC)
        .attr("d", line(data));
    }
  }
}


/**
 * Structural dynamics descriptors calculator and plot handler.
 */
var StructuralDynamics = {
  svg: null,
  axes: {x: null, y: null},
  scale: {x: null, y: null},
  line: {},
  data: {},
  marker: null,

  create: function(g) {
    // get normalized data
    this.data = {links: [], nodes: []};
    for (var t=g.time.min; t<=g.time.max; t++) {
      // links
      this.data.links.push(g.binnedLinks[t].length);

      // nodes
      var nodes = {};
      g.binnedLinks[t].forEach(function(d){
        nodes[d.source.id] = 1;
        nodes[d.target.id] = 1;
      });
      this.data.nodes.push(Object.keys(nodes).length);
    }

    // normalize data
    max = {
      links: d3.max(this.data.links),
      nodes: d3.max(this.data.nodes)
    };
    for (var t=g.time.min; t<=g.time.max; t++) {
      this.data.links[t] /= max.links;
      this.data.nodes[t] /= max.nodes;
    }

    // create svg and add elements
    if(this.svg) {
      this.svg.remove();
    }
    this.svg = Plot.svg("#structural-dynamics");
    var scale = this.scale = Plot.scale(this.data.links, "linlin");
    this.axes = Plot.axes(this.scale, "linlin", 4, 3);
    Plot.addAxes(this.svg, this.axes);
    Plot.addLabels(this.svg, "time", "rel. intensity");
    Plot.addText(this.svg, UI.histogram.width-24, 0, "node", UI.histogram.color.nodes);
    Plot.addText(this.svg, UI.histogram.width, 0, "link", UI.histogram.color.links);

    // line
    var line = d3.svg.line()
      .interpolate("basis")
      .x(function(d, i) { return scale.x(i); })
      .y(function(d) { return scale.y(d) + 1; });

    // add curves
    for (var curve in this.data) {
      var data = this.data[curve];
      this.svg.append("path")
        .attr("d", line(data))
        .attr("stroke", UI.histogram.color[curve])
        .attr("class", "structural-dynamics-" + curve);
    }

    this.marker = Plot.verticalMarker(this.svg, scale, 10);
  },

  show: function(t) {
    var scale = this.scale;
    this.marker
      .transition().duration(AUTO_PLAY_DT_IN_MILLISEC)
      .attr("x1", scale.x(t))
      .attr("x2", scale.x(t));
  }
};

