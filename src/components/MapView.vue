<script>
import { defineComponent, onMounted, ref, reactive } from 'vue';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Legend from '@arcgis/core/widgets/Legend';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import * as projection from '@arcgis/core/geometry/projection';

export default defineComponent({
  name: 'MapViewComponent',
  setup() {
    const isLoading = ref(true);
    const totalCameras = ref(0);
    const states = ref([]);
    const erros = ref([]);
    const queryParams = reactive({
      name: '',
      state: '',
      minCameras: 0,
    });

    let map, view, countiesLayer, cameraLayer, legend;
    let existingFields = [];

    const buildWhereClause = () => {
      const conditions = [];

      if (queryParams.name) {
        conditions.push(
          `NAME LIKE '%${queryParams.name.replace(/'/g, "''")}%'`
        );
      }

      if (queryParams.state) {
        conditions.push(
          `STATE_NAME = '${queryParams.state.replace(/'/g, "''")}'`
        );
      }

      return conditions.length ? conditions.join(' AND ') : '1=1';
    };

    const focusOnHotspots = async (counties) => {
      if (!counties || counties.length === 0) return;

      const sortedCounties = [...counties].sort(
        (a, b) =>
          (b.attributes.cameraCount || 0) - (a.attributes.cameraCount || 0)
      );

      const topCounties = sortedCounties.slice(0, 5);

      // Filtrar condados com geometria válida
      const validCounties = topCounties.filter(
        (county) => county.geometry && county.geometry.extent
      );

      if (validCounties.length === 0) return;

      const combinedExtent = validCounties.reduce((extent, county) => {
        if (!extent) {
          return county.geometry.extent.clone();
        }
        return extent.union(county.geometry.extent);
      }, null);

      if (combinedExtent) {
        combinedExtent.expand(1.2);

        await view.goTo(combinedExtent, {
          duration: 2000,
          easing: 'ease-in-out',
        });
      }
    };

    const updateRenderer = (layer) => {
      try {
        const counts = layer.source.items
          .map((c) => c.attributes.cameraCount)
          .filter((count) => count > 0);
        if (counts.length === 0) return;

        const maxCount = Math.max(...counts);
        const breaks = [
          0,
          maxCount * 0.2,
          maxCount * 0.4,
          maxCount * 0.6,
          maxCount * 0.8,
          maxCount,
        ];

        const renderer = {
          type: 'class-breaks',
          field: 'cameraCount',
          defaultSymbol: {
            type: 'simple-fill',
            color: [240, 240, 240, 0.7],
            outline: { color: [200, 200, 200, 0.8], width: 0.5 },
          },
          classBreakInfos: [
            {
              minValue: breaks[0],
              maxValue: breaks[1],
              symbol: {
                type: 'simple-fill',
                color: [237, 248, 251, 0.7],
                outline: { color: [200, 200, 200, 0.8], width: 0.5 },
              },
              label: `0 - ${Math.round(breaks[1])} câmeras`,
            },
            {
              minValue: breaks[1],
              maxValue: breaks[2],
              symbol: {
                type: 'simple-fill',
                color: [179, 205, 227, 0.7],
                outline: { color: [200, 200, 200, 0.8], width: 0.5 },
              },
              label: `${Math.round(breaks[1])} - ${Math.round(
                breaks[2]
              )} câmeras`,
            },
            {
              minValue: breaks[2],
              maxValue: breaks[3],
              symbol: {
                type: 'simple-fill',
                color: [140, 150, 198, 0.7],
                outline: { color: [200, 200, 200, 0.8], width: 0.5 },
              },
              label: `${Math.round(breaks[2])} - ${Math.round(
                breaks[3]
              )} câmeras`,
            },
            {
              minValue: breaks[3],
              maxValue: breaks[4],
              symbol: {
                type: 'simple-fill',
                color: [136, 86, 167, 0.7],
                outline: { color: [200, 200, 200, 0.8], width: 0.5 },
              },
              label: `${Math.round(breaks[3])} - ${Math.round(
                breaks[4]
              )} câmeras`,
            },
            {
              minValue: breaks[4],
              maxValue: breaks[5],
              symbol: {
                type: 'simple-fill',
                color: [129, 15, 124, 0.7],
                outline: { color: [200, 200, 200, 0.8], width: 0.5 },
              },
              label: `${Math.round(breaks[4])}+ câmeras`,
            },
          ],
        };

        layer.renderer = renderer;
      } catch (error) {
        erros.value.push({
          tipo: 'ERRO',
          componente: 'Renderer',
          mensagem: 'Erro ao atualizar renderer',
          erro: error,
        });
      }
    };

    const executeQuery = async () => {
      if (!cameraLayer || !countiesLayer) {
        erros.value.push({
          tipo: 'AVISO',
          mensagem: 'Camadas não estão prontas',
        });
        return;
      }

      isLoading.value = true;
      erros.value = [];

      try {
        const countyWhereClause = buildWhereClause();

        // Consultar os condados com base nos parâmetros
        const countyResults = await countiesLayer.queryFeatures({
          where: countyWhereClause,
          returnGeometry: true,
          outFields: ['*'],
        });

        if (countyResults.features.length === 0) {
          erros.value.push({
            tipo: 'AVISO',
            mensagem: 'Nenhum condado encontrado com os critérios fornecidos.',
          });
          isLoading.value = false;
          return;
        }

        if (!projection.isLoaded()) {
          await projection.load();
        }

        // Projetar as geometrias das câmeras, se necessário
        let cameraFeatures = await cameraLayer.queryFeatures({
          where: '1=1',
          returnGeometry: true,
          outFields: ['*'],
        });

        if (cameraFeatures.features.length === 0) {
          erros.value.push({
            tipo: 'AVISO',
            mensagem: 'Nenhuma câmera encontrada.',
          });
        }

        const cameras = cameraFeatures.features.map((camera) => {
          if (
            camera.geometry.spatialReference.wkid !==
            countiesLayer.spatialReference.wkid
          ) {
            camera.geometry = projection.project(
              camera.geometry,
              countiesLayer.spatialReference
            );
          }
          return camera;
        });

        // Mapear as câmeras para os condados
        const updatedCounties = countyResults.features.map((county) => {
          const count = cameras.filter((camera) =>
            geometryEngine.contains(county.geometry, camera.geometry)
          ).length;

          return {
            geometry: county.geometry,
            attributes: {
              ...county.attributes,
              cameraCount: count,
            },
          };
        });

        // Filtrar os condados pelo número mínimo de câmeras
        const filteredCounties = updatedCounties.filter(
          (county) => county.attributes.cameraCount >= queryParams.minCameras
        );

        // Remover a camada de condados existente
        if (map.findLayerById('countiesLayer')) {
          map.remove(map.findLayerById('countiesLayer'));
        }

        // Criar uma nova camada de condados com os recursos atualizados
        countiesLayer = new FeatureLayer({
          id: 'countiesLayer',
          source: filteredCounties,
          fields: [
            ...existingFields,
            {
              name: 'cameraCount',
              alias: 'Camera Count',
              type: 'integer',
            },
          ],
          objectIdField: 'OBJECTID',
          geometryType: 'polygon',
          spatialReference: countiesLayer.spatialReference,
        });

        map.add(countiesLayer);

        updateRenderer(countiesLayer);
        await focusOnHotspots(filteredCounties);

        // Atualizar a legenda para referenciar a nova camada
        legend.layerInfos = [
          {
            layer: countiesLayer,
            title: 'Contagem de Câmeras por Condado',
          },
        ];

        totalCameras.value = cameras.length;

      } catch (error) {
        erros.value.push({
          tipo: 'ERRO',
          componente: 'Consulta',
          mensagem: 'Erro ao executar consulta',
          erro: error,
        });
        console.error('Erro ao executar consulta:', error);
      } finally {
        isLoading.value = false;
      }
    };

    onMounted(async () => {
      try {
        // Inicializa o mapa
        map = new Map({
          basemap: 'gray-vector',
        });

        // Inicializa a view
        view = new MapView({
          container: 'viewDiv',
          map: map,
          center: [-98, 39],
          zoom: 4,
        });

        // Inicializa a camada de condados
        countiesLayer = new FeatureLayer({
          url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_Census_Counties/FeatureServer/0',
          outFields: ['*'],
        });

        // Inicializa a camada de câmeras
        cameraLayer = new FeatureLayer({
          url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/Traffic_Cameras/FeatureServer/0',
          outFields: ['*'],
        });

        // Adiciona a camada de condados ao mapa
        map.add(countiesLayer);

        // Aguarda o carregamento das camadas
        await countiesLayer.load();
        existingFields = countiesLayer.fields;
        await cameraLayer.load();

        // Adiciona a legenda
        legend = new Legend({
          view: view,
          layerInfos: [
            {
              layer: countiesLayer,
              title: 'Contagem de Câmeras por Condado',
            },
          ],
        });
        view.ui.add(legend, 'bottom-left');

        // Preenche a lista de estados
        const stateQuery = countiesLayer.createQuery();
        stateQuery.returnDistinctValues = true;
        stateQuery.outFields = ['STATE_NAME'];
        const stateResults = await countiesLayer.queryFeatures(stateQuery);
        states.value = stateResults.features
          .map((f) => f.attributes.STATE_NAME)
          .sort();

        // Executa a consulta inicial
        await executeQuery();
      } catch (error) {
        erros.value.push({
          tipo: 'ERRO',
          componente: 'Inicialização',
          mensagem: 'Erro ao inicializar o mapa ou as camadas',
          erro: error,
        });
        console.error('Erro na inicialização:', error);
      } finally {
        isLoading.value = false;
      }
    });

    return {
      isLoading,
      queryParams,
      states,
      totalCameras,
      executeQuery,
      erros,
    };
  },
});
</script>

<template>
  <div>
    <!-- Controle para o accordion com checkbox -->
    <input type="checkbox" id="accordion-toggle" class="accordion-checkbox" />
    
    <div class="search-controls">
      <div class="form-group">
        <div class="content-bottom">
          <h2>Pesquisa</h2>
          <!-- Label associado ao checkbox para controlar o accordion -->
          <label for="accordion-toggle" class="button-accordion">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <path fill="currentColor" d="m12 16.175l3.9-3.875q.275-.275.688-.288t.712.288q.275.275.275.7t-.275.7l-4.6 4.6q-.15.15-.325.213t-.375.062t-.375-.062t-.325-.213l-4.6-4.6q-.275-.275-.288-.687T6.7 12.3q.275-.275.7-.275t.7.275zm0-6L15.9 6.3q.275-.275.688-.287t.712.287q.275.275.275.7t-.275.7l-4.6 4.6q-.15.15-.325.213t-.375.062t-.375-.062t-.325-.213L6.7 7.7q-.275-.275-.288-.687T6.7 6.3q.275-.275.7-.275t.7.275z"/>
            </svg>
          </label>
        </div>
        
        <!-- Conteúdo do accordion, controlado pelo checkbox -->
        <div class="accordion-content">
          <label for="state">Estado:</label>
          <select v-model="queryParams.state" id="state">
            <option value="">Todos</option>
            <option v-for="state in states" :key="state" :value="state">
              {{ state }}
            </option>
          </select>
          
          <label for="county">Condado:</label>
          <input
            type="text"
            v-model="queryParams.name"
            id="county"
            placeholder="Nome do condado"
          />
          
          <label for="minCameras">Mínimo de câmeras:</label>
          <input
            type="number"
            v-model.number="queryParams.minCameras"
            id="minCameras"
            min="0"
          />
          
          <button @click="executeQuery" :disabled="isLoading">
            {{ isLoading ? 'Pesquisando...' : 'Pesquisar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Div para exibir o mapa -->
    <div id="viewDiv" style="width: 100%; height: 600px;"></div>

    <div class="results-info" v-if="totalCameras > 0">
      Total de câmeras encontradas: {{ totalCameras }}
    </div>
  </div>
</template>
