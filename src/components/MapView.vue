<template>
  <div id="viewDiv"></div>
</template>

<script>
import { defineComponent, onMounted } from 'vue';

export default defineComponent({
  name: 'MapView',
  setup() {
    onMounted(async () => {
      const [Map, MapView, FeatureLayer, Legend, geometryEngine, projection] = await Promise.all([
        import('@arcgis/core/Map'),
        import('@arcgis/core/views/MapView'),
        import('@arcgis/core/layers/FeatureLayer'),
        import('@arcgis/core/widgets/Legend'),
        import('@arcgis/core/geometry/geometryEngine'),
        import('@arcgis/core/geometry/projection'),
      ]).then((modules) => modules.map((module) => module.default || module));

      await projection.load();

      const map = new Map({ basemap: 'gray-vector' });

      const view = new MapView({
        container: 'viewDiv',
        map: map,
        center: [-98, 39],
        zoom: 4,
        constraints: { minZoom: 4, maxZoom: 8 },
      });

      const camerasUrl = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/Traffic_Cameras/FeatureServer/0';
      const countiesUrl = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Census_Counties/FeatureServer/0';

      const countiesLayer = new FeatureLayer({ url: countiesUrl, outFields: ['*'] });
      map.add(countiesLayer);

      countiesLayer.when(() => {
        const queryCounties = countiesLayer.createQuery();
        queryCounties.returnGeometry = true;
        queryCounties.outFields = ['*'];

        countiesLayer.queryFeatures(queryCounties).then((countyResults) => {
          console.log(`Total counties: ${countyResults.features.length}`);
          
          const camerasLayer = new FeatureLayer({ url: camerasUrl, outFields: ['*'] });

          camerasLayer.queryFeatures().then((cameraResults) => {
            console.log(`Total cameras: ${cameraResults.features.length}`);
            
            // Verifica a referência espacial e projeta se necessário
            const projectedCameras = cameraResults.features.map((camera) => {
              const cameraGeometry = camera.geometry.spatialReference.wkid === countyResults.spatialReference.wkid
                ? camera.geometry
                : projection.project(camera.geometry, countyResults.spatialReference);

              return { ...camera, geometry: cameraGeometry };
            });

            calculateCameraCounts(projectedCameras, countyResults.features);
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

          // Log somente para condados com câmeras
          if (count > 0) {
            console.log(`County ${county.attributes.NAME} has ${count} cameras.`);
          }
        });

        updateRenderer(counties);
      }

      function updateRenderer(counties) {
        const renderer = {
          type: 'simple',
          symbol: {
            type: 'simple-fill',
            color: 'white',
            outline: { color: 'lightgray', width: 0.5 },
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

        const updatedCountiesLayer = new FeatureLayer({
          source: counties.map((county) => ({ geometry: county.geometry, attributes: county.attributes })),
          fields: countiesLayer.fields.concat([{ name: 'cameraCount', type: 'integer' }]),
          objectIdField: 'OBJECTID',
          geometryType: 'polygon',
          spatialReference: countiesLayer.spatialReference,
          renderer,
        });

        map.remove(countiesLayer);
        map.add(updatedCountiesLayer);

        const legend = new Legend({
          view,
          layerInfos: [{ layer: updatedCountiesLayer, title: 'Número de Câmeras por Condado' }],
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
