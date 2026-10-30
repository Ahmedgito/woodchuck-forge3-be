export const WOOD_TYPE_FOLDERS = [
  { folderName: 'T2 Particle Board (laminate)', displayName: 'T2 Particle Board (laminate)' },
  { folderName: 'T1 Pallets', displayName: 'T1 Pallets' },
  { folderName: 'T1 Dimensional lumber', displayName: 'T1 Dimensional lumber' },
  { folderName: 'T4 Saw Dust', displayName: 'T4 Saw Dust' },
  { folderName: 'T2 Processed Furniture', displayName: 'T2 Processed Furniture' },
  { folderName: 'Veneer', displayName: 'Veneer' },
  { folderName: 'Green Wood', displayName: 'Green Wood' },
  { folderName: 'Construction wood', displayName: 'Construction wood' },
  { folderName: 'unknown', displayName: "I Don't Know" },
] as const;

export type WoodTypeFolderName = (typeof WOOD_TYPE_FOLDERS)[number]['folderName'];

export const VALID_FOLDER_NAMES: string[] = WOOD_TYPE_FOLDERS.map((f) => f.folderName);
