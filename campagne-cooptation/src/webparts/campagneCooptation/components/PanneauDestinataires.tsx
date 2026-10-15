import * as React from 'react';
import { MessageBar, MessageBarType, Panel, PanelType } from '@fluentui/react';
import { Action } from '../core/etat';
import { ResultatCiblage } from '../core/types';
import { ListeDestinataires } from './ListeDestinataires';
import styles from './CampagneApp.module.scss';

interface Props {
  ouvert: boolean;
  ciblage: ResultatCiblage;
  dispatch: (action: Action) => void;
  onFermer: () => void;
}

export function PanneauDestinataires({ ouvert, ciblage, dispatch, onFermer }: Props): JSX.Element {
  const nb = ciblage.destinataires.length;
  return (
    <Panel
      isOpen={ouvert}
      onDismiss={onFermer}
      type={PanelType.medium}
      headerText={`Destinataires (${nb})`}
      closeButtonAriaLabel="Fermer"
      isLightDismiss
    >
      <div className={styles.panneauCorps}>
        <p className={styles.aide}>Retirez une personne pour qu’elle ne reçoive pas ce message. Les retraits sont conservés si vous modifiez les critères.</p>
        {ciblage.sansEmail.length > 0 && (
          <MessageBar messageBarType={MessageBarType.warning} isMultiline>
            Sans email dans SharePoint, donc exclu{ciblage.sansEmail.length > 1 ? 's' : ''} : {ciblage.sansEmail.map(c => c.nom).join(', ')}.
          </MessageBar>
        )}
        {ciblage.doublons > 0 && (
          <MessageBar>{ciblage.doublons} doublon{ciblage.doublons > 1 ? 's' : ''} d’email ignoré{ciblage.doublons > 1 ? 's' : ''} : chaque personne reçoit un seul message.</MessageBar>
        )}
        <ListeDestinataires
          collaborateurs={ciblage.destinataires}
          recherche
          action={{ libelle: 'Retirer', icone: 'Cancel', onClic: email => dispatch({ type: 'RETIRER', email }) }}
        />
        {ciblage.retires.length > 0 && (
          <div>
            <div className={styles.sectionTitre} style={{ marginBottom: 4 }}>
              <p className={styles.etiquette} style={{ margin: 0 }}>Retirés ({ciblage.retires.length})</p>
              <button type="button" className={styles.lienBouton} onClick={() => dispatch({ type: 'REINTEGRER_TOUS' })}>Tout réintégrer</button>
            </div>
            <ListeDestinataires
              collaborateurs={ciblage.retires}
              action={{ libelle: 'Réintégrer', icone: 'Undo', onClic: email => dispatch({ type: 'REINTEGRER', email }) }}
            />
          </div>
        )}
      </div>
    </Panel>
  );
}
