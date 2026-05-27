export type Category = string;

export interface Software {
  id: string;
  name: string;
  description: string;
  downloadUrl: string;
  category: Category;
  icon: string;
  tags?: string[];
  wingetId?: string;
}

export const DEFAULT_CATEGORIES: string[] = ["System", "Office", "Browsers", "Dev Tools", "Media", "Utilities"];

export const softwareList: Software[] = [];
