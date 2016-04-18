/**
 * The UI object containing look and feel related constants.
 */
var UI = {
  network: {
    node: {
      r: {min: 3, span: 4},
      opacity: {active: 1, inactive: 0.1},
      fill: {active: "#3399ff", inactive: "#000"}
    },
    link: {
      strokeOpacity: {min: 0.1, span: 0.9},
      strokeWidth: 1.5,
    },
    force: {
      charge: -150,
      linkDistance: 20,
      linkStrength: 0.6,
      gravity: 0.4,
      friction: 0.4
    }
  },

  histogram: {
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
  }
};
