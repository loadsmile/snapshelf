import { createSnap, listAllSnaps } from '@/features/snaps/api';
import { createDefaultShelf, createShelf, getDefaultShelfPlacement, listShelves } from '@/features/shelves/api';
import { createStack, getDefaultStackPlacement } from '@/features/stacks/api';
import { createShelfThread } from '@/features/threads/api';

type SeedSampleResult = {
  created: boolean;
  message: string;
  shelfCount: number;
  snapCount: number;
};

export async function seedSampleData(userId: string): Promise<SeedSampleResult> {
  const existingSnaps = await listAllSnaps(userId);

  if (existingSnaps.length > 0) {
    return {
      created: false,
      message: 'Sample data already exists for this account.',
      shelfCount: 0,
      snapCount: 0,
    };
  }

  const existingShelves = await listShelves(userId);
  const shelvesByName = new Map(existingShelves.map((shelf) => [shelf.name.toLowerCase(), shelf]));

  const inspirationShelf = shelvesByName.get('inspiration') ?? (await createDefaultShelf(userId));
  const readingShelf = shelvesByName.get('reading list') ?? (await createShelf(userId, { name: 'Reading List', ...getDefaultShelfPlacement(1) }));
  const staysShelf = shelvesByName.get('Weekend Stays'.toLowerCase()) ?? (await createShelf(userId, { name: 'Weekend Stays', ...getDefaultShelfPlacement(2) }));
  const inspirationStack = await createStack(userId, { name: 'Inspiration Stack', ...getDefaultStackPlacement(0) });

  const snaps = [
    {
      shelfId: null,
      title: 'Avocado Toast with Radish & Herbs',
      thought: 'Maybe save this for the Saturday hosting board.',
      labels: ['Food', 'Brunch'],
      source: 'web-clip' as const,
      capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
      shelfId: null,
      title: 'Spring Capsule Wardrobe Ideas',
      thought: 'Warm neutrals and one strong burnt orange accent piece.',
      labels: ['Style'],
      source: 'instagram' as const,
      capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
    },
    {
      shelfId: inspirationShelf.id,
      title: 'Scandinavian Living Room Inspiration',
      thought: 'Soft oak, teal upholstery, simple framed botanicals.',
      labels: ['Interiors'],
      source: 'camera-roll' as const,
      capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
    },
    {
      shelfId: inspirationShelf.id,
      title: 'Muted Paint Pairing Study',
      thought: 'Sage + cream + burnt orange still feels very on-brand.',
      labels: ['Color Palette'],
      source: 'manual' as const,
      capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 52),
    },
    {
      shelfId: staysShelf.id,
      title: 'Coastal Boutique Hotel Room',
      thought: 'This is the mood for future travel shelves.',
      labels: ['Travel'],
      source: 'web-clip' as const,
      capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    },
    {
      shelfId: readingShelf.id,
      title: 'Slow Decorating Essays',
      thought: 'Longform pieces worth revisiting when building Shelf View.',
      labels: ['Reading'],
      source: 'manual' as const,
      capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 96),
    },
  ];

  for (const snap of snaps) {
    await createSnap(userId, snap);
  }

  await createShelfThread(userId, { fromStackId: inspirationStack.id, toShelfId: inspirationShelf.id });
  await createShelfThread(userId, { fromStackId: inspirationStack.id, toShelfId: readingShelf.id });
  await createShelfThread(userId, { fromStackId: inspirationStack.id, toShelfId: staysShelf.id });

  return {
    created: true,
    message: 'Sample Shelves and Snaps were added for development.',
    shelfCount: 3,
    snapCount: snaps.length,
  };
}
