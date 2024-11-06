<template>
  <div id="viewDiv"></div>

  <!-- Descrição do mapa -->
  <div class="map-description" v-if="!isLoading">
    <p>Mapa coroplético mostrando a análise de câmeras de tráfego por condado nos EUA</p>
  </div>

  <!-- Tela de carregamento -->
  <div v-if="isLoading" class="loading-overlay">
    <div class="spinner"></div>
    <p>Carregando mapa, por favor aguarde...</p>
  </div>
</template>

<script>
import { defineComponent, onMounted, ref } from 'vue';

export default defineComponent({
  name: 'MapView',
  setup() {
    const isLoading = ref(true);

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
        constraints: { minZoom: 2, maxZoom: 10 },
      });

      const camerasUrl = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/Traffic_Cameras/FeatureServer/0';
      const countiesUrl = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Census_Counties/FeatureServer/0';

      const countiesLayer = new FeatureLayer({
        url: countiesUrl,
        outFields: ['OBJECTID', 'NAME'],
      });
      map.add(countiesLayer);

      // Carrega condados e câmeras em paralelo
      const [countyResults, cameraResults] = await Promise.all([
        countiesLayer.queryFeatures({
          where: '1=1',
          returnGeometry: true,
          outFields: ['OBJECTID', 'NAME'],
        }),
        new FeatureLayer({ url: camerasUrl, outFields: ['OBJECTID'] }).queryFeatures({
          where: '1=1',
          returnGeometry: true,
          spatialRel: 'intersects',
          geometry: view.extent,
        }),
      ]);

      // Verifique se os dados estão corretos
      console.log("County Results:", countyResults);
      console.log("Camera Results:", cameraResults);

      const projectedCameras = Array.isArray(cameraResults.features)
        ? cameraResults.features.map((camera) => {
            return camera.geometry.spatialReference.wkid === countyResults.spatialReference.wkid
              ? camera
              : { ...camera, geometry: projection.project(camera.geometry, countyResults.spatialReference) };
          })
        : [];

      calculateCameraCounts(projectedCameras, countyResults.features);

      function calculateCameraCounts(cameras, counties) {
        // Verifique se 'counties' é um array
        if (!Array.isArray(counties) || !Array.isArray(cameras)) {
          console.error("Dados inválidos para counties ou cameras.");
          return;
        }

        counties.forEach((county) => {
          let count = 0;
          cameras.forEach((camera) => {
            if (county.geometry && camera.geometry && geometryEngine.contains(county.geometry, camera.geometry)) {
              count++;
            }
          });
          county.attributes.cameraCount = count;
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

        // Remover tela de carregamento
        isLoading.value = false;
      }
    });

    return {
      isLoading,
    };
  },
});
</script>

<style>
#viewDiv {
  position: absolute;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

body {
  margin: 0;
  overflow: hidden;
}

.map-description {
  position: absolute;
  top: 1rem;
  left: 4rem;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;

  
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 9999;
  width: 100vw;
  height: 100vh;
  background-color: rgba(37, 0, 105, 0.4);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  p {
    color: white;
    font-size: 1.5rem;
    font-weight: 700;
  }
}

.spinner {
  border: 8px solid #f3f3f3;
  border-top: 8px solid #3498db;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 2s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media screen and (max-width: 768px) {
    .map-description {
      top: 0;
      left: 0;
      padding: 12px;
      text-align: center;
      margin: 16px 3.5rem 0 3.5rem;
    }

    .loading-overlay {
      p {
        font-size: 1.2rem;
        text-align: center;
      }
    }
  }


</style>
