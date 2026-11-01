export type Wallpaper = {
  id: string;
  title: string;
  tags: string[];
  /** Old uploads only: the original sits in the public bucket. Null once it has been made private. */
  file_path: string | null;
  /** Private original. Only the admin can read this column; visitors never receive it. */
  original_path?: string | null;
  thumb_path: string;
  width: number;
  height: number;
  size_bytes: number | null;
  created_at: string;
};
