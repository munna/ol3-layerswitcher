# OpenLayers LayerSwitcher

Forked version of Matt Walker's Layer Switcher: https://github.com/walkermatt/ol3-layerswitcher

Also includes SooKoll's fork which added opacity sliders https://github.com/sookoll/ol3-layerswitcher

Examples have not been updated however here is a quick jsfiddle: https://jsfiddle.net/jnjvynsb/1/

# How to setup


    var layerSwitcher = new ol.control.LayerSwitcher({
        tipLabel: 'Legend', // Optional label for button
        onOpacityChange: function(opacity, layer){
          console.log("Do something")
        },
        onLayerToggle: function(visible, layer){
          console.log("Do something")
        },
        layers: [{
          title: "Overlays",
          layers: [
            {
              title: "Layer One",
              layer: layer_one,
              enableOpacitySliders: true
            },
            {
              title: "Layer Two",
              layer: layer_two,
              enableOpacitySliders: false
            }
          ]
        },
        {
          title: "Base Layers",
          layers: [
            {
              title: "Base One",
              layer: base_one,
              enableOpacitySliders: true
            },
            {
              title: "Base Two",
              layer: base_two,
              enableOpacitySliders: false
            }
          ]
        }]
    });

    //Add filter legend
    this.map.addControl(layerSwitcher);

## License

MIT (c) Matt Walker.

## Also see

If you find the layer switcher useful you might also like the
[ol3-popup](https://github.com/walkermatt/ol3-popup).

