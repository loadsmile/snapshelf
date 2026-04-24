export type ShelfBoardVariant = 'primary' | 'arch' | 'circle-large' | 'circle-small' | 'circle-medium' | 'tall';

export type Shelf = {
  id: string;
  name: string;
  coverSnapId: string | null;
  boardX: number | null;
  boardY: number | null;
  boardVariant: ShelfBoardVariant | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CreateShelfInput = {
  name: string;
  coverSnapId?: string | null;
  boardX?: number | null;
  boardY?: number | null;
  boardVariant?: ShelfBoardVariant | null;
};
