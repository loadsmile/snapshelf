export type ShelfThreadAnchorType = 'shelf' | 'stack';

export type ShelfThread = {
  id: string;
  fromType: ShelfThreadAnchorType;
  fromId: string;
  fromShelfId: string;
  fromStackId: string | null;
  toShelfId: string;
  createdAt: Date | null;
};

export type CreateShelfThreadInput = {
  fromShelfId?: string;
  fromStackId?: string;
  toShelfId: string;
};
