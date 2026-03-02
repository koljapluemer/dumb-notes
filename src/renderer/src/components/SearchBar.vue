<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { X, ChevronUp, ChevronDown } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
  matchCountText: string
}>()

const emit = defineEmits<{
  (e: 'update:query', value: string): void
  (e: 'next'): void
  (e: 'previous'): void
  (e: 'close'): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const localQuery = ref('')

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      nextTick(() => {
        inputRef.value?.focus()
        inputRef.value?.select()
      })
    } else {
      localQuery.value = ''
    }
  },
)

function handleInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  localQuery.value = value
  emit('update:query', value)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (event.shiftKey) {
      emit('previous')
    } else {
      emit('next')
    }
  } else if (event.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <div
    v-if="visible"
    class="absolute top-2 right-2 z-10 flex items-center gap-1 bg-base-100 border border-base-300 rounded-lg shadow-lg px-2 py-1.5"
  >
    <input
      ref="inputRef"
      :value="localQuery"
      @input="handleInput"
      @keydown="handleKeydown"
      type="text"
      class="input input-sm w-44"
      placeholder="Find in note..."
    />

    <span class="text-xs text-base-content/60 min-w-16 text-center">
      {{ matchCountText }}
    </span>

    <button
      class="btn btn-ghost btn-sm btn-square"
      @click="emit('previous')"
      title="Previous (Shift+Enter)"
    >
      <ChevronUp :size="15" />
    </button>

    <button
      class="btn btn-ghost btn-sm btn-square"
      @click="emit('next')"
      title="Next (Enter)"
    >
      <ChevronDown :size="15" />
    </button>

    <button
      class="btn btn-ghost btn-sm btn-square"
      @click="emit('close')"
      title="Close (Escape)"
    >
      <X :size="15" />
    </button>
  </div>
</template>
