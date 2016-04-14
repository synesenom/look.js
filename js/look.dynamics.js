/**
 * The dynamic manager object, responsible for all kinds of dynamics
 * on top of a the network.
 */
var DYNAMICS = {
  params: null,
  status: null,

  // Sets parameters and initializes node states
  on: function(g, params, bin) {
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

  off: function(g) {
    d3.selectAll(".node")
      .classed("susceptible", false)
      .classed("infected", false);
    Proc.off(Proc.DYNAMICS);
  },

  sis: function(g) {
    // next states
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
      this.status[id] = next[id];
      d3.select(".node-"+id)
        .classed("susceptible", next[id] == 0)
        .classed("infected", next[id] == 1);
    }
  }
}
