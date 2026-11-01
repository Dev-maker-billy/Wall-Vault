export type Wallpaper = {
  id: string;
  title: string;
  tags: string[];
  file_path: string;
  thumb_path: string;
  width: number;
  height: number;
  size_bytes: number | null;
  created_at: string;
};
