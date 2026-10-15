import * as React from 'react';
import { ActionButton, Persona, PersonaSize, SearchBox } from '@fluentui/react';
import { rechercher } from '../core/destinataires';
import { Collaborateur } from '../core/types';
import styles from './CampagneApp.module.scss';

interface Props {
  collaborateurs: readonly Collaborateur[];
  /** Action de fin de ligne (Retirer / Réintégrer). Absente = lecture seule. */
  action?: { libelle: string; icone: string; onClic: (email: string) => void };
  recherche?: boolean;
}

/** Liste compacte de personnes : avatar, nom, grade et email. */
export function ListeDestinataires({ collaborateurs, action, recherche }: Props): JSX.Element {
  const [terme, setTerme] = React.useState('');
  const visibles = React.useMemo(() => rechercher(collaborateurs, terme), [collaborateurs, terme]);

  return (
    <div className={styles.panneauCorps} style={{ paddingTop: 0, gap: 8 }}>
      {recherche && (
        <SearchBox
          placeholder="Rechercher un nom, un email, un grade…"
          value={terme}
          onChange={(_, v) => setTerme(v ?? '')}
          ariaLabel="Rechercher dans la liste"
        />
      )}
      <ul className={styles.lignes}>
        {visibles.map(c => (
          <li key={c.id} className={styles.ligne}>
            <Persona
              text={c.nom}
              secondaryText={[c.grade, c.email ?? 'sans email'].filter(Boolean).join(' · ')}
              size={PersonaSize.size40}
              styles={{ root: { minWidth: 0, flex: 1 } }}
            />
            {action && c.email !== null && (
              <ActionButton
                iconProps={{ iconName: action.icone }}
                onClick={() => action.onClic(c.email as string)}
                ariaLabel={`${action.libelle} ${c.nom}`}
                styles={{ root: { height: 32, flex: 'none' } }}
              >
                {action.libelle}
              </ActionButton>
            )}
          </li>
        ))}
      </ul>
      {visibles.length === 0 && terme !== '' && <p className={styles.aide}>Aucun résultat pour « {terme} ».</p>}
    </div>
  );
}
