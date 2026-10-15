import * as React from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { AdaptiveCard, HostConfig } from 'adaptivecards';
import { markdownVersHtml } from '../core/message';
import { ResultatModele } from '../core/modeleCarte';
import styles from './CampagneApp.module.scss';

// Rendu du markdown des TextBlock, avec le même sous-ensemble que Teams.
AdaptiveCard.onProcessMarkdown = (texte, resultat) => {
  resultat.outputHtml = markdownVersHtml(texte);
  resultat.didProcess = true;
};

/** Configuration d'hôte proche de Teams (thème clair). */
const HOTE_TEAMS = new HostConfig({
  fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
  spacing: { small: 4, default: 8, medium: 12, large: 16, extraLarge: 24, padding: 16 },
  fontTypes: {
    default: {
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      fontSizes: { small: 12, default: 14, medium: 14, large: 18, extraLarge: 24 },
      fontWeights: { lighter: 300, default: 400, bolder: 600 }
    },
    monospace: {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSizes: { small: 12, default: 14, medium: 14, large: 18, extraLarge: 24 },
      fontWeights: { lighter: 300, default: 400, bolder: 600 }
    }
  },
  containerStyles: {
    default: {
      backgroundColor: '#FFFFFF',
      foregroundColors: {
        default: { default: '#242424', subtle: '#616161' },
        accent: { default: '#5B5FC7', subtle: '#5B5FC7' },
        good: { default: '#237B4B', subtle: '#237B4B' },
        warning: { default: '#C4314B', subtle: '#C4314B' },
        attention: { default: '#C4314B', subtle: '#C4314B' }
      }
    }
  },
  actions: { maxActions: 6, spacing: 'Default', buttonSpacing: 8, actionsOrientation: 'Horizontal', actionAlignment: 'Left' }
});

interface Props {
  /** Résultat de l'application du modèle : la carte exacte qui sera envoyée. */
  resultat: ResultatModele | null;
}

/** Affiche la carte telle que Teams la recevra, dans un fil de conversation. */
export function ApercuCarte({ resultat }: Props): JSX.Element {
  const conteneur = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const cible = conteneur.current;
    if (!cible) return;
    cible.innerHTML = '';
    if (resultat === null || !resultat.ok) return;
    const carte = new AdaptiveCard();
    carte.hostConfig = HOTE_TEAMS;
    // Aperçu : les boutons ne déclenchent rien.
    carte.onExecuteAction = () => undefined;
    carte.parse(resultat.carte);
    const rendu = carte.render();
    if (rendu) cible.appendChild(rendu);
  }, [resultat]);

  return (
    <div className={styles.teams}>
      <div className={styles.teamsEntete}>
        <span className={styles.teamsAvatar} aria-hidden="true">PA</span>
        <span><strong>Expéditeur du flow</strong> · maintenant</span>
      </div>
      {resultat !== null && !resultat.ok ? (
        <MessageBar messageBarType={MessageBarType.error} isMultiline>{resultat.erreur}</MessageBar>
      ) : (
        <div className={styles.teamsCarte} ref={conteneur} aria-label="Aperçu de la carte Teams" />
      )}
      {resultat !== null && resultat.ok && (
        <p className={styles.teamsNote}>Carte exacte transmise au flow · modèle {resultat.modele}</p>
      )}
    </div>
  );
}
