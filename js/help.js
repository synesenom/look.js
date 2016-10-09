/*
 * Creates a help menu in the center of the screen that can be turned on/off by pressing 'h'.
 */
var Help = {
  _isInit: false,
  _isOn: false,
  _width: 400,
  _height: 320,
  _padding: 20,
  _style: {
    help: {
      "position": "fixed",
      "width": "100%",
      "height": "100%",
      "top": "0px",
      "left": "0px",
      "background-color": "rgba(255, 255, 255, 0.9)",
      "display": "none",
      "opacity": 0
    },
    wrapper: {
      "position": "absolute",
      "top": "50%",
      "left": "50%",
      "width": "400px",
      "height": "320px",
      "padding": "20px",
      "margin-left": "-220px",
      "margin-top": "-170px",
      "box-shadow": "1px 1px 2px gray",
      "background-color": "rgba(255, 255, 255, 0.5)",
      "border": "1px solid rgba(0, 0, 0, 0.1)",
      "border-radius": 2
    },
    box: {
      "height": "320px",
      "font-size": "11pt",
      "font-weight": "200",
      "color": "black",
      "text-align": "justify",
      "overflow": "scroll"
    },
    content: {
      "position": "relative"
    }
  },
  _wrapper: null,
  _box: null,
  _content: null,

  init: function() {
    if (!this._isInit) {
      // set init to true
      this._isInit = true;

      // add DOM elements
      var help = d3.select("body")
        .append("div")
        .attr("id", "help")
        .style(Help._style.help);
      this._wrapper = help.append("div")
        .style(Help._style.wrapper);
      this._box = this._wrapper.append("div")
        .style(Help._style.box);
      this._content = this._box.append("div")
        .attr("class", "content")
        .style(Help._style.content);

      // set key events
      d3.select("body").on("keydown", function() {
        switch(d3.event.which) {
          case 72:
            if (Help.on())
              Help.off();
            break;
          case 27:
            Help.off();
            break;
        }
      });
      d3.select("#help").on("click", function(){
        Help.off();
      });
    }
  },

  width: function(width) {
    this.init();
    this._width = width;
    this._style.box.width = width + "px";
    this._style.box['margin-left'] = (-width/2-this._padding) + "px";
    this._box.style(Help._style.box);
    return this;
  },

  height: function(height) {
    this.init();
    this._height = height;
    this._style.box.height = height + "px";
    this._style.box['margin-top'] = (-height/2-this._padding) + "px";
    this._box.style(Help._style.box);
    return this;
  },

  padding: function(padding) {
    this.init();
    this._padding = padding;
    this._style.box.padding = padding + "px";
    this._style.box['margin-left'] = (-this._width/2-padding) + "px";
    this._style.box['margin-top'] = (-this._height/2-padding) + "px";
    this._box.style(Help._style.box);
    return this;
  },

  content: function(content) {
    this.init();
    this._content.html(content);
    return this;
  },

  on: function() {
    if (!this._isOn) {
      this._isOn = true;
      d3.select("#help").style("display", "block")
        .transition().duration(500)
        .style("opacity", 1);
      return false;
    } else
      return true;
  },

  off: function() {
    this._isOn = false;
    d3.select("#help")
      .transition().duration(500)
      .style("opacity", 0)
      .each("end", function() {
        d3.select("#help").style("display", "none");
      });
  },

  is: function() {
    return this._isOn;
  }
};
