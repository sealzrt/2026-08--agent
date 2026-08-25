<script setup lang="ts">
import { requirementConfig } from '~/data/entity-configs'
</script>

<template>
  <EntityManager :config="requirementConfig" />
</template>
