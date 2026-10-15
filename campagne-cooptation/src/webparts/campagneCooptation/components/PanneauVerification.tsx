import * as React from 'react';
import { DefaultButton, MessageBar, MessageBarType, Panel, PanelType, PrimaryButton } from '@fluentui/react';
import { Envoi } from '../core/etat';
import { ResultatModele } from '../core/modeleCarte';
import { Collaborateur } from '../core/types';
import { ApercuCarte } from './ApercuCarte';
import { ListeDestinataires } from './ListeDestinataires';
import styles from './CampagneApp.module.scss';

interface Props {
  ouvert: boolean;
  destinataires: readonly Collaborateur[];
  criteres: string[];
  carte: ResultatModele | null;
  envoi: Envoi;
  /** Tant que la confirmation est ouverte, le panneau ne doit pas se fermer (clics dans la boîte de dialogue). */
  confirmationOuverte: boolean;
  onModifier: () => void;
  onEnvoyer: () => void;
}

/** Vérification obligatoire : tout ce qui partira, avant la confirmation. */
export function PanneauVerification(props: Props): JSX.Element {
  const { ouvert, destinataires, criteres, carte, envoi, confirmationOuverte, onModifier, onEnvoyer } = props;
  const nb = destinataires.length;
  const enCours = envoi.statut === 'enCours';

  return (
    <Panel
      isOpen={ouvert}
      onDismiss={ev => {
        if (enCours || confirmationOuverte) {
          ev?.preventDefault();
          return;
        }
        onModifier();
      }}
      type={PanelType.custom}
      customWidth="880px"
      headerText="Vérifier la campagne"
      closeButtonAriaLabel="Fermer et revenir à l'édition"
      isFooterAtBottom
      onRenderFooterContent={() => (
        <div className={styles.piedPanneau}>
          <DefaultButton text="Modifier" onClick={onModifier} disabled={enCours} />
          <PrimaryButton
            text={`Envoyer à ${nb} collaborateur${nb > 1 ? 's' : ''}…`}
            iconProps={{ iconName: 'Send' }}
            onClick={onEnvoyer}
            disabled={enCours || nb === 0 || carte === null || !carte.ok}
          />
        </div>
      )}
    >
      {envoi.statut === 'erreur' && (
        <MessageBar messageBarType={MessageBarType.error} isMultiline styles={{ root: { marginTop: 8 } }}>
          <strong>Le flow n’a pas pu être déclenché.</strong> {envoi.message} Aucun message n’a été envoyé.
        </MessageBar>
      )}
      <div className={styles.verification}>
        <div className={styles.panneauCorps}>
          <div className={styles.recapNombre}>
            <strong>{nb}</strong>
            <span>destinataire{nb > 1 ? 's' : ''}, un message individuel chacun</span>
          </div>
          <div>
            <p className={styles.etiquette}>Critères</p>
            <div className={styles.tags}>{criteres.map(c => <span key={c} className={styles.tag}>{c}</span>)}</div>
          </div>
          <div>
            <p className={styles.etiquette}>Liste complète</p>
            <div className={styles.listeBornee}>
              <ListeDestinataires collaborateurs={destinataires} recherche={nb > 8} />
            </div>
          </div>
        </div>
        <div>
          <p className={styles.etiquette}>Carte envoyée</p>
          <ApercuCarte resultat={carte} />
        </div>
      </div>
    </Panel>
  );
}
