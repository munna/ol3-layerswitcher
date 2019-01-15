# OpenLayers LayerSwitcher

Forked version of Matt Walker's Layer Switcher: https://github.com/sookoll/ol3-layerswitcher

Froked and modified to work with openlayer 5 (ol@5.3.0)

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
              enableOpacitySliders: false,
              legend: "Something about <strong>layer</strong>"
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

MIT (c) 


