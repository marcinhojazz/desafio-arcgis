<!-- src/components/MapView.vue -->
<template>
  <div id="viewDiv"></div>
</template>

<script>
import { defineComponent, onMounted } from 'vue';

export default defineComponent({
  name: 'MapView',
  setup() {
    onMounted(async () => {
      // Dynamically import ArcGIS modules
      const [Map, MapView, FeatureLayer, Legend, geometryEngine] = await Promise.all([
        import('@arcgis/core/Map'),
        import('@arcgis/core/views/MapView'),
        import('@arcgis/core/layers/FeatureLayer'),
        import('@arcgis/core/widgets/Legend'),
        import('@arcgis/core/geometry/geometryEngine'),
      ]).then((modules) => modules.map((module) => module.default || module));

      // Initialize the map
      const map = new Map({
        basemap: 'gray-vector',
      });

      const view = new MapView({
        container: 'viewDiv',
        map: map,
        center: [-98, 39], // Center of the US
        zoom: 4,
      });

      // URLs for the layers
      const camerasUrl =
        'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/Traffic_Cameras/FeatureServer/0';
      const countiesUrl =
        'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Census_Counties/FeatureServer/0';

      // Create the counties layer
      const countiesLayer = new FeatureLayer({
        url: countiesUrl,
        outFields: ['*'],
      });

      // Add the counties layer to the map
      map.add(countiesLayer);

      // Wait for the counties layer to load
      countiesLayer.when(() => {
        // Query the counties
        const queryCounties = countiesLayer.createQuery();
        queryCounties.returnGeometry = true;
        queryCounties.outFields = ['*'];

        countiesLayer.queryFeatures(queryCounties).then((countyResults) => {
          // Now query the cameras
          const camerasLayer = new FeatureLayer({
            url: camerasUrl,
            outFields: ['*'],
          });

          const queryCameras = camerasLayer.createQuery();
          queryCameras.returnGeometry = true;
          queryCameras.outFields = ['*'];

          camerasLayer.queryFeatures(queryCameras).then((cameraResults) => {
            // Process the data
            calculateCameraCounts(cameraResults.features, countyResults.features);
          });
        });
      });

      function calculateCameraCounts(cameras, counties) {
        counties.forEach((county) => {
          let count = 0;
          cameras.forEach((camera) => {
            if (geometryEngine.contains(county.geometry, camera.geometry)) {
              count++;
            }
          });
          county.attributes.cameraCount = count;
        });

        // Update the counties layer with the new renderer
        const renderer = {
          type: 'simple',
          symbol: {
            type: 'simple-fill',
            color: 'white',
            outline: {
              color: 'lightgray',
              width: 0.5,
            },
          },
          visualVariables: [
            {
              type: 'color',
              field: 'cameraCount',
              stops: [
                { value: 0, color: '#f2f0f7', label: '0' },
                { value: 1, color: '#cbc9e2', label: '1' },
                { value: 5, color: '#9e9ac8', label: '2 - 5' },
                { value: 10, color: '#756bb1', label: '6 - 10' },
                { value: 20, color: '#54278f', label: '11+' },
              ],
            },
          ],
        };

        // Create a new FeatureLayer with the updated features
        const updatedCountiesLayer = new FeatureLayer({
          source: counties,
          fields: countiesLayer.fields,
          objectIdField: 'OBJECTID',
          geometryType: 'polygon',
          spatialReference: countiesLayer.spatialReference,
          renderer: renderer,
        });

        // Replace the old counties layer with the updated one
        map.remove(countiesLayer);
        map.add(updatedCountiesLayer);

        // Add a legend
        const legend = new Legend({
          view: view,
          layerInfos: [
            {
              layer: updatedCountiesLayer,
              title: 'Número de Câmeras por Condado',
            },
          ],
        });

        view.ui.add(legend, 'bottom-right');
      }
    });
  },
});
</script>

<style>
#viewDiv {
  height: 100%;
  width: 100%;
}
</style>
