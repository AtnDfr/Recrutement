import * as React from 'react';
import { DefaultButton, MessageBar, MessageBarType, PrimaryButton, Spinner, SpinnerSize } from '@fluentui/react';
import { ConfigCampagne } from '../config/types';
import { decrireCriteres, preparerEnvoi } from '../core/campagne';
import { calculerCiblage } from '../core/destinataires';
import { Etape, etapeAccessible, etatInitial, reducer, verrouillee } from '../core/etat';
import { compterParGrade, gradesNonConfigures } from '../core/filtres';
import { Collaborateur, PayloadFlow } from '../core/types';
import { CiblageEtape } from './CiblageEtape';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Etapes } from './Etapes';
import { RedactionEtape } from './RedactionEtape';
import { VerificationEtape } from './VerificationEtape';
import styles from './CampagneApp.module.scss';

export interface CampagneAppProps {
  config: ConfigCampagne;
  /** Lecture de la liste SharePoint (injectée par la web part). */
  chargerCollaborateurs: () => Promise<Collaborateur[]>;
  /** Transmission au flow Power Automate (injectée par la web part). Renvoie une référence. */
  transmettre: (payload: PayloadFlow, criteres: string[]) => Promise<string>;
}

type Chargement =
  | { statut: 'enCours' }
  | { statut: 'erreur'; message: string }
  | { statut: 'pret'; collaborateurs: Collaborateur[] };

const SUIVANTE: Record<Etape, Etape | null> = { cibler: 'rediger', rediger: 'verifier', verifier: null };
const PRECEDENTE: Record<Etape, Etape | null> = { cibler: null, rediger: 'cibler', verifier: 'rediger' };

export function CampagneApp({ config, chargerCollaborateurs, transmettre }: CampagneAppProps): JSX.Element {
  const [chargement, setChargement] = React.useState<Chargement>({ statut: 'enCours' });
  const [etat, dispatch] = React.useReducer(reducer, etatInitial);

  const charger = React.useCallback((): void => {
    setChargement({ statut: 'enCours' });
    chargerCollaborateurs()
      .then(collaborateurs => setChargement({ statut: 'pret', collaborateurs }))
      .catch((e: unknown) => setChargement({ statut: 'erreur', message: e instanceof Error ? e.message : String(e) }));
  }, [chargerCollaborateurs]);

  React.useEffect(charger, [charger]);

  const collaborateurs = chargement.statut === 'pret' ? chargement.collaborateurs : [];
  const ciblage = React.useMemo(
    () => calculerCiblage(collaborateurs, { grades: etat.grades, complementaires: etat.complementaires }, etat.retraits, config),
    [collaborateurs, etat.grades, etat.complementaires, etat.retraits, config]
  );
  const compteParGrade = React.useMemo(() => compterParGrade(collaborateurs, config.grades), [collaborateurs, config]);
  const gradesHorsConfig = React.useMemo(() => gradesNonConfigures(collaborateurs, config.grades), [collaborateurs, config]);
  const nb = ciblage.destinataires.length;

  const allerA = (etape: Etape): void => dispatch({ type: 'ALLER_ETAPE', etape, nbDestinataires: nb });

  const confirmer = (): void => {
    const preparation = preparerEnvoi(etat, ciblage.destinataires, config);
    if (!preparation.ok) {
      dispatch({ type: 'ENVOI_REFUSE', raison: preparation.raison });
      return;
    }
    dispatch({ type: 'ENVOI_DEMARRE' });
    transmettre(preparation.payload, preparation.criteres)
      .then(reference => dispatch({ type: 'ENVOI_REUSSI', reference }))
      .catch((e: unknown) => dispatch({ type: 'ENVOI_ECHOUE', message: e instanceof Error ? e.message : String(e) }));
  };

  const entete = (
    <header className={styles.entete}>
      <h1>Campagne de cooptation</h1>
      <span className={styles.compteur} aria-live="polite">
        <strong>{nb}</strong> destinataire{nb > 1 ? 's' : ''}
      </span>
    </header>
  );

  if (chargement.statut === 'enCours') {
    return (
      <div className={styles.app}>
        {entete}
        <div className={styles.etatCentre}><Spinner size={SpinnerSize.large} label="Chargement des collaborateurs depuis SharePoint…" /></div>
      </div>
    );
  }

  if (chargement.statut === 'erreur') {
    return (
      <div className={styles.app}>
        {entete}
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline
          actions={<DefaultButton onClick={charger} text="Réessayer" />}
        >
          <strong>Erreur SharePoint.</strong> {chargement.message}
        </MessageBar>
      </div>
    );
  }

  if (collaborateurs.length === 0) {
    return (
      <div className={styles.app}>
        {entete}
        <MessageBar messageBarType={MessageBarType.warning}>La liste des collaborateurs est vide ou inaccessible avec vos droits.</MessageBar>
      </div>
    );
  }

  const envoi = etat.envoi;
  const suivante = SUIVANTE[etat.etape];
  const precedente = PRECEDENTE[etat.etape];

  return (
    <div className={styles.app}>
      {entete}

      {envoi.statut === 'succes' ? (
        <div className={styles.pile}>
          <MessageBar messageBarType={MessageBarType.success} isMultiline>
            <strong>Campagne transmise.</strong> Le flow Power Automate va envoyer le message à {nb} collaborateur{nb > 1 ? 's' : ''}
            {envoi.reference !== '' ? ` (référence ${envoi.reference})` : ''}. Le suivi est visible dans la liste « {config.listeCampagnes.titre} ».
          </MessageBar>
          <PrimaryButton onClick={() => dispatch({ type: 'NOUVELLE_CAMPAGNE' })} text="Nouvelle campagne" />
        </div>
      ) : (
        <>
          <Etapes courante={etat.etape} accessible={e => etapeAccessible(e, etat, nb)} onChoisir={allerA} />

          {envoi.statut === 'erreur' && (
            <MessageBar messageBarType={MessageBarType.error} isMultiline>
              <strong>Le flow n’a pas pu être déclenché.</strong> {envoi.message} Aucun message n’a été envoyé.
            </MessageBar>
          )}

          {etat.etape === 'cibler' && (
            <CiblageEtape
              config={config}
              etat={etat}
              ciblage={ciblage}
              compteParGrade={compteParGrade}
              gradesHorsConfig={gradesHorsConfig}
              dispatch={dispatch}
            />
          )}
          {etat.etape === 'rediger' && (
            <RedactionEtape message={etat.message} onChange={message => dispatch({ type: 'SAISIR_MESSAGE', message })} />
          )}
          {etat.etape === 'verifier' && (
            <VerificationEtape
              destinataires={ciblage.destinataires}
              colonnes={config.colonnes}
              criteres={decrireCriteres(etat, config)}
              message={etat.message}
            />
          )}

          <footer className={styles.pied}>
            <div>
              {precedente !== null && <DefaultButton onClick={() => allerA(precedente)} text="Précédent" iconProps={{ iconName: 'ChevronLeft' }} />}
            </div>
            <div>
              {suivante !== null ? (
                <PrimaryButton
                  onClick={() => allerA(suivante)}
                  disabled={!etapeAccessible(suivante, etat, nb)}
                  text="Suivant"
                  menuIconProps={{ iconName: 'ChevronRight' }}
                />
              ) : (
                <PrimaryButton
                  onClick={() => dispatch({ type: 'OUVRIR_CONFIRMATION', nbDestinataires: nb })}
                  disabled={!etapeAccessible('verifier', etat, nb) || verrouillee(etat)}
                  text={`Envoyer à ${nb} collaborateur${nb > 1 ? 's' : ''}…`}
                  iconProps={{ iconName: 'Send' }}
                />
              )}
            </div>
          </footer>
        </>
      )}

      <ConfirmationDialog
        ouverte={etat.confirmationOuverte}
        nbDestinataires={nb}
        enCours={envoi.statut === 'enCours'}
        onRetour={() => dispatch({ type: 'FERMER_CONFIRMATION' })}
        onConfirmer={confirmer}
      />
    </div>
  );
}
