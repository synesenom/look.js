/**
 * This script contains objects responsible for various plots.
 */
 var SAMPLE_NUMBER_MAX = 500;

/**
 * Object that encapsulates methods generating several elements of a plot.
 */
var Plot = {
  UI: {
    width: 200,
    height: 60,
    margin: {left: 40, right: 15, top: 16, bottom: 35},
    barPadding: 1,
    xTicks: 8,
    yTicks: 3,
    color: {
      links: "#999",
      nodes: "#3399ff"
    }
  },

  svg: function(id, dimensions) {
    return d3.select(id)
      .attr("width", Plot.UI.width + Plot.UI.margin.left + Plot.UI.margin.right)
      .attr("height", Plot.UI.height + Plot.UI.margin.bottom + Plot.UI.margin.top)
      .append("g")
      .attr("transform", "translate(" + Plot.UI.margin.left + "," + Plot.UI.margin.top + ")");
  },

  scale: function(data, type, alpha) {
    switch(type) {
      case "linlin":
        return {
          x: d3.scale.linear()
            .domain([0, data.length*alpha])
            .range([0, Plot.UI.width]),
          y: d3.scale.linear()
            .domain([0, d3.max(data)])
            .range([Plot.UI.height, 0])
        };
      case "loglog":
        return {
          x: d3.scale.log()
            .domain([1, data.length*alpha])
            .range([0, Plot.UI.width]),
          y: d3.scale.log()
            .domain([1, d3.max(data)])
            .range([Plot.UI.height, 0])
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
      .attr("transform", "translate(0," + (Plot.UI.height+1) + ")")
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
      .attr("x", Plot.UI.width)
      .attr("y", Plot.UI.height + 30)
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
      .attr("y2", Plot.UI.height + 1)
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

  show: function(data) {
    // create svg if it doesn't exist
    if (!this.svg) {
      // create svg and add elements
      this.svg = Plot.svg("#degree-dist");
      var scale = this.scale = Plot.scale(data, "linlin", 1);
      this.axes = Plot.axes(this.scale, "linlin", Plot.UI.xTicks, Plot.UI.yTicks);
      Plot.addAxes(this.svg, this.axes);
      Plot.addLabels(this.svg, "degree", "freq");

      // add plot
      this.svg.selectAll(".degree-dist-bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "degree-dist-bar")
        .attr("x", function(d, i) { return scale.x(i) + Plot.UI.barPadding; })
        .attr("y", function(d) { return scale.y(d) + 1; })
        .attr("width", Plot.UI.width / data.length - Plot.UI.barPadding)
        .attr("height", function(d) { return Plot.UI.height - scale.y(d); });
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
        .attr("x", function(d, i) { return scale.x(i) + Plot.UI.barPadding; })
        .attr("y", function(d) { return scale.y(d) + 1; })
        .attr("width", Plot.UI.width / data.length - Plot.UI.barPadding)
        .attr("height", function(d) { return Plot.UI.height - scale.y(d); });
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

  show: function(data) {
    // create svg if it doesn't exist
    if (!this.svg) {
      // create svg and add elements
      this.svg = Plot.svg("#weight-dist");
      var scale = this.scale = Plot.scale(data, "loglog", 1);
      this.axes = Plot.axes(this.scale, "loglog", Plot.UI.xTicks, Plot.UI.yTicks);
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
  ghostMarker: null,

  create: function(g) {
    // sample rate (to avoid huge paths)
    var sampleRate = g.time.max > SAMPLE_NUMBER_MAX ? Math.ceil(g.time.max/SAMPLE_NUMBER_MAX) : 1;

    // get normalized data
    this.data = {links: [], nodes: []};
    for (var t=g.time.min; t<=g.time.max; t++) {
      if (t % sampleRate == 0) {
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
    }

    // normalize data
    max = {
      links: d3.max(this.data.links),
      nodes: d3.max(this.data.nodes)
    };
    for (var t=0; t<this.data.links.length; t++) {
      this.data.links[t] /= max.links;
      this.data.nodes[t] /= max.nodes;
    }

    // create svg and add elements
    if(this.svg) {
      this.svg.remove();
    }
    var svg = this.svg = Plot.svg("#structural-dynamics");
    var scale = this.scale = Plot.scale(this.data.links, "linlin", sampleRate);
    this.axes = Plot.axes(this.scale, "linlin", 4, 3);
    Plot.addAxes(this.svg, this.axes);
    Plot.addLabels(this.svg, "time", "rel. intensity");
    Plot.addText(this.svg, Plot.UI.width-24, 0, "node", Plot.UI.color.nodes);
    Plot.addText(this.svg, Plot.UI.width, 0, "link", Plot.UI.color.links);

    // line
    var line = d3.svg.line()
      .interpolate("basis")
      .x(function(d, i) { return scale.x(i*sampleRate); })
      .y(function(d) { return scale.y(d) + 1; });

    // add curves
    for (var curve in this.data) {
      var data = this.data[curve];
      this.svg.append("path")
        .attr("d", line(data))
        .attr("stroke", Plot.UI.color[curve])
        .attr("class", "structural-dynamics-" + curve);
    }

    // marker
    var m = this.marker = Plot.verticalMarker(this.svg, scale, 0);

    // ghost marker
    var gm = this.ghostMarker = svg.append("line")
      .attr("x1", scale.x(0))
      .attr("y1", 1)
      .attr("x2", scale.x(0))
      .attr("y2", Plot.UI.height + 1)
      .style("stroke-width", 1)
      .style("stroke", "crimson")
      .style("opacity", 0.2)
      .style("display", "none");
    this.svg.append("rect")
      .attr("class", "plot-overlay")
      .attr("width", Plot.UI.width)
      .attr("height", Plot.UI.height)
      .on("mouseover", function(){ gm.style("display", null); })
      .on("mouseout", function() { gm.style("display", "none"); })
      .on("click", function(){
        AutoPlay.off();
        Network.set(scale.x.invert(d3.mouse(this)[0]));
      })
      .on("mousemove", function() {
        var x0 = Math.round(scale.x.invert(d3.mouse(this)[0]));
        gm.attr("x1", scale.x(x0))
          .attr("x2", scale.x(x0));
      });
  },

  show: function(t) {
    var x = this.scale.x(t);
    this.marker
      .attr("x1", x)
      .attr("x2", x);
  }
};

