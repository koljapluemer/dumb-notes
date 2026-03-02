import { ref, computed, watch, type Ref } from 'vue'

export interface SearchMatch {
  start: number
  end: number
}

export function useNoteSearch(noteBody: Ref<string>) {
  const isOpen = ref(false)
  const searchQuery = ref('')
  const currentMatchIndex = ref(0)

  const matches = computed<SearchMatch[]>(() => {
    if (!searchQuery.value || !noteBody.value) return []
    const query = searchQuery.value.toLowerCase()
    const text = noteBody.value.toLowerCase()
    const results: SearchMatch[] = []
    let pos = 0
    while ((pos = text.indexOf(query, pos)) !== -1) {
      results.push({ start: pos, end: pos + query.length })
      pos += 1
    }
    return results
  })

  const matchCountText = computed(() => {
    if (!searchQuery.value) return ''
    if (matches.value.length === 0) return 'No matches'
    return `${currentMatchIndex.value + 1} of ${matches.value.length}`
  })

  const currentMatch = computed<SearchMatch | null>(() => {
    if (matches.value.length === 0) return null
    return matches.value[currentMatchIndex.value] ?? null
  })

  function nextMatch() {
    if (matches.value.length === 0) return
    currentMatchIndex.value = (currentMatchIndex.value + 1) % matches.value.length
  }

  function previousMatch() {
    if (matches.value.length === 0) return
    currentMatchIndex.value =
      (currentMatchIndex.value - 1 + matches.value.length) % matches.value.length
  }

  function openSearch() {
    isOpen.value = true
  }

  function closeSearch() {
    isOpen.value = false
    searchQuery.value = ''
    currentMatchIndex.value = 0
  }

  watch(searchQuery, () => {
    currentMatchIndex.value = 0
  })

  watch(noteBody, () => {
    if (currentMatchIndex.value >= matches.value.length) {
      currentMatchIndex.value = 0
    }
  })

  return {
    isOpen,
    searchQuery,
    matches,
    currentMatchIndex,
    currentMatch,
    matchCountText,
    nextMatch,
    previousMatch,
    openSearch,
    closeSearch,
  }
}
