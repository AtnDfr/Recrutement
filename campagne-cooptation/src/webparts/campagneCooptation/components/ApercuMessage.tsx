import * as React from 'react';
import { messageVide, versHtmlTeams } from '../core/message';
import styles from './CampagneApp.module.scss';

/** Aperçu du HTML transmis à Teams. Le HTML est produit par versHtmlTeams, qui échappe toute saisie. */
export function ApercuMessage({ message }: { message: string }): JSX.Element {
  if (messageVide(message)) {
    return <div className={styles.apercu}><span className={styles.aide}>L’aperçu du message s’affichera ici.</span></div>;
  }
  return <div className={styles.apercu} dangerouslySetInnerHTML={{ __html: versHtmlTeams(message) }} />;
}
