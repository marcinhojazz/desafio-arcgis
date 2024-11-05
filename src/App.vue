<template>
  <div id="app">
    <map-view />
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import MapView from './components/MapView.vue';

export default defineComponent({
  name: 'App',
  components: {
    MapView,
  },
});
</script>

<style>
#app {
  height: 97vh;
  width: 100%;
}
</style>