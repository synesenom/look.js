/**
 * The dynamic manager object, responsible for all kinds of dynamics
 * on top of a the network.
 */
var DYNAMICS = {
  MODEL: {
    none: "none",
    sis: "sis",
    sir: "sir"
  },
  params: null,
  status: null,
  model: "none",

  // highlights a node
  highlight: function(id) {
    var r = d3.select(".node-"+id).attr("r");
    d3.select(".node-"+id)
      .attr("r", 20)
      .transition().duration(200)
      .attr("r", r);
  },

  switchModel: function(g, params) {
    switch (this.model) {
      case this.MODEL.none:
        this.model = this.MODEL.sis;
        this.on(g, params);
        break;
      case this.MODEL.sis:
        this.model = this.MODEL.sir;
        this.on(g, params);
        break;
      case this.MODEL.sir:
        this.model = this.MODEL.none;
        this.off();
        break;
    }
    return this.model;
  },

  // Sets parameters
  set: function(params) {
    this.params = params;
  },

  // Sets parameters and initializes node states
  on: function(g, params) {
    // set parameters
    this.params = params;

    // init states
    this.status = {};
    for (var i=0; i<g.nodes.length; i++) {
      var infect = Math.random() < 0.2;
      this.status[g.nodes[i].id] = infect ? 1 : 0;
      d3.select(".node-"+g.nodes[i].id)
        .classed("susceptible", !infect)
        .classed("infected", infect);
    }
    Proc.on(Proc.DYNAMICS);
  },

  off: function() {
    d3.selectAll(".node")
      .classed("susceptible", false)
      .classed("infected", false)
      .classed("recovered", false);
    Proc.off(Proc.DYNAMICS);
  },

  update: function(g) {
    console.log(this.params);
    switch (this.model) {
      case this.MODEL.sis:
        this.sis(g);
        break;
      case this.MODEL.sir:
        this.sir(g);
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
    for (var i=0; i<g.nodes.length; i++) {
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
    for (var i=0; i<g.nodes.length; i++) {
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
