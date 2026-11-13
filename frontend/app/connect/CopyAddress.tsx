'use client'

import { useState } from 'react'
import { Button, Input } from '@/components/ui'

/** The connector address in a read-only field, with a Copy button. */
export function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked (some in-app browsers): the field is selected so a long-press copies it.
      document.getElementById('connector-address')?.focus()
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        id="connector-address"
        readOnly
        aria-label="Bunkcheck connector address"
        value={address}
        onFocus={e => e.target.select()}
      />
      <Button variant="primary" onClick={copy} aria-live="polite" icon={copied ? 'check' : undefined}>
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}
