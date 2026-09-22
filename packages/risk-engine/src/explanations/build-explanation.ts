import type { RuleResult } from '../types.js';
import { RiskLevel, RuleId } from '@guardian/shared';

export type ExplanationLocale = 'en' | 'he';

const LEVEL_INTROS: Record<ExplanationLocale, Record<RiskLevel, string>> = {
  en: {
    [RiskLevel.SAFE]: 'This app appears to be behaving normally.',
    [RiskLevel.UNUSUAL]: 'This app showed some unusual activity.',
    [RiskLevel.SUSPICIOUS]:
      'This app showed concerning activity that needs your attention.',
  },
  he: {
    [RiskLevel.SAFE]: 'נראה שהאפליקציה מתנהגת כרגיל.',
    [RiskLevel.UNUSUAL]: 'האפליקציה הציגה פעילות חריגה.',
    [RiskLevel.SUSPICIOUS]: 'האפליקציה הציגה פעילות מדאיגה שדורשת את תשומת לבך.',
  },
};

function localizeTriggeredReason(result: RuleResult, locale: ExplanationLocale): string {
  if (locale === 'en') {
    return result.reason;
  }

  switch (result.ruleId) {
    case RuleId.KNOWN_TRACKER: {
      if (result.triggered) {
        const domains = result.reason.replace(/^Connected to known tracker domains: /, '');
        return `התחבר לדומיינים מעקב מוכרים: ${domains}`;
      }
      return 'לא זוהו דומייני מעקב מוכרים';
    }
    case RuleId.NEW_DOMAIN: {
      if (result.triggered) {
        const domains = result.reason.replace(/^Contacted new domains: /, '');
        return `יצר קשר עם דומיינים חדשים: ${domains}`;
      }
      return 'לא זוהו דומיינים חדשים';
    }
    case RuleId.LARGE_UPLOAD: {
      if (result.triggered) {
        const mb = result.reason.replace(/^Uploaded /, '').replace(/ MB of data$/, '');
        return `העלה ${mb} MB של נתונים`;
      }
      return 'נפח העלאה בטווח הרגיל';
    }
    case RuleId.SENSITIVE_APP_BEHAVIOR: {
      if (result.triggered) {
        if (result.reason.startsWith('Accessed ') && result.reason.endsWith(' photos')) {
          const count = result.reason.replace(/^Accessed /, '').replace(/ photos$/, '');
          return `גישה ל-${count} תמונות`;
        }
        if (result.reason === 'Accessed contacts without clear purpose') {
          return 'גישה לאנשי קשר ללא מטרה ברורה';
        }
      }
      return 'לא זוהתה גישה לנתונים רגישים';
    }
    case RuleId.UNUSUAL_NETWORK_ACTIVITY: {
      if (result.triggered) {
        const match = result.reason.match(/^(\d+) connections \(usual: ~(\d+)\)$/);
        if (match) {
          return `${match[1]} חיבורים (רגיל: ~${match[2]})`;
        }
      }
      return 'פעילות רשת בטווח הרגיל';
    }
    default:
      return result.reason;
  }
}

export function buildExplanation(
  level: RiskLevel,
  results: RuleResult[],
  locale: ExplanationLocale = 'en',
): string {
  const intros = LEVEL_INTROS[locale];
  const triggered = results.filter((r) => r.triggered);
  if (triggered.length === 0) {
    return intros[RiskLevel.SAFE];
  }

  const reasons = triggered.map((r) => localizeTriggeredReason(r, locale)).join('; ');
  return `${intros[level]} ${reasons}.`;
}
