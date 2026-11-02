import { imageUrl } from './forumImages';

// screenshot_url guarda uma chave do R2 (novo storage) ou uma URL completa (uploads antigos).
export const journalImageSrc = (value: string): string => (/^https?:\/\//.test(value) ? value : imageUrl(value));
