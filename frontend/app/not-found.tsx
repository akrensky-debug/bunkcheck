import type { Metadata } from 'next'
import { Button, Container, EmptyState } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Page not found | Bunkcheck',
  robots: { index: false },
}

// Any address the site doesn't have, and a camp page whose camp is gone (app/camps/[id]/layout.tsx).
export default function NotFound() {
  return (
    <Container className="py-10 sm:py-14">
      <EmptyState
        title="We can’t find that page."
        description="The link may be old, or the address may have a typo."
        action={<Button href="/" variant="secondary">Go to the home page</Button>}
      />
    </Container>
  )
}
