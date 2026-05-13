export type Stack = {
  id: string;
  name: string;
  coverLocalPath: string | null;
  boardX: number | null;
  boardY: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CreateStackInput = {
  name: string;
  coverLocalPath?: string | null;
  boardX?: number | null;
  boardY?: number | null;
};

export type UpdateStackCoverInput = {
  coverLocalPath: string | null;
};
