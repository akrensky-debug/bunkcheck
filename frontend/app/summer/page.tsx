'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadFamily, type Family } from '@/lib/agent'
import {
  addPick, answerBrief, getBoard, getBrief, removePick, skipQuestion, updatePick,
  type Board, type Brief, type BriefField, type BriefUpdate, type Context, type Option, type Pick,
} from '@/lib/summer'
import { AnswerChips, QuestionCard } from '@/components/summer/Questions'
import { KidLines, SummerBoard } from '@/components/summer/Board'
import { Button, Container, Heading, Notice, Text, TextLink } from '@/components/ui'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function summerYear() {
  const now = new Date()
  return now.getMonth() < 6 ? now.getFullYear() : now.getFullYear() + 1
}

export default function SummerPage() {
  const router = useRouter()
  const [family, setFamily] = useState<Family | null>(null)
  const [brief, setBrief] = useState<Brief | null>(null)
  const [board, setBoard] = useState<Board | null>(null)
  const [schools, setSchools] = useState<string[]>([])
  const [editing, setEditing] = useState<BriefField | null>(null)
  const [history, setHistory] = useState<BriefField[]>([])
  const [showLater, setShowLater] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Camps and prices are on screen once the board offers options: budget and drive questions matter then.
  const context = useMemo<Context[]>(
    () => (board?.kids.some(k => k.cells.some(c => c.options.length || c.picks.length)) ? ['suggestions', 'prices'] : []),
    [board],
  )

  useEffect(() => {
    loadFamily()
      .then(async f => {
        if (f.role === 'caregiver' || f.role === 'viewer') return router.replace('/household')
        setFamily(f)
        const [b, bd] = await Promise.all([getBrief(f.id), getBoard(f.id)])
        setBrief(b)
        setBoard(bd)
      })
      .catch(e => setError(e.message || 'Could not load your summer'))
    fetch(`${API}/api/v1/schools`).then(r => (r.ok ? r.json() : [])).then(setSchools).catch(() => {})
  }, [])

  async function run(step: (familyId: string) => Promise<Brief | Board | void>) {
    if (!family) return
    setBusy(true)
    setError('')
    try {
      const out = await step(family.id)
      if (out && 'chips' in out) setBrief(out)
      if (out && 'kids' in out && 'weeks' in out) setBoard(out)
      const [f, bd] = await Promise.all([loadFamily(), out && 'weeks' in out ? Promise.resolve(out as Board) : getBoard(family.id)])
      setFamily(f)
      setBoard(bd)
      if (!(out && 'chips' in out)) setBrief(await getBrief(family.id, context))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const current = editing ?? brief?.next_question?.field ?? null
  const question = current && brief
    ? (brief.next_question?.field === current ? brief.next_question : { field: current, prompt: PROMPTS[current], returning: false })
    : null

  const answer = (u: BriefUpdate) => {
    const field = current
    run(id => answerBrief(id, u, context)).then(() => {
      if (field) setHistory(h => [...h.filter(x => x !== field), field])
      setEditing(null)
    })
  }
  const skip = (notSure: boolean) => {
    const field = current
    if (!field) return
    run(id => skipQuestion(id, field, notSure, context)).then(() => {
      setHistory(h => [...h.filter(x => x !== field), field])
      setEditing(null)
    })
  }
  const back = () => {
    const prev = [...history].reverse().find(f => f !== current)
    if (prev) setEditing(prev)
  }

  const onAdd = (kid: string, week: string, o: Option, choose: boolean) =>
    run(id => addPick(id, { child_name: kid, week_of: week, camp_id: o.camp_id, session_id: o.session_id, state: choose ? 'chosen' : 'idea' }))
  const onChoose = (p: Pick) => run(id => updatePick(id, p.id, { state: 'chosen' }))
  const onRemove = (p: Pick) => run(id => removePick(id, p.id))

  if (!family || !brief || !board) {
    return <Container size="narrow" className="py-16"><Text tone="muted">{error || 'Loading your summer…'}</Text></Container>
  }

  const isNew = !brief.chips.length
  const weeks = board.weeks.map(w => w.week_of)

  return (
    <Container size="wide" className="space-y-10 py-12 sm:py-16">
      <header className="max-w-narrow space-y-3">
        <Heading level="h1">Your summer</Heading>
        <Text tone="muted">
          {isNew
            ? 'A few quick questions and your summer takes shape below. Skip anything you don’t know yet.'
            : 'Tap an answer to change it. Everything saves as you go.'}
        </Text>
        <AnswerChips chips={brief.chips} onEdit={f => setEditing(f)} />
      </header>

      {error && <Notice tone="error" className="max-w-narrow">{error}</Notice>}

      <div className="max-w-narrow">
        {question ? (
          <QuestionCard
            question={question}
            profile={family.profile as Family['profile'] & Record<string, unknown>}
            weeks={weeks}
            schools={schools}
            busy={busy}
            canGoBack={history.some(f => f !== current)}
            onAnswer={answer}
            onSkip={skip}
            onBack={back}
            onDone={editing ? () => setEditing(null) : undefined}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-line py-4">
            <Text tone="muted">That&rsquo;s everything for now.</Text>
            <TextLink href="/" arrow className="text-small">Ask the assistant</TextLink>
          </div>
        )}
        {brief.finish_later.length > 0 && (
          <div className="pt-4">
            <Button variant="quiet" onClick={() => setShowLater(s => !s)} aria-expanded={showLater}>
              Finish later ({brief.finish_later.length})
            </Button>
            {showLater && (
              <ul className="mt-2 space-y-1">
                {brief.finish_later.map(i => (
                  <li key={i.field}>
                    <Button variant="link" size="sm" onClick={() => setEditing(i.field)}>{i.prompt}</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {board.ready ? (
        <SummerBoard board={board} busy={busy} onAdd={onAdd} onChoose={onChoose} onRemove={onRemove} />
      ) : (
        <div className="max-w-narrow">
          <KidLines kids={board.kids} year={summerYear()} />
        </div>
      )}

      {!family.signed_in && brief.chips.length > 0 && (
        <div className="max-w-narrow border-t border-line pt-6">
          <Text>Save your summer so you can come back to it, and share it with your partner.</Text>
          <Button href="/signin" variant="secondary" className="mt-3">Save your summer</Button>
        </div>
      )}
    </Container>
  )
}

const PROMPTS: Record<BriefField, string> = {
  kids: 'Who’s going to camp?',
  home: 'What town are you in?',
  school: 'Which school do they go to?',
  sorted_weeks: 'Any weeks already sorted?',
  care_hours: 'Roughly when do you need care?',
  interests: 'What are they into?',
  weekly_budget: 'About how much a week, per kid?',
  max_drive_minutes: 'How far are you happy to drive?',
  sleepaway: 'Is sleepaway camp an option?',
  booked_elsewhere: 'Anything already booked outside Bunkcheck?',
}
