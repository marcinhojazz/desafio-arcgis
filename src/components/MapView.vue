<template>
  <div id="viewDiv"></div>

  <!-- Barra de consulta com mais campos de atributos -->
  <div class="query-bar">
    <div class="query-inputs">
      <input v-model="queryParams.name" type="text" placeholder="Nome da câmera" class="query-input" />
      <select v-model="queryParams.state" class="query-input">
        <option value="">Todos os estados</option>
        <option v-for="state in states" :key="state" :value="state">{{ state }}</option>
      </select>
      <button @click="executeQuery" class="query-button">Consultar</button>
    </div>
  </div>

  <!-- Descrição do mapa -->
  <div class="map-description" v-if="!isLoading">
    <p>Mapa coroplético: Densidade de câmeras por condado (baseado na consulta atual)</p>
    <p v-if="totalCameras > 0">Total de câmeras encontradas: {{ totalCameras }}</p>
  </div>

  <!-- Tela de carregamento -->
  <div v-if="isLoading" class="loading-overlay">
    <div class="spinner"></div>
    <p>Processando consulta e atualizando mapa...</p>
  </div>
</template>

<script>
import { defineComponent, onMounted, ref, reactive } from 'vue';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Legend from '@arcgis/core/widgets/Legend';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import * as projection from '@arcgis/core/geometry/projection';

export default defineComponent({
  name: 'MapView',
  setup() {
    const isLoading = ref(true);
    const totalCameras = ref(0);
    const states = ref([]);
    const queryParams = reactive({
      name: '',
      state: ''
    });

    let map, view, countiesLayer, cameraLayer;

    const buildWhereClause = () => {
      const conditions = [];
      
      if (queryParams.name) {
        conditions.push(`NAME LIKE '%${queryParams.name.replace(/'/g, "''")}%'`);
      }
      
      if (queryParams.state) {
        conditions.push(`STATE = '${queryParams.state}'`);
      }
      
      return conditions.length ? conditions.join(' AND ') : '1=1';
    };

    const executeQuery = async () => {
      if (!cameraLayer || !countiesLayer) {
        console.warn("Camadas não estão prontas");
        return;
      }

      isLoading.value = true;

      try {
        const whereClause = buildWhereClause();
        
        // Consulta as câmeras com base nos critérios
        const cameraResults = await cameraLayer.queryFeatures({
          where: whereClause,
          returnGeometry: true,
          outFields: ['*']
        });

        totalCameras.value = cameraResults.features.length;

        // Consulta todos os condados para resetar as contagens
        const countyResults = await countiesLayer.queryFeatures({
          where: '1=1',
          returnGeometry: true,
          outFields: ['*']
        });

        // Projeta as geometrias se necessário e apenas se a projeção foi carregada
        const projectedCameras = await Promise.all(cameraResults.features.map(async camera => {
          if (camera.geometry.spatialReference.wkid !== countiesLayer.spatialReference.wkid) {
            await projection.load();
            return {
              ...camera,
              geometry: projection.project(camera.geometry, countiesLayer.spatialReference)
            };
          }
          return camera;
        }));

        // Recalcula as contagens para cada condado
        const updatedCounties = countyResults.features.map(county => {
          const count = projectedCameras.filter(camera => 
            geometryEngine.contains(county.geometry, camera.geometry)
          ).length;
          
          return {
            ...county,
            attributes: {
              ...county.attributes,
              cameraCount: count
            }
          };
        });

        // Atualiza o renderer com as novas contagens
        updateRenderer(updatedCounties);

        // Atualiza a camada de condados com as novas contagens
        await countiesLayer.queryFeatures({
          where: '1=1',
          returnGeometry: false
        });

        const edits = {
          updateFeatures: updatedCounties
        };
        await countiesLayer.applyEdits(edits);

      } catch (error) {
        console.error("Erro ao executar consulta:", error);
      } finally {
        isLoading.value = false;
      }
    };

    const updateRenderer = (counties) => {
      // Calcula os breaks baseados nos dados atuais
      const counts = counties.map(c => c.attributes.cameraCount).sort((a, b) => a - b);
      const maxCount = counts[counts.length - 1];
      
      const renderer = {
        type: 'simple',
        symbol: {
          type: 'simple-fill',
          color: 'white',
          outline: { color: 'lightgray', width: 0.5 }
        },
        visualVariables: [{
          type: 'color',
          field: 'cameraCount',
          stops: [
            { value: 0, color: '#f2f0f7', label: 'Sem câmeras' },
            { value: Math.ceil(maxCount * 0.25), color: '#cbc9e2', label: '1-25%' },
            { value: Math.ceil(maxCount * 0.5), color: '#9e9ac8', label: '26-50%' },
            { value: Math.ceil(maxCount * 0.75), color: '#756bb1', label: '51-75%' },
            { value: maxCount, color: '#54278f', label: '76-100%' }
          ]
        }]
      };

      countiesLayer.renderer = renderer;
    };

    onMounted(async () => {
      try {
        // Garante que o módulo de projeção está carregado antes de continuar
        await projection.load();

        map = new Map({
          basemap: 'gray-vector'
        });

        view = new MapView({
          container: 'viewDiv',
          map: map,
          center: [-98, 39],
          zoom: 4,
          constraints: {
            minZoom: 2,
            maxZoom: 10
          }
        });

        // Configuração das camadas
        countiesLayer = new FeatureLayer({
          url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Census_Counties/FeatureServer/0',
          outFields: ['*'],
          popupTemplate: {
            title: '{NAME} County',
            content: [
              {
                type: 'fields',
                fieldInfos: [
                  { fieldName: 'cameraCount', label: 'Número de Câmeras' }
                ]
              }
            ]
          }
        });

        cameraLayer = new FeatureLayer({
          url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/Traffic_Cameras/FeatureServer/0',
          outFields: ['*']
        });

        map.addMany([countiesLayer, cameraLayer]);

        // Adiciona legenda
        const legend = new Legend({
          view,
          layerInfos: [{
            layer: countiesLayer,
            title: 'Densidade de Câmeras por Condado'
          }]
        });

        view.ui.add(legend, 'bottom-right');

        // Carrega lista de estados
        const uniqueValues = await cameraLayer.queryFeatures({
          where: '1=1',
          outFields: ['STATE'],
          returnDistinctValues: true
        });
        
        states.value = [...new Set(uniqueValues.features.map(f => f.attributes.STATE))].sort();

        // Executa consulta inicial
        await executeQuery();
        
      } catch (error) {
        console.error("Erro durante a inicialização:", error);
      } finally {
        isLoading.value = false;
      }
    });

    return {
      isLoading,
      queryParams,
      states,
      totalCameras,
      executeQuery
    };
  }
});
</script>

<style scoped>
#viewDiv {
  position: absolute;
  top: 60px;
  left: 0;
  height: calc(100vh - 60px);
  width: 100vw;
}

.query-bar {
  position: absolute;
  top: 10px;
  left: 20px;
  right: 20px;
  z-index: 1000;
  background-color: white;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.query-inputs {
  display: flex;
  gap: 10px;
  align-items: center;
}

.query-input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 200px;
}

.query-button {
  padding: 8px 16px;
  background-color: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.query-button:hover {
  background-color: #0052a3;
}

.map-description {
  position: absolute;
  width: 320px;
  top: 70px;
  left: 48px;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 1000;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #0066cc;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>