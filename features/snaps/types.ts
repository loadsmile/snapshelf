export type SnapSource = 'quick-snap' | 'camera-roll' | 'web-clip' | 'instagram' | 'manual' | 'unknown';

export type Snap = {
  id: string;
  shelfId: string | null;
  title: string | null;
  imageUrl: string | null;
  localPath: string | null;
  thought: string | null;
  labels: string[];
  source: SnapSource;
  createdAt: Date | null;
  updatedAt: Date | null;
  capturedAt: Date | null;
};

export type CreateSnapInput = {
  shelfId?: string | null;
  title?: string | null;
  imageUrl?: string | null;
  localPath?: string | null;
  thought?: string | null;
  labels?: string[];
  source?: SnapSource;
  capturedAt?: Date | null;
};
