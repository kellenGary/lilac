import { weekStartKey } from '@/lib/dates';
import { Column, Container, PageHeader, Reveal, Screen } from '@/shared-components';
import { useEntries } from '@/state/entries';
import { ProfileCard } from './components/ProfileCard';
import { GardenSection } from './components/GardenSection';

/** Who you are, a little of what you have built, and your garden. Settings are behind the gear in the header. */
export function ProfilePage() {
  const { entries, streak } = useEntries();
  const weeks = new Set(entries.map((e) => weekStartKey(e.date))).size;

  return (
    <Screen inTabs>
      <Container>
        <PageHeader settings />
        <Column className="pb-16">
          <Reveal style={{ marginTop: 4 }}>
            <ProfileCard entries={entries.length} streak={streak} weeks={weeks} />
          </Reveal>

          <Reveal delay={60} style={{ marginTop: 32 }}>
            <GardenSection />
          </Reveal>
        </Column>
      </Container>
    </Screen>
  );
}
