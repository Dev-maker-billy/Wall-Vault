export type Preset = {
  id: string;
  group: 'Mobile' | 'Desktop';
  label: string;
  ratio: string;
  width: number;
  height: number;
};

export const PRESETS: Preset[] = [
  { id: 'phone', group: 'Mobile', label: 'Phone', ratio: '9:16', width: 1080, height: 1920 },
  { id: 'tall-phone', group: 'Mobile', label: 'Tall phone', ratio: '9:20', width: 1440, height: 3200 },
  { id: 'fhd', group: 'Desktop', label: 'Full HD', ratio: '16:9', width: 1920, height: 1080 },
  { id: 'qhd', group: 'Desktop', label: '2K', ratio: '16:9', width: 2560, height: 1440 },
  { id: 'uhd', group: 'Desktop', label: '4K', ratio: '16:9', width: 3840, height: 2160 },
];

export const GROUPS: Preset['group'][] = ['Mobile', 'Desktop'];
