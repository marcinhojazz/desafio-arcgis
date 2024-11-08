<template>
  <div id="viewDiv"></div>

  <!-- Barra de consulta para o nome da câmera -->
  <div class="query-bar">
    <input v-model="cameraName" type="text" placeholder="Digite o nome da câmera" />
    <button @click="applyAttributeQuery">Consultar</button>
  </div>

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
    const cameraName = ref('');
    let map, view, countiesLayer, cameraLayer, projection;

    // Função de consulta com tentativa de reexecução
    const applyAttributeQuery = async () => {
      if (!cameraLayer || cameraLayer.loadStatus !== 'loaded') {
        console.warn("A camada de câmeras ainda não está carregada.");
        return;
      }

      isLoading.value = true;
      try {
        const whereClause = cameraName.value
          ? `NAME LIKE '%${cameraName.value.replace(/'/g, "''")}%'`
          : '1=1';
        cameraLayer.definitionExpression = whereClause;

        const cameraResults = await cameraLayer.queryFeatures({
          where: whereClause,
          returnGeometry: true,
          outFields: ['OBJECTID'],
        });

        if (cameraResults.features.length === 0) {
          console.warn("Nenhuma câmera encontrada com esse critério.");
        }

        const projectedCameras = cameraResults.features.map((camera) => {
          return camera.geometry.spatialReference.wkid === countiesLayer.spatialReference.wkid
            ? camera
            : { ...camera, geometry: projection.project(camera.geometry, countiesLayer.spatialReference) };
        });

        calculateCameraCounts(projectedCameras, countiesLayer.features);
      } catch (error) {
        console.error("Erro ao aplicar a consulta de atributos:", error.message || error);
      } finally {
        isLoading.value = false;
      }
    };

    onMounted(async () => {
      const [Map, MapView, FeatureLayer, Legend, geometryEngine, proj] = await Promise.all([
        import('@arcgis/core/Map'),
        import('@arcgis/core/views/MapView'),
        import('@arcgis/core/layers/FeatureLayer'),
        import('@arcgis/core/widgets/Legend'),
        import('@arcgis/core/geometry/geometryEngine'),
        import('@arcgis/core/geometry/projection'),
      ]).then((modules) => modules.map((module) => module.default || module));

      // Atribui a projeção para uso global
      projection = proj;
      await projection.load();

      map = new Map({ basemap: 'gray-vector' });

      view = new MapView({
        container: 'viewDiv',
        map: map,
        center: [-98, 39],
        zoom: 4,
        constraints: { minZoom: 2, maxZoom: 10 },
      });

      const camerasUrl = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/Traffic_Cameras/FeatureServer/0';
      const countiesUrl = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Census_Counties/FeatureServer/0';

      countiesLayer = new FeatureLayer({
        url: countiesUrl,
        outFields: ['OBJECTID', 'NAME'],
      });
      map.add(countiesLayer);

      cameraLayer = new FeatureLayer({
        url: camerasUrl,
        outFields: ['OBJECTID'],
        popupTemplate: {
          title: 'Câmera de Tráfego',
          content: [
            {
              type: "fields",
              fieldInfos: [
                { fieldName: "OBJECTID", label: "ID da Câmera" },
              ]
            }
          ]
        },
        definitionExpression: '1=1', // Inicialmente sem filtros
      });
      map.add(cameraLayer);

      // Aguarda o carregamento completo da camada antes de aplicar a consulta
      cameraLayer.when(() => {
        applyAttributeQuery();
      }).catch((error) => {
        console.error("Erro ao carregar a camada de câmeras:", error);
        isLoading.value = false;
      });

      const countyResults = await countiesLayer.queryFeatures({
        where: '1=1',
        returnGeometry: true,
        outFields: ['OBJECTID', 'NAME'],
      });

      const counties = countyResults.features;

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

        countiesLayer.renderer = renderer;

        const legend = new Legend({
          view,
          layerInfos: [{ layer: countiesLayer, title: 'Número de Câmeras por Condado' }],
        });
        view.ui.add(legend, 'bottom-right');
        isLoading.value = false;
      }
    });

    return {
      isLoading,
      cameraName,
      applyAttributeQuery,
    };
  },
});
</script>

<style scoped>
#viewDiv {
  position: absolute;
  top: 50px;
  left: 0;
  height: calc(100vh - 50px);
  width: 100vw;
}

.map-description {
  position: absolute;
  top: 60px;
  left: 20px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.query-bar {
  position: absolute;
  top: 10px;
  left: 20px;
  z-index: 1000;
  display: flex;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(37, 0, 105, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
