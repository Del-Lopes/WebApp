// Parecer estruturado da Análise IA (signals.analysis guarda JSON v2 como texto).
// Pareceres antigos são texto puro: parseAnalysis devolve null e o card mostra o texto.

export type SectionTone = 'up' | 'down' | 'neutral';

export interface AnalysisMetric { label: string; value: string; tone?: SectionTone }
export interface AnalysisSection {
  id: string;
  title: string;
  tone: SectionTone;
  metrics: AnalysisMetric[];
  text: string;
}
export interface StructuredAnalysis { v: 2; sections: AnalysisSection[]; disclaimer?: string }

const isTone = (t: unknown): t is SectionTone => t === 'up' || t === 'down' || t === 'neutral';

export function parseAnalysis(raw: string | null | undefined): StructuredAnalysis | null {
  if (!raw || raw.trimStart()[0] !== '{') return null;
  try {
    const obj = JSON.parse(raw);
    if (obj?.v !== 2 || !Array.isArray(obj.sections)) return null;
    const sections: AnalysisSection[] = obj.sections
      .filter((s: any) => s && typeof s.id === 'string' && typeof s.title === 'string')
      .map((s: any) => ({
        id: s.id,
        title: s.title,
        tone: isTone(s.tone) ? s.tone : 'neutral',
        text: typeof s.text === 'string' ? s.text : '',
        metrics: Array.isArray(s.metrics)
          ? s.metrics
              .filter((m: any) => m && typeof m.label === 'string' && typeof m.value === 'string')
              .map((m: any) => ({ label: m.label, value: m.value, tone: isTone(m.tone) ? m.tone : undefined }))
          : [],
      }));
    if (sections.length === 0) return null;
    return { v: 2, sections, disclaimer: typeof obj.disclaimer === 'string' ? obj.disclaimer : undefined };
  } catch {
    return null;
  }
}
