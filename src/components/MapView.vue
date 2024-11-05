<template>
  <div id="viewDiv"></div>
</template>

<script>
import { defineComponent, onMounted } from 'vue';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Legend from '@arcgis/core/widgets/Legend';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';

export default defineComponent({
  name: 'MapView',
  setup() {
    onMounted(async () => {
      const [Map, MapView, FeatureLayer, Legend, geometryEngine] = await Promise.all([
        import('@arcgis/core/Map'),
        import('@arcgis/core/views/MapView'),
        import('@arcgis/core/layers/FeatureLayer'),
        import('@arcgis/core/widgets/Legend'),
        import('@arcgis/core/geometry/geometryEngine')
      ]);

      // Inicie o mapa com os módulos importados
      initMap(Map, MapView, FeatureLayer, Legend, geometryEngine);
    });


    function initMap() {
      // Inicializa o mapa
      const map = new Map({
        basemap: 'gray-vector',
      });

      const view = new MapView({
        container: 'viewDiv',
        map: map,
        center: [-98, 39],
        zoom: 4,
      });

      // URLs das camadas fornecidas
      const camerasUrl =
        'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/Traffic_Cameras/FeatureServer/0';
      const countiesUrl =
        'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Census_Counties/FeatureServer/0';

      // Camada de câmeras
      const camerasLayer = new FeatureLayer({
        url: camerasUrl,
        outFields: ['*'],
      });

      // Camada de condados
      const countiesLayer = new FeatureLayer({
        url: countiesUrl,
        outFields: ['*'],
      });

      // Adiciona a camada de condados ao mapa
      map.add(countiesLayer);

      // Aguarda o carregamento das camadas
      countiesLayer.when(() => {
        camerasLayer.when(() => {
          // Realiza a consulta das câmeras
          const queryCameras = camerasLayer.createQuery();
          queryCameras.where = '1=1';
          queryCameras.returnGeometry = true;
          queryCameras.outFields = ['*'];

          camerasLayer.queryFeatures(queryCameras).then((cameraResults) => {
            processCameraData(cameraResults.features);
          });
        });
      });

      function processCameraData(cameras) {
        // Realiza a consulta dos condados
        const queryCounties = countiesLayer.createQuery();
        queryCounties.returnGeometry = true;
        queryCounties.outFields = ['*'];

        countiesLayer.queryFeatures(queryCounties).then((countyResults) => {
          calculateCameraCounts(cameras, countyResults.features);
        });
      }

      function calculateCameraCounts(cameras, counties) {
        counties.forEach((county) => {
          let count = 0;
          cameras.forEach((camera) => {
            if (geometryEngine.contains(county.geometry, camera.geometry)) {
              count++;
            }
          });
          county.attributes.cameraCount = count;

          // Log para confirmar que `cameraCount` está sendo atualizado
          console.log(`Condado: ${county.attributes.NAME}, Câmeras: ${county.attributes.cameraCount}`);
        });

        updateRenderer();
      }

      function updateRenderer() {
        countiesLayer.renderer = getRenderer();
        countiesLayer.refresh();

        // Configura a legenda
        view.ui.add(
          new Legend({
            view: view,
            layerInfos: [
              {
                layer: countiesLayer,
                title: 'Número de Câmeras por Condado',
              },
            ],
          }),
          'bottom-right'
        );
      }

      function getRenderer() {
        return {
          type: 'simple',
          symbol: {
            type: 'simple-fill',
            color: 'white',
            outline: {
              color: 'lightgray',
              width: 0.2,
            },
          },
          visualVariables: [
            {
              type: 'color',
              field: 'cameraCount',  // Verifique se o campo é `cameraCount`
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
      }

    }
  },
});
</script>

<style>
#viewDiv {
  height: 100%;
  width: 100%;
}
</style>