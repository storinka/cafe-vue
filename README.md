# Storinka Vue plugin

Vue plugin for Storinka skins.

## Installation

```shell
yarn add @storinka/cafe-vue
```

## Usage

```javascript
// main.js
import { createApp } from "vue";
import { createStorinka } from "@storinka/cafe-vue";

const app = createApp();

app.use(createStorinka());
```

```vue
// App.vue

<template>
  <div class="app">
    <div v-if="$storinka.state.isLoading">
      Loading...
    </div>
    <div v-else>
      {{ $storinka.state.cafe.name }}
    </div>
  </div>
</template>

<script>
export default {
  mounted() {
    this.$storinka.setCafe("kava-gallery", "uk");
  }
}
</script>
```
