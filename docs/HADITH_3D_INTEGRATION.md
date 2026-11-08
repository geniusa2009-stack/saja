# Hadith → 3D world integration contract

This is the interface for a future world build that wants to place Hadith
reading stations in existing SAJA locations. **It does not modify the 3D engine,
the player, collision, camera, Blender assets, scene rendering, mission rewards
or auth.** The current world is untouched.

`src/features/hadith/integration.ts` is pure data and helper functions. It has
no scene, engine or renderer imports. A future world build can read it when it
is ready; nothing in it runs automatically.

## Why a separate contract?

The web library already owns the honest hadith presentation: Arabic matn,
direct source link, published grading, SAJA meaning explanation, demo versus
published status, and the review trail. A world station must open that same
detail screen instead of drawing its own text or inventing a summary. This
keeps one source of truth and prevents 3D content from drifting away from a
reviewed snapshot.

## The types

```ts
export type HadithWorldAnchor =
  | 'reading-nook'
  | 'courtyard-wall'
  | 'garden-bench'
  | 'caravan-stop'
  | 'night-stall'
  | 'stillness-mat';

export interface HadithWorldStation {
  id: string;              // stable station id, not a scene object name
  locationId: LocationId;  // an existing SAJA location
  hadithId: string;        // stable id from the Hadith library
  anchor: HadithWorldAnchor; // semantic spot the engine may resolve to geometry
  label: L10n;             // short station label, both languages
  invitation: L10n;        // a description/invitation, not a quotation
}
```

The `invitation` is deliberately not a hadith quotation. It is a short,
original invitation to read. The actual Arabic, reference and grading must
always come from the library record.

## Current stations

There are six stations, one per hosting location:

| Station id | Location | Hadith | Anchor |
| --- | --- | --- | --- |
| `station-village-salam` | `village` | `h-bukhari-10` | `reading-nook` |
| `station-masjid-intention` | `mosque` | `h-bukhari-1` | `courtyard-wall` |
| `station-garden-kindness` | `garden` | `h-bukhari-6018` | `garden-bench` |
| `station-library-knowledge` | `library` | `h-bukhari-5027` | `reading-nook` |
| `station-reflection-mercy` | `reflection` | `h-bukhari-7376` | `stillness-mat` |
| `station-desert-caravan` | `desert` | `h-muslim-2699a` | `caravan-stop` |

The anchors are semantic names only. The current engine does not resolve them,
and no coordinates or meshes are defined here.

## Reading a station

```ts
import {
  HADITH_WORLD_STATIONS,
  hadithStationsForLocation,
  hadithStationFor,
  resolveHadithStation,
} from '@/features/hadith/integration';
```

- `HADITH_WORLD_STATIONS` — the stable registry.
- `hadithStationsForLocation(locationId)` — copies of the stations for one
  existing location.
- `hadithStationFor(hadithId)` — the first station for a library id.
- `resolveHadithStation(station, records)` — resolves the station against the
  library the app is actually serving. It returns `null` if the record is not in
  that library.

### Resolution rule

```ts
const resolved = resolveHadithStation(station, library.items.map((i) => i.record));
if (!resolved) return; // do not render fabricated text or a fallback quotation

navigate(resolved.path); // /hadith/<id>
```

`resolveHadithStation` **must not fall back to a bundled copy** when the live
library does not contain the record. The old, unsafe shape resolved against
`HADITH_BY_ID` after the supplied list failed; that would let a station bypass
the server overlay and show a record the server is not serving. The function
therefore resolves only from the supplied `records`, and returns `null`
otherwise.

The supplied records should come from `useHadithLibrary()` (or an equivalent
read of `src/api/hadith.ts`), so the station uses the same validated published
overlay or labelled bundled demo record as the web library.

## What the world may render

Safe:

- the station label and invitation from `HadithWorldStation`, in the learner's
  language;
- a generic marker, light, arch, book icon or similar visual;
- the record's reference, Arabic and status **only after** resolving through
  the library and opening the shared detail view.

Not safe:

- writing Arabic or a “translation” directly into a texture, sign or dialogue;
- adding a hadith that is not in `HADITHS`;
- generating a reference, chain or grading;
- assuming a station is scholar-approved because the app is online;
- carrying a saved review badge into the scene;
- reciting or summarising an activity as if it were hadith text.

The detail route is the only place that presents the full matn, meaning,
grading, source and review trail. The station is an invitation to that route.

## Suggested future flow

```
player enters a location
  → hadithStationsForLocation(locationId)
  → draw a marker at the anchor the engine has chosen
  → player interacts
  → resolveHadithStation(station, currentLibraryRecords)
      null → hide the interaction / show nothing
      record → navigate(`/hadith/${record.id}`)
```

A future scene should keep its own loading/error state. It must not block player
movement, collision, camera or the existing mission systems. It should not
grant mission rewards or progress for reading; the Hadith store is separate and
quiet by design.

## Example adapter (not part of the current engine)

```tsx
import { useNavigate } from 'react-router-dom';
import { useHadithLibrary } from '@/api/hadith';
import { hadithStationsForLocation, resolveHadithStation } from './integration';
import type { LocationId } from '@/domain/types';

export function HadithStationMarker({ locationId }: { locationId: LocationId }) {
  const navigate = useNavigate();
  const library = useHadithLibrary();
  if (library.state !== 'ready') return null;
  const records = library.data.items.map((item) => item.record);

  return (
    <>
      {hadithStationsForLocation(locationId).map((station) => {
        const resolved = resolveHadithStation(station, records);
        if (!resolved) return null; // the live library does not serve this record
        return (
          <button key={station.id} type="button" onClick={() => navigate(resolved.path)}>
            {station.label.en /* use the learner's locale in real code */}
          </button>
        );
      })}
    </>
  );
}
```

This adapter is illustrative. The real world build should place the marker in
its own scene layer and use the engine's existing interaction pattern. It must
not import scene internals into `integration.ts`, and it must not use the
station registry to draw religious text without the library record.

## Status and honesty in 3D

`HadithItem.provenance` is the only status source:

- `published` — the server returned a validated, published snapshot with a
  review trail; the shared detail screen may show **Scholar-approved**;
- `demo` — the bundled record, or the server's demo listing; show the demo
  label;
- `bundled-demo` — offline copy; show **Offline demo**.

Do not use a station's existence, a scene label or a local flag as evidence of
approval. If a record is not in the live library, the station is unavailable
until it is. This is intentional: a missing record is safer than a fabricated
one.

## Tests and invariants

`src/domain/__tests__/hadith.test.ts` checks that:

- every station's `hadithId` resolves against the curated library;
- every station belongs to an existing location;
- `resolveHadithStation` returns the right path for a real record and `null`
  for a missing one;
- the helper functions return copies, not the mutable registry.

The contract remains subject to the review rules in
`docs/HADITH_CONTENT_REVIEW.md`. A published snapshot can be withdrawn or reset
to draft at any time; the station must therefore resolve at runtime rather than
caching a record in scene data.

## Out of scope

- adding geometry, meshes, materials or Blender exports;
- changing player movement, collision or camera;
- changing scene rendering or mission rewards;
- adding new world locations;
- auto-opening a station, auto-playing audio, or reciting content;
- storing hadith text in scene assets, save files or telemetry.

When the world is ready, integrate by calling the pure functions above and
opening the existing `/hadith/:id` route. No engine file needs to change today.
