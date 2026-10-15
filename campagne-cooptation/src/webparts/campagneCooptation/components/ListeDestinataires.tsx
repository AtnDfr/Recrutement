import * as React from 'react';
import { ActionButton, SearchBox } from '@fluentui/react';
import { ColonneSource } from '../config/types';
import { rechercher } from '../core/destinataires';
import { Collaborateur } from '../core/types';
import styles from './CampagneApp.module.scss';

interface Props {
  collaborateurs: readonly Collaborateur[];
  colonnes: readonly ColonneSource[];
  /** Libellé et action de la dernière colonne (Retirer / Réintégrer). Absent = lecture seule. */
  action?: { libelle: string; icone: string; onClic: (email: string) => void };
  courte?: boolean;
}

export function ListeDestinataires({ collaborateurs, colonnes, action, courte }: Props): JSX.Element {
  const [terme, setTerme] = React.useState('');
  const visibles = React.useMemo(() => rechercher(collaborateurs, terme), [collaborateurs, terme]);
  const affichees = colonnes.filter(c => c.afficher);

  return (
    <div className={styles.pile}>
      {collaborateurs.length > 8 && (
        <SearchBox
          placeholder="Rechercher (nom, email, grade…)"
          value={terme}
          onChange={(_, v) => setTerme(v ?? '')}
          ariaLabel="Rechercher dans la liste"
        />
      )}
      <div className={`${styles.liste} ${courte ? styles.listeCourte : ''}`}>
        <table className="ms-Table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <Th>Nom</Th>
              <Th>Grade</Th>
              <Th>Email</Th>
              {affichees.map(c => <Th key={c.cle}>{c.libelle}</Th>)}
              {action && <Th><span className="ms-hiddenSm">Action</span></Th>}
            </tr>
          </thead>
          <tbody>
            {visibles.map(c => (
              <tr key={c.id}>
                <Td>{c.nom}</Td>
                <Td>{c.grade ?? '—'}</Td>
                <Td>{c.email ?? <em>sans email</em>}</Td>
                {affichees.map(col => <Td key={col.cle}>{c.champs[col.cle] ?? '—'}</Td>)}
                {action && (
                  <Td>
                    {c.email !== null && <ActionButton
                      iconProps={{ iconName: action.icone }}
                      onClick={() => action.onClic(c.email as string)}
                      ariaLabel={`${action.libelle} ${c.nom}`}
                      styles={{ root: { height: 28 } }}
                    >
                      {action.libelle}
                    </ActionButton>}
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {visibles.length === 0 && <p className={styles.etatCentre}>Aucun résultat pour « {terme} ».</p>}
      </div>
    </div>
  );
}

const cellule: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 10px',
  borderBottom: '1px solid #edebe9',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap'
};

function Th({ children }: { children: React.ReactNode }): JSX.Element {
  return <th style={{ ...cellule, position: 'sticky', top: 0, background: '#faf9f8', fontWeight: 600 }}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }): JSX.Element {
  return <td style={cellule}>{children}</td>;
}
