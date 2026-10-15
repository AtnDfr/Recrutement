import * as React from 'react';
import { Etape } from '../core/etat';
import styles from './CampagneApp.module.scss';

const ETAPES: { id: Etape; libelle: string }[] = [
  { id: 'cibler', libelle: 'Cibler' },
  { id: 'rediger', libelle: 'Rédiger' },
  { id: 'verifier', libelle: 'Vérifier & envoyer' }
];

interface Props {
  courante: Etape;
  accessible: (etape: Etape) => boolean;
  onChoisir: (etape: Etape) => void;
}

export function Etapes({ courante, accessible, onChoisir }: Props): JSX.Element {
  return (
    <nav aria-label="Étapes de la campagne">
      <ol className={styles.etapes}>
        {ETAPES.map((etape, i) => (
          <li key={etape.id}>
            <button
              type="button"
              className={etape.id === courante ? styles.active : undefined}
              aria-current={etape.id === courante ? 'step' : undefined}
              disabled={etape.id !== courante && !accessible(etape.id)}
              onClick={() => onChoisir(etape.id)}
            >
              <span className={styles.numero}>{i + 1}</span>
              {etape.libelle}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
