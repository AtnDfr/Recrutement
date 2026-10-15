import * as React from 'react';
import { Icon, PrimaryButton } from '@fluentui/react';
import { Controle } from '../core/contenu';
import styles from './CampagneApp.module.scss';

interface Props {
  nbDestinataires: number;
  criteres: string[];
  controles: Controle[];
  pret: boolean;
  onVerifier: () => void;
}

/** Texte lu par les lecteurs d'écran, invisible à l'écran. */
const MASQUE: React.CSSProperties = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };

/** Récapitulatif collant : ce qui partira, ce qu'il manque, et l'accès à la vérification. */
export function Recapitulatif({ nbDestinataires, criteres, controles, pret, onVerifier }: Props): JSX.Element {
  const manquants = controles.filter(c => !c.ok).length;
  return (
    <aside className={styles.recap} aria-label="Récapitulatif">
      <div>
        <p className={`${styles.etiquette} ${styles.recapDetail}`}>Récapitulatif</p>
        <div className={styles.recapNombre} aria-live="polite">
          <strong>{nbDestinataires}</strong>
          <span>destinataire{nbDestinataires > 1 ? 's' : ''}</span>
        </div>
        <span className={styles.recapMobile}>
          {pret ? 'Prêt à vérifier' : `${manquants} élément${manquants > 1 ? 's' : ''} à compléter`}
        </span>
      </div>

      <div className={`${styles.tags} ${styles.recapDetail}`}>
        {criteres.map(c => <span key={c} className={styles.tag}>{c}</span>)}
      </div>

      <ul className={`${styles.controles} ${styles.recapDetail}`}>
        {controles.map(c => (
          <li key={c.cle} className={`${styles.controle} ${c.ok ? styles.controleOk : ''}`}>
            <span className={styles.controleIcone} aria-hidden="true">{c.ok && <Icon iconName="CheckMark" />}</span>
            <span>
              {c.libelle}
              <span style={MASQUE}>{c.ok ? ' : prêt' : ' : à compléter'}</span>
              {!c.ok && <span className={styles.controleAide}>{c.aide}</span>}
            </span>
          </li>
        ))}
      </ul>

      <div>
        <PrimaryButton text="Vérifier et envoyer" disabled={!pret} onClick={onVerifier} styles={{ root: { width: '100%' } }} />
        <p className={`${styles.aide} ${styles.recapDetail}`} style={{ marginTop: 8 }}>Rien n’est envoyé avant votre confirmation.</p>
      </div>
    </aside>
  );
}
