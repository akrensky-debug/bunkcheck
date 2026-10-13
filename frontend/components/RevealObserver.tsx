'use client'

import { useEffect } from 'react'

const STAGGER_MS = 70
const MAX_STAGGER_MS = 420

/**
 * Fades and lifts [data-reveal] elements in as they enter the viewport.
 *
 * Content is visible by default: the hiding CSS only applies once this component has
 * mounted and put `reveal-ready` on <html>, so pages still read fine without JS.
 * Elements that enter together are staggered. New elements (e.g. search results that
 * load later) are picked up through a MutationObserver. Reduced-motion users get
 * everything immediately.
 */
export default function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    const io = new IntersectionObserver(
      entries => {
        let i = 0
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          const delay = Math.min(i * STAGGER_MS, MAX_STAGGER_MS)
          el.style.setProperty('--reveal-delay', `${delay}ms`)
          el.dataset.revealed = ''
          // Hand transitions back to the element's own styles (hover lifts etc.).
          window.setTimeout(() => { el.dataset.revealDone = '' }, delay + 700)
          io.unobserve(el)
          i++
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    const seen = new WeakSet<Element>()
    const scan = () => {
      document.querySelectorAll('[data-reveal]:not([data-revealed])').forEach(el => {
        if (seen.has(el)) return
        seen.add(el)
        io.observe(el)
      })
    }

    scan()
    root.classList.add('reveal-ready')

    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      io.disconnect()
      mo.disconnect()
      root.classList.remove('reveal-ready')
    }
  }, [])

  return null
}
