<script setup lang="ts">
import { riskConfig } from '~/data/entity-configs'
</script>

<template>
  <EntityManager :config="riskConfig" />
</template>
