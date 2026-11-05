import type { Metadata } from 'next'
import { Container, Heading, List, ListRow, Section, Stack, Text, TextLink } from '@/components/ui'

// Describes what campfinder/services/ranking.py and campfinder/activity/programs.py do.
// Change this page in the same pull request as any change to how results are scored.
// tests/test_ranking_rules.py checks that payment never changes a camp's rank.

export const metadata: Metadata = {
  title: 'How we rank | Bunkcheck',
  description: 'What decides the order of camps and activities on Bunkcheck, and what never does.',
}

const CAMP_FACTORS: Array<[string, string]> = [
  ['Your child’s age', 'The camp takes kids your child’s age.'],
  ['Your dates', 'The camp has sessions in the weeks you picked. Up to three matching weeks count.'],
  ['What your child likes', 'The camp offers the kinds of programs you asked for. Up to three count.'],
  ['Distance', 'A camp under 15 miles away counts more than one 15 to 30 miles away. Farther than that adds nothing.'],
  ['Your budget', 'The weekly price is at or under the budget you set.'],
  ['A complete listing', 'The listing has its sessions, a price and a description.'],
  ['Confirmed by the camp', 'The camp’s owner looked at the listing and told us it is right. This is free for every camp.'],
  ['Recently updated', 'The listing was updated in the last 30 days.'],
]

const ACTIVITY_FACTORS: Array<[string, string]> = [
  ['Age, interests and schedule', 'Ages that fit, a match for what your child likes, and class times inside the hours you gave.'],
  ['Distance and price', 'Closer counts more, on a sliding scale. A price within your budget counts.'],
  ['Open now', 'Enrollment is open, or a trial class is offered.'],
  ['Confirmed by the provider', 'The provider confirmed the listing. This is free for every provider.'],
]

const NEVER: Array<[string, string]> = [
  ['Payment of any kind', 'A camp can’t pay to move up, and paying doesn’t move it down. Today no camp pays us anything. If camps pay us later, this rule stays.'],
  ['Our verified check', 'When we check a camp’s facts against its own records, the badge shows the date we checked. The check itself never adds to the rank, whether the camp paid for it or not.'],
  ['Questions sent to a camp', 'Whether a camp gets parents’ questions through us, or pays us when one is delivered, has no effect on where it shows up.'],
  ['Featured spots and ads', 'There are none. No camp is pinned to the top.'],
  ['Accreditation', 'An accredited camp says so in its reasons, but it doesn’t rank higher for it. You can choose to see only accredited camps.'],
  ['Your family’s info kit', 'Medical, allergy and pickup details are never used to rank camps.'],
]

function Rules({ rows }: { rows: Array<[string, string]> }) {
  return (
    <List>
      {rows.map(([title, body]) => (
        <ListRow key={title} density="compact">
          <Heading level="h3" as="h3">{title}</Heading>
          <Text tone="muted" className="mt-1">{body}</Text>
        </ListRow>
      ))}
    </List>
  )
}

export default function RankingPage() {
  return (
    <Container size="narrow" className="py-16 sm:py-24">
      <Stack gap={12}>
        <Stack gap={3}>
          <Heading level="h1">How we rank camps</Heading>
          <Text variant="lead">
            A camp ranks where it fits your family. The same search gives the same order whether a camp pays
            us or not.
          </Text>
        </Stack>

        <Section title="First, what you ruled out" divided>
          <Text>
            Camps outside your distance, your child’s age or your budget don’t appear. Neither do camps
            without something you said you need, such as transport, extended care, meals, financial aid or
            accreditation. The rest are ranked by the points below.
          </Text>
        </Section>

        <Section title="What counts, for camps" description="Each one adds to a camp’s score. Next to each result we show the reasons it matched, such as age, dates and distance." divided>
          <Rules rows={CAMP_FACTORS} />
        </Section>

        <Section title="What counts, for classes and activities" divided>
          <Rules rows={ACTIVITY_FACTORS} />
        </Section>

        <Section title="What never counts" divided>
          <Rules rows={NEVER} />
        </Section>

        <Section title="Other ways to sort" divided>
          <Text>
            You can sort by distance or by price instead. Then the order is just that: nearest first, or
            cheapest first.
          </Text>
        </Section>

        <Section title="How we keep to it" divided>
          <Stack gap={3}>
            <Text>
              The ranking code can read only a fixed list of camp facts, and none of them is about money. An
              automated test ranks the same camps with and without payment records and fails if the order or a
              single score changes. It runs on every change we make.
            </Text>
            <Text>
              If we change how ranking works, we change this page at the same time. Questions:{' '}
              <TextLink href="/support">contact support</TextLink>. See also our{' '}
              <TextLink href="/terms">terms</TextLink>.
            </Text>
          </Stack>
        </Section>
      </Stack>
    </Container>
  )
}
