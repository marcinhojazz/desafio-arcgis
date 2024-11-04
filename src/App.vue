<template>
  <div id="app">
    <div id="viewDiv" class="containerView"></div>
  </div>
</template>

<script>
import { onMounted } from 'vue';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Legend from '@arcgis/core/widgets/Legend';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';

export default {
  name: 'App',
  setup() {
    onMounted(() => {
      // Inicializa o mapa
      const map = new Map({
        basemap: 'gray-vector'
      });

      const view = new MapView({
        container: 'viewDiv',
        map: map,
        center: [-98, 39],
        zoom: 4
      });

      // URLs das camadas
      const camerasUrl = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/Traffic_Cameras/FeatureServer/0';
      const countiesUrl = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Census_Counties/FeatureServer/0';

      // Camada de câmeras
      const camerasLayer = new FeatureLayer({
        url: camerasUrl
      });

      // Camada de condados
      const countiesLayer = new FeatureLayer({
        url: countiesUrl,
        outFields: ['*']
      });

      // Adiciona as camadas ao mapa
      map.add(countiesLayer);
      map.add(camerasLayer);

      // Executa a contagem após ambas as camadas carregarem
      countiesLayer.when(() => {
        camerasLayer.when(() => {
          // Consulta das câmeras após o carregamento das camadas
          const queryCameras = camerasLayer.createQuery();
          queryCameras.where = '1=1'; // Ajuste conforme necessário
          queryCameras.outSpatialReference = { wkid: 102100 };
          queryCameras.returnGeometry = true;
          queryCameras.outFields = ['*'];

          camerasLayer.queryFeatures(queryCameras).then((cameraResults) => {
            processCameraData(cameraResults.features);
          });
        });
      });

      function processCameraData(cameras) {
        // Consulta os condados
        const queryCounties = countiesLayer.createQuery();
        queryCounties.outSpatialReference = { wkid: 102100 };
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
        });

        updateRenderer();
      }

      function updateRenderer() {
        const renderer = {
          type: 'simple',
          symbol: {
            type: 'simple-fill',
            color: 'white',
            outline: {
              color: 'lightgray',
              width: 0.5
            }
          },
          visualVariables: [
            {
              type: 'color',
              field: 'cameraCount',
              stops: [
                { value: 0, color: '#f2f0f7', label: '0' },
                { value: 10, color: '#cbc9e2', label: '1 - 10' },
                { value: 20, color: '#9e9ac8', label: '11 - 20' },
                { value: 50, color: '#756bb1', label: '21 - 50' },
                { value: 100, color: '#54278f', label: '51+' }
              ]
            }
          ]
        };

        countiesLayer.renderer = renderer;
        countiesLayer.refresh();

        // Adiciona a legenda
        const legend = new Legend({
          view: view,
          layerInfos: [
            {
              layer: countiesLayer,
              title: 'Número de Câmeras por Condado'
            }
          ]
        });

        view.ui.add(legend, 'bottom-right');
      }
    });
  }
};
</script>

<style>
#viewDiv {
  height: 100vh;
  width: 100%;
}

</style>