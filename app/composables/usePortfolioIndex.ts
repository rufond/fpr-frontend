import type { PortfolioIndex } from '~/types/portfolio'

export function usePortfolioIndex() {
  const index = useLazyAsyncData('portfolio-index', () => $fetch<PortfolioIndex>('/api/v1/portfolio'))
  usePortfolioRealtime(() => { void index.refresh() })
  return index
}

export function usePortfolioRealtime(refresh: () => void) {
  if (import.meta.client) {
    const unsubscribe = useRealtime().subscribe(['portfolio'], refresh)
    onUnmounted(unsubscribe)
  }
}
