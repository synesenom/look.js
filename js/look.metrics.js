/**
 * The dynamic manager object, responsible for all kinds of dynamics
 * on top of a the network.
 */
var Metrics = {
  degrees: function(g) {
    // get degrees
    var degrees = {};
    for (var i = 0; i < g.nodes.length; i++) {
      degrees[i] = 0;
    }
    g.links.forEach(function (d) {
      degrees[d.source.index]++;
      degrees[d.target.index]++;
    });

    // make distribution
    var dist = [];
    var xmax = d3.max(d3.values(degrees));
    for (var i=0; i<xmax+1; i++) dist.push(0);
    for (var i in degrees) {
      dist[degrees[i]]++;
    }
    Utils.extend(dist, 10);

    return {values: degrees, dist: dist};
  },

  weights: function(g) {
    // get weights
    var weights = [];
    for (var i = 0; i<g.links.length; i++) {
      weights.push(g.links[i].weight);
    }

    // make distribution
    var dist = []
    var xmax = d3.max(weights);
    for (var i=0; i<xmax; i++) dist.push(0);
    for (var i=0; i<weights.length; i++) {
      dist[weights[i]-1]++;
    }
    Utils.extend(dist, 10);

    return {values: weights, dist: dist};
  },

  components: function(g) {
    // create links

    groups = new Array(g.nodes.length).fill(-1);
    function dfs(n) {

    }
  }
};
