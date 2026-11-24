<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const emit = defineEmits<{ opened: [], closed: [] }>()
const anchor = ref<HTMLButtonElement | null>(null)
const popup = ref<HTMLElement | null>(null)
const tooltipId = useId()
const hovered = ref(false)
const focused = ref(false)
const pinned = ref(false)
const visible = computed(() => hovered.value || focused.value || pinned.value)
const aboveAnchor = ref(false)
const position = ref({ left: '0px', top: '0px' })
let leaveTimer: ReturnType<typeof setTimeout> | undefined

function enter() {
  clearTimeout(leaveTimer)
  hovered.value = true
}

function leave() {
  clearTimeout(leaveTimer)
  leaveTimer = setTimeout(() => { hovered.value = false }, 120)
}

function dismiss() {
  clearTimeout(leaveTimer)
  hovered.value = false
  focused.value = false
  pinned.value = false
}

function toggle() {
  if (pinned.value) dismiss()
  else pinned.value = true
}

function place() {
  if (!anchor.value || !popup.value) return
  const rect = anchor.value.getBoundingClientRect()
  if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
    dismiss()
    return
  }
  const gap = 8
  const { offsetWidth: width, offsetHeight: height } = popup.value
  const left = Math.min(window.innerWidth - width - gap, Math.max(gap, rect.right - width))
  const below = rect.bottom + gap
  aboveAnchor.value = below + height > window.innerHeight - gap
  const top = aboveAnchor.value ? Math.max(gap, rect.top - height - gap) : below
  position.value = { left: `${left}px`, top: `${top}px` }
}

function handleOutside(event: PointerEvent) {
  const target = event.target
  if (target instanceof Node && !anchor.value?.contains(target) && !popup.value?.contains(target)) dismiss()
}

function handleKey(event: KeyboardEvent) {
  if (event.key === 'Escape') dismiss()
}

watch(visible, (show, _, cleanup) => {
  if (!show) {
    emit('closed')
    return
  }
  emit('opened')
  place()
  const observer = new ResizeObserver(place)
  if (popup.value) observer.observe(popup.value)
  window.addEventListener('resize', place)
  window.addEventListener('scroll', place, true)
  document.addEventListener('pointerdown', handleOutside)
  document.addEventListener('keydown', handleKey)
  cleanup(() => {
    observer.disconnect()
    window.removeEventListener('resize', place)
    window.removeEventListener('scroll', place, true)
    document.removeEventListener('pointerdown', handleOutside)
    document.removeEventListener('keydown', handleKey)
  })
}, { flush: 'post' })

onUnmounted(() => clearTimeout(leaveTimer))
</script>

<template>
  <button
    v-bind="$attrs"
    ref="anchor"
    type="button"
    class="info-trigger"
    :aria-describedby="visible ? tooltipId : undefined"
    :aria-expanded="visible"
    @pointerenter="$event.pointerType === 'mouse' && enter()"
    @pointerleave="$event.pointerType === 'mouse' && leave()"
    @focus="focused = anchor?.matches(':focus-visible') ?? false"
    @blur="focused = false"
    @click="toggle"
  ><slot /></button>
  <Teleport to="body">
    <div v-if="visible" :id="tooltipId" ref="popup" class="info-popover" :class="{ 'is-above': aboveAnchor }" role="tooltip" :style="position" @pointerenter="enter" @pointerleave="leave">
      <slot name="detail" />
    </div>
  </Teleport>
</template>

<style scoped>
.info-trigger {
  max-width: 100%;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: none;
  color: inherit;
  text-align: inherit;
  font: inherit;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
.info-trigger:hover { color: var(--accent); }
.info-popover {
  position: fixed;
  z-index: 40;
  width: max-content;
  max-width: min(300px, calc(100vw - 16px));
  padding: 11px 13px;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--ink);
  background: var(--surface);
  box-shadow: 0 8px 26px #28203d22;
  font-size: .78rem;
  text-align: left;
  line-height: 1.45;
}
.info-popover::before {
  position: absolute;
  inset: -8px 0 auto;
  height: 8px;
  content: '';
}
.info-popover.is-above::before { inset: auto 0 -8px; }
</style>
