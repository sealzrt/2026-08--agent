<script setup lang="ts">
import { solutionConfig } from '~/data/entity-configs'
</script>

<template>
  <EntityManager :config="solutionConfig" />
</template>
