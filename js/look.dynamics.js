var TREND_MAX = 200;
var CURVES = {
  i: {
    color: "crimson",
    name: "infected",
    labelShift: 0
  },
  r: {
    color: "yellowgreen",
    name: "recovered",
    labelShift: 48
  }
};

/**
 * The dynamic manager object, responsible for all kinds of dynamics
 * on top of a the network.
 */
var Dynamics = {
  MODEL: {
    none: "none",
    sis: "sis",
    sir: "sir"
  },
  params: null,
  status: null,
  model: "none",
  plot: {
    data: null,
    svg: null,
    scale: null,
    axes: null,
    line: null,
    path: null,
    width: 160,
    height: 60,
    margin: {left: 28, right: 10, top: 30, bottom: 35}
  },
  size: 1,
  data: null,
  time: 0,

  // highlights a node
  highlight: function(id) {
    var r = d3.select(".node-"+id).attr("r");
    d3.select(".node-"+id)
      .attr("r", 20)
      .transition().duration(200)
      .attr("r", r);
  },

  measure: function() {
    switch (this.model) {
      case this.MODEL.sis:
        var iCount = d3.selectAll(".infected");
        return {
          t: this.time,
          y: {
            i: iCount ? iCount[0].length/this.size : 0
          }
        };
      case this.MODEL.sir:
        var iCount = d3.selectAll(".infected");
        var rCount = d3.selectAll(".recovered");
        return {
          t: this.time,
          y: {
            i: iCount ? iCount[0].length/this.size : 0,
            r: rCount ? rCount[0].length/this.size : 0
          }
        };
    }
  },

  trend: function() {
    if (!this.plot.svg) {
      // set time and clear data
      this.time = 0;
      var m = this.measure();
      var data = this.data = [m];

      // create svg and add elements
      var p = this.plot;
      var svg = this.plot.svg = d3.select("#dynamics-statistics")
        .attr("width", p.width + p.margin.left + p.margin.right)
        .attr("height", p.height + p.margin.bottom + p.margin.top)
        .append("g")
        .attr("transform", "translate(" + p.margin.left + "," + p.margin.top + ")");
      var scale = this.plot.scale = {
        x: d3.scale.linear()
          .domain([0, TREND_MAX])
          .range([0, p.width]),
        y: d3.scale.linear()
          .domain([0, 1])
          .range([p.height, 0])
      };
      var axes = this.plot.axes = {
        x: d3.svg.axis()
            .scale(scale.x)
            .orient("bottom")
            .ticks(4),
        y: d3.svg.axis()
            .scale(scale.y)
            .orient("left")
            .ticks(4)
      };
      svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (p.height+1) + ")")
        .call(axes.x);
      svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(0," + 1 + ")")
        .call(axes.y);
      svg.append("text")
        .attr("class", "x axis-label")
        .attr("text-anchor", "end")
        .attr("x", p.width)
        .attr("y", p.height + 30)
        .text("elapsed time");
      svg.append("text")
        .attr("class", "y axis-label")
        .attr("text-anchor", "begin")
        .attr("y", -5)
        .text("frac.");

      // add plot
      var line = this.plot.line = {};
      for (var y in m.y) {
        // add labels
        Plot.addText(svg, p.width-CURVES[y].labelShift, 0, CURVES[y].name, CURVES[y].color);

        // create lines and add plots
        (function(y_) {
        line[y_] = d3.svg.line()
          .x(function(d) { return scale.x(d.t); })
          .y(function(d) { return scale.y(d.y[y_]); })
        svg.append("path")
          .attr("d", line[y_](data))
          .attr("stroke", CURVES[y_].color)
          .attr("class", "dynamics-statistics-"+CURVES[y_].name);
        })(y);
      }
    } else {
      // update data
      this.time++;
      var m = this.measure();
      this.data.push(m);
      if (this.data.length > TREND_MAX)
        this.data.shift();
      var data = this.data;

      // update scale, axes
      if (data.length < TREND_MAX)
        this.plot.scale.x.domain([0, TREND_MAX]);
      else
        this.plot.scale.x.domain([d3.min(data, function(d){ return d.t; }), d3.max(data, function(d){ return d.t; })]);
      var scale = this.plot.scale;
      var axes = this.plot.axes;
      this.plot.svg.select(".x.axis")
        .transition().duration(AUTO_PLAY_DT_IN_MILLISEC)
        .call(axes.x);

      // update plot
      var line = this.plot.line;
      for (var y in m.y) {
        line[y].x(function(d) { return scale.x(d.t); });
        this.plot.svg.select(".dynamics-statistics-"+CURVES[y].name)
          .transition().duration(AUTO_PLAY_DT_IN_MILLISEC)
          .attr("d", line[y](data));
      }
    }
  },

  switchModel: function(g) {
    switch (this.model) {
      case this.MODEL.none:
        $("#dynamics > .settings").animate({"height": "230px"}, 200);
        this.model = this.MODEL.sis;
        this.on(g);
        break;
      case this.MODEL.sis:
        $("#dynamics > .settings").animate({"height": "230px"}, 200);
        this.model = this.MODEL.sir;
        this.on(g);
        break;
      case this.MODEL.sir:
        $("#dynamics > .settings").animate({"height": "0px"}, 200, function(){
          Dynamics.off();
        });
        this.model = this.MODEL.none;
        break;
    }
    d3.select("#dynamics-model").text(this.model);
    return this.model;
  },

  // Sets parameters
  set: function(params) {
    this.params = params;
  },

  // Sets parameters and initializes node states
  on: function(g) {
    // clean up previous stuff
    this.off();
    this.size = g.nodes.length;

    // init states
    this.status = {};
    for (var i=0; i<this.size; i++) {
      var infect = Math.random() < 0.2;
      this.status[g.nodes[i].id] = infect ? 1 : 0;
      d3.select(".node-"+g.nodes[i].id)
        .classed("susceptible", !infect)
        .classed("infected", infect)
        .classed("recovered", false);
    }

    // set plot
    this.trend();
  },

  off: function() {
    // remove states
    d3.selectAll(".node")
      .classed("susceptible", false)
      .classed("infected", false)
      .classed("recovered", false);

    // destroy trend
    if (this.plot.svg) {
      this.plot.svg.remove();
      this.plot.svg = null;
    }
  },

  update: function(g) {
    switch (this.model) {
      case this.MODEL.sis:
        this.sis(g);
        this.trend();
        break;
      case this.MODEL.sir:
        this.sir(g);
        this.trend();
        break;
    }
  },

  sis: function(g) {
    // next states (changes only)
    var next = {};

    // infections
    var w, s, t;
    for (var i=0; i<g.links.length; i++) {
      s = g.links[i].source.id;
      t = g.links[i].target.id;
      if (this.status[s] != this.status[t] && Math.random() < this.params.beta) {
        next[s] = 1;
        next[t] = 1;
      }
    }

    // recoveries
    for (var i=0; i<this.size; i++) {
      if (this.status[g.nodes[i].id] == 1 && Math.random() < this.params.gamma) {
        next[g.nodes[i].id] = 0;
      }
    }

    // update status
    for (var id in next) {
      // change color
      d3.select(".node-"+id)
        .classed("susceptible", next[id] == 0)
        .classed("infected", next[id] == 1);

      // highlight changes
      if (this.status[id] == 0 && next[id] == 1)
        this.highlight(id);

      // update status array
      this.status[id] = next[id];
    }
  },

  sir: function(g) {
    // next states
    var next = {};

    // infections
    var w, s, t;
    for (var i=0; i<g.links.length; i++) {
      s = g.links[i].source.id;
      t = g.links[i].target.id;
      if (this.status[s] + this.status[t] == 1 && Math.random() < this.params.beta) {
        next[s] = 1;
        next[t] = 1;
      }
    }

    // recoveries
    for (var i=0; i<this.size; i++) {
      if (this.status[g.nodes[i].id] == 1 && Math.random() < this.params.gamma) {
        next[g.nodes[i].id] = 2;
      }
    }

    // update status
    for (var id in next) {
      d3.select(".node-"+id)
        .classed("susceptible", next[id] == 0)
        .classed("infected", next[id] == 1)
        .classed("recovered", next[id] == 2);

      // highlight changes
      if (this.status[id] == 0 && next[id] == 1)
        this.highlight(id);

      // update status array
      this.status[id] = next[id];
    }
  }
}
