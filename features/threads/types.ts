export type ShelfThread = {
  id: string;
  fromShelfId: string;
  toShelfId: string;
  createdAt: Date | null;
};

export type CreateShelfThreadInput = {
  fromShelfId: string;
  toShelfId: string;
};
