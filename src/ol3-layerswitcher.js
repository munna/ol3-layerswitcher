import Control from 'ol/control/Control';
import Observable from 'ol/Observable';

/**
 * OpenLayers Layer Switcher Control.
 * See [the examples](./examples) for usage.
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object} opt_options Control options, extends olx.control.ControlOptions adding:  
 * **`tipLabel`** `String` - the button tooltip.
 */
export default class LayerSwitcher extends Control {

    constructor(opt_options) {

        //Get options
        var options = opt_options || {};

        //Set default label
        var tipLabel = options.tipLabel ? options.tipLabel : 'Click to open legend';

        //Button event (click / hover)
        var event = options.event ? options.event : 'click';

        var element = document.createElement('div');

        super({element: element, target: options.target});

        var this_ = this;

        //Get layers
        this.layers = options.layers || null;

        //Stop if no layers
        if (this.layers === null || this.layers.length === 0)
            return;

        this.mapListeners = [];

        this.hiddenClassName = 'ol-unselectable layer-switcher';
        if (LayerSwitcher.isTouchDevice_()) {
            this.hiddenClassName += ' touch';
        }
        this.shownClassName = 'shown';
        
        element.className = this.hiddenClassName;

        //Create button 
        this.buttonContainer = document.createElement('div');
        this.buttonContainer.className = "button-container";

        var button = document.createElement('button');
        button.className = "toggle";
        button.setAttribute('title', tipLabel);
        button.setAttribute('alt', "Click to view map layers.");

        this.buttonContainer.appendChild(button);
        element.appendChild(this.buttonContainer);

        //Create panel for layer controls
        this.panel = document.createElement('div');
        this.panel.className = 'panel';

        //Create button for inside the panel to close it
        var panelHeaderContainer = document.createElement('div');
        panelHeaderContainer.className = "panel-header";

        var closeButton = document.createElement('button');
        closeButton.className = "panel-close";
        closeButton.setAttribute('title', "Close");
        button.setAttribute('alt', "Click to close layer options.");

        //Add span for closing X
        var span = document.createElement('span');
        closeButton.appendChild(span);
        closeButton.onclick = function (e) {
            e = e || window.event;
            this_.hidePanel();
        };

        panelHeaderContainer.appendChild(closeButton);
        this.panel.appendChild(panelHeaderContainer);

        //Layer panel
        this.layersContainer = document.createElement('div');
        this.layersContainer.className = "panel-layers";
        this.panel.appendChild(this.layersContainer);

        //Append to Panel
        element.appendChild(this.panel);
        LayerSwitcher.enableTouchScroll_(this.panel);

        this.onOpacityChange = options.onOpacityChange || null;
        this.onLayerToggle = options.onLayerToggle || null;

        switch (event) {
            case "hover":
                button.onmouseover = function (e) {
                    this_.showPanel();
                };

                this_.panel.onmouseout = function (e) {
                    e = e || window.event;
                    if (!this_.panel.contains(e.toElement || e.relatedTarget)) {
                        this_.hidePanel();
                    }
                };
                break;

            case "click":
                button.onclick = function (e) {
                    e = e || window.event;
                    this_.showPanel();
                    e.preventDefault();
                };
                break;
        }

    }

    /**
    * Set the map instance the control is associated with.
    * @param {ol.Map} map The map instance.
    */
    setMap(map) {
        // Clean up listeners associated with the previous map
        for (var i = 0, key; i < this.mapListeners.length; i++) {
            Observable.unByKey(this.mapListeners[i]);
        }
        this.mapListeners.length = 0;
        // Wire up listeners etc. and store reference to new map
        super.setMap(map);
        if (map) {
            var this_ = this;
            this.mapListeners.push(map.on('pointerdown', function() {
                this_.hidePanel();
            }));
            this.renderPanel();
        }
    }

    /**
    * Show the layer panel.
    */
    showPanel() {
        if (!this.element.classList.contains(this.shownClassName)) {
            this.element.classList.add(this.shownClassName);
            this.buttonContainer.classList.add("hide");
            this.renderPanel();
        }
    }

    /**
    * Hide the layer panel.
    */
    hidePanel() {
        if (this.element.classList.contains(this.shownClassName)) {
            this.element.classList.remove(this.shownClassName);
            this.buttonContainer.classList.remove("hide");
        }
    }

    /**
    * Re-draw the layer panel to represent the current state of the layers.
    */
    renderPanel() {
        LayerSwitcher.renderPanel(this.getMap(), this.panel);
    }

    /**
    * **Static** Re-draw the layer panel to represent the current state of the layers.
    * @param {ol.Map} map The OpenLayers Map instance to render layers for
    * @param {Element} panel The DOM Element into which the layer tree will be rendered
    */
    static renderPanel(map, panel) {

        LayerSwitcher.ensureTopVisibleBaseLayerShown_(map);

        while(panel.firstChild) {
            panel.removeChild(panel.firstChild);
        }

        var ul = document.createElement('ul');
        panel.appendChild(ul);
        // passing two map arguments instead of lyr as we're passing the map as the root of the layers tree
        LayerSwitcher.renderLayers_(map, map, ul);

    }

    /**
    * **Static** Ensure only the top-most base layer is visible if more than one is visible.
    * @param {ol.Map} map The map instance.
    * @private
    */
    static ensureTopVisibleBaseLayerShown_(map) {
        var lastVisibleBaseLyr;
        LayerSwitcher.forEachRecursive(map, function(l, idx, a) {
            if (l.get('type') === 'base' && l.getVisible()) {
                lastVisibleBaseLyr = l;
            }
        });
        if (lastVisibleBaseLyr) LayerSwitcher.setVisible_(map, lastVisibleBaseLyr, true);
    }

    /**
    * **Static** Toggle the visible state of a layer.
    * Takes care of hiding other layers in the same exclusive group if the layer
    * is toggle to visible.
    * @private
    * @param {ol.Map} map The map instance.
    * @param {ol.layer.Base} The layer whos visibility will be toggled.
    */
    static setVisible_(map, lyr, visible) {
        lyr.setVisible(visible);
        if (visible && lyr.get('type') === 'base') {
            // Hide all other base layers regardless of grouping
            LayerSwitcher.forEachRecursive(map, function(l, idx, a) {
                if (l != lyr && l.get('type') === 'base') {
                    l.setVisible(false);
                }
            });
        }
    }

    /**
    * **Static** Render all layers that are children of a group.
    * @private
    * @param {ol.Map} map The map instance.
    * @param {ol.layer.Base} lyr Layer to be rendered (should have a title property).
    * @param {Number} idx Position in parent group list.
    */
    static renderLayer_ = function (map, lyr, idx) {

        var li = document.createElement('li');

        var lyrTitle = lyr.get('title');
        var lyrId = LayerSwitcher.uuid();

        var label = document.createElement('label');

        if (lyr.getLayers && !lyr.get('combine')) {

            li.className = 'group';
            label.innerHTML = lyrTitle;
            li.appendChild(label);
            var ul = document.createElement('ul');
            li.appendChild(ul);

            LayerSwitcher.renderLayers_(map, lyr, ul);

        } else {

            li.className = 'layer';

            //Container holds inputs and label
            var container = document.createElement('div'),
                input = document.createElement('input'),
                input_o = document.createElement('input');

            container.className = 'layer-control';

            if (lyr.get('type') === 'base') {
                input.type = 'radio';
                input.name = 'base';
            } else {
                input.type = 'checkbox';
            }

            input.id = lyrId;
            input.checked = lyr.get('visible');
            input.onchange = function (e) {
                LayerSwitcher.setVisible_(map, lyr, e.target.checked);

                if (LayerSwitcher.onLayerToggle !== null && typeof LayerSwitcher.onLayerToggle === "function") {
                    LayerSwitcher.onLayerToggle(e.target.checked, lyr);
                }
            };

            container.appendChild(input);

            label.htmlFor = lyrId;
            label.innerHTML = lyrTitle;

            var rsl = map.getView().getResolution();
            if (rsl > lyr.getMaxResolution() || rsl < lyr.getMinResolution()) {
                label.className += ' disabled';
            }

            container.appendChild(label);

            // opacity slider (true|false)
            if (lyr.get('opacityToggle') === true) {
                input_o.type = 'range';
                input_o.className = 'opacity';
                input_o.min = 0;
                input_o.max = 1;
                input_o.step = 0.01;
                input_o.value = lyr.getOpacity();
                input_o.onchange = function (e) {
                    lyr.setOpacity(e.target.value);

                    if (LayerSwitcher.onOpacityChange !== null && typeof LayerSwitcher.onOpacityChange === "function") {
                        LayerSwitcher.onOpacityChange(e.target.value, lyr);
                    }

                };
                container.appendChild(input_o);
            }

            li.appendChild(container);

            //Add legend if present
            if (lyr.get('legend')) {
                var legend = document.createElement('div');
                legend.className = 'legend' + (lyr.get('legendToggle') === true ? ' legend-hidden' : '');
                legend.innerHTML = lyr.get('legend');
                li.appendChild(legend);

                //Add button to toggle visibility
                if (lyr.get('legendToggle') === true) {
                    var legendToggle = document.createElement('button');
                    legendToggle.className = 'legend-toggle';
                    legendToggle.title = "Toggle legend";
                    legendToggle["aria-expanded"] = false;
                    legendToggle["aria-label"] = "Toggle legend";

                    var bar = document.createElement('span');
                    bar.className = 'bar1';

                    var bar2 = document.createElement('span');
                    bar2.className = 'bar2';

                    var bar3 = document.createElement('span');
                    bar3.className = 'bar3';

                    var sr = document.createElement('span');
                    sr.className = 'sr-only';

                    legendToggle.onclick = function(e) {
                        e = e || window.event;
                        e.preventDefault();
                        legendToggle.classList.toggle("open");
                        legend.classList.toggle("legend-hidden");
                    };

                    legendToggle.appendChild(sr);
                    legendToggle.appendChild(bar);
                    legendToggle.appendChild(bar2);
                    legendToggle.appendChild(bar3);

                    container.insertBefore(legendToggle, container.childNodes[0]);
                }
            }


        }

        return li;
    };

    /**
    * **Static** Render all layers that are children of a group.
    * @private
    * @param {ol.Map} map The map instance.
    * @param {ol.layer.Group} lyr Group layer whos children will be rendered.
    * @param {Element} elm DOM element that children will be appended to.
    */
    static renderLayers_(map, lyr, elm) {
        var lyrs = lyr.getLayers().getArray().slice().reverse();
        for (var i = 0, l; i < lyrs.length; i++) {
            l = lyrs[i];
            if (l.get('title')) {
                elm.appendChild(LayerSwitcher.renderLayer_(map, l, i));
            }
        }
    }

    /**
    * **Static** Call the supplied function for each layer in the passed layer group
    * recursing nested groups.
    * @param {ol.layer.Group} lyr The layer group to start iterating from.
    * @param {Function} fn Callback which will be called for each `ol.layer.Base`
    * found under `lyr`. The signature for `fn` is the same as `ol.Collection#forEach`
    */
    static forEachRecursive(lyr, fn) {
        lyr.getLayers().forEach(function(lyr, idx, a) {
            fn(lyr, idx, a);
            if (lyr.getLayers) {
                LayerSwitcher.forEachRecursive(lyr, fn);
            }
        });
    }

    /**
    * **Static** Generate a UUID  
    * Adapted from http://stackoverflow.com/a/2117523/526860
    * @returns {String} UUID
    */
    static uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }

    /**
    * @private
    * @desc Apply workaround to enable scrolling of overflowing content within an
    * element. Adapted from https://gist.github.com/chrismbarr/4107472
    */
    static enableTouchScroll_(elm) {
        if(LayerSwitcher.isTouchDevice_()){
            var scrollStartPos = 0;
            elm.addEventListener("touchstart", function(event) {
                scrollStartPos = this.scrollTop + event.touches[0].pageY;
            }, false);
            elm.addEventListener("touchmove", function(event) {
                this.scrollTop = scrollStartPos - event.touches[0].pageY;
            }, false);
        }
    }

    /**
    * @private
    * @desc Determine if the current browser supports touch events. Adapted from
    * https://gist.github.com/chrismbarr/4107472
    */
    static isTouchDevice_() {
        try {
            document.createEvent("TouchEvent");
            return true;
        } catch(e) {
            return false;
        }
    }

}

// Expose LayerSwitcher as ol.control.LayerSwitcher if using a full build of
// OpenLayers
if (window.ol && window.ol.control) {
    window.ol.control.LayerSwitcher = LayerSwitcher;
}
