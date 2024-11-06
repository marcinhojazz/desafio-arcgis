<template>
  <div id="app">
    <MapView />
  </div>
</template>

<script>
import MapView from './components/MapView.vue';

export default {
  name: 'App',
  components: {
    MapView,
  },
};
</script>

<style>
#app {
  height: 100vh;
  margin: 0;
}
</style>
