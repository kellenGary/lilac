import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { weekNumber, weekRangeLabel } from '@/lib/dates';
import type { PlantState } from '@/lib/plant';
import { isSearching, searchEntries, snippet } from '@/lib/search';
import { summarizeWeek } from '@/lib/summary';
import type { Entry } from '@/lib/types';
import { EntryRow, Plant, Reveal, Segmented } from '@/shared-components';
import { speciesForWeek } from '@/lib/plantSpecies';
import { useEntries } from '@/state/entries';
import { FirstEntryPrompt } from './FirstEntryPrompt';
import { SearchField, SearchIcon } from './SearchField';
import { YearView } from './YearView';

export type FeedGroup = { weekStart: string; entries: Entry[]; current: boolean; plant: PlantState };

function WeekDivider({ group }: { group: FeedGroup }) {
  const label = group.current
    ? `Week ${weekNumber(group.weekStart)}, in progress`
    : `Week ${weekNumber(group.weekStart)}, ${weekRangeLabel(group.weekStart)}`;
  return (
    <View className="flex-row items-center gap-4 border-t border-line pb-6 pt-2">
      <View className="w-28 sm:w-40" accessibilityLabel={`Plant for week ${weekNumber(group.weekStart)}`}>
        <Plant tight state={group.plant} species={speciesForWeek(group.weekStart)} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</Text>
        <Text className="max-w-[52ch] text-[15px] leading-[22px] text-body">{summarizeWeek(group.entries)}</Text>
      </View>
    </View>
  );
}

function Legend() {
  return (
    <View className="flex-row flex-wrap gap-x-3.5 gap-y-1">
      {[
        ['Depression', 'bg-depression'],
        ['Anxiety', 'bg-anxiety'],
        ['Meaning', 'bg-meaning'],
      ].map(([label, dot]) => (
        <View key={label} className="flex-row items-center gap-1.5">
          <View className={`h-2 w-2 rounded-sm ${dot}`} />
          <Text className="text-[13px] text-muted">{label}</Text>
        </View>
      ))}
    </View>
  );
}

export function Feed({ groups }: { groups: FeedGroup[] }) {
  const { entries } = useEntries();
  const [view, setView] = useState<'list' | 'year'>('list');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const showSearch = view === 'list' && searchOpen;
  const searching = showSearch && isSearching(query);
  const results = searching ? searchEntries(entries, query) : [];
  let order = 0;

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
  };

  return (
    <View>
      <View className="flex-row items-center justify-between gap-3 pb-5">
        <Text className="text-4xl font-bold tracking-normal text-ink">Journal</Text>
        {entries.length > 0 && (
          <View className="flex-row items-center gap-1">
            {view === 'list' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={searchOpen ? 'Hide search' : 'Search your entries'}
                accessibilityState={{ expanded: searchOpen }}
                onPress={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
                className={`h-11 w-11 items-center justify-center rounded-full hover:opacity-70 ${searchOpen ? 'bg-track' : ''}`}
              >
                <SearchIcon />
              </Pressable>
            )}
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: 'Entries' },
                { value: 'year', label: 'Year' },
              ]}
            />
          </View>
        )}
      </View>

      {view === 'year' ? (
        <YearView />
      ) : (
        <>
          {showSearch && (
            <Reveal style={{ paddingBottom: 16 }}>
              <SearchField value={query} onChange={setQuery} onClose={closeSearch} />
            </Reveal>
          )}
          {entries.length > 0 && !searching && (
            <View className="pb-7">
              <Legend />
            </View>
          )}

          {groups.length === 0 && <FirstEntryPrompt />}

          {searching ? (
            <View>
              <Text className="mb-4 text-sm text-muted">
                {results.length === 0
                  ? `No entries mention "${query.trim()}".`
                  : `${results.length} ${results.length === 1 ? 'entry mentions' : 'entries mention'} "${query.trim()}"`}
              </Text>
              {results.map((entry) => (
                <EntryRow key={entry.date} entry={entry} excerpt={snippet(entry.text, query)} highlight={query} />
              ))}
            </View>
          ) : (
            groups.map((group) => (
              <View key={group.weekStart}>
                <WeekDivider group={group} />
                {group.entries.map((entry) => {
                  const n = order++;
                  // Only the first screenful staggers in; the rest render plainly (fewer running animations).
                  return n < 8 ? (
                    <Reveal key={entry.date} delay={150 + n * 90}>
                      <EntryRow entry={entry} delay={150 + n * 90} />
                    </Reveal>
                  ) : (
                    <EntryRow key={entry.date} entry={entry} />
                  );
                })}
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}
