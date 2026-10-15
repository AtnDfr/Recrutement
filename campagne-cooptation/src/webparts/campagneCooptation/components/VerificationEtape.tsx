import * as React from 'react';
import { ColonneSource } from '../config/types';
import { Collaborateur } from '../core/types';
import { ApercuMessage } from './ApercuMessage';
import { ListeDestinataires } from './ListeDestinataires';
import styles from './CampagneApp.module.scss';

interface Props {
  destinataires: readonly Collaborateur[];
  colonnes: readonly ColonneSource[];
  criteres: string[];
  message: string;
}

export function VerificationEtape({ destinataires, colonnes, criteres, message }: Props): JSX.Element {
  return (
    <div className={styles.grilleEgale}>
      <section className={styles.carte} aria-labelledby="titre-synthese">
        <h2 id="titre-synthese">Synthèse</h2>
        <div className={styles.syntheseChiffre}>{destinataires.length}</div>
        <p className={styles.aide} style={{ marginTop: 0 }}>destinataire(s), un message individuel chacun</p>
        <h3>Critères utilisés</h3>
        <ul className={styles.criteres}>
          {criteres.map(c => <li key={c}>{c}</li>)}
        </ul>
        <h3>Destinataires</h3>
        <ListeDestinataires collaborateurs={destinataires} colonnes={colonnes} courte />
      </section>
      <section className={styles.carte} aria-labelledby="titre-apercu-final">
        <h2 id="titre-apercu-final">Message</h2>
        <ApercuMessage message={message} />
      </section>
    </div>
  );
}
