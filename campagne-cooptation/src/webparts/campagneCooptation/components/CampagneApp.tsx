import * as React from 'react';
import { DefaultButton, Icon, MessageBar, MessageBarType, PrimaryButton, Spinner, SpinnerSize } from '@fluentui/react';
import { ConfigCampagne } from '../config/types';
import { carteDeLaCampagne, decrireCriteres, preparerEnvoi } from '../core/campagne';
import { campagnePrete, controlerCampagne } from '../core/contenu';
import { calculerCiblage } from '../core/destinataires';
import { etatInitial, reducer } from '../core/etat';
import { compterParGrade, optionsCdm } from '../core/filtres';
import { Collaborateur, PayloadFlow } from '../core/types';
import { ConfirmationDialog } from './ConfirmationDialog';
import { PanneauDestinataires } from './PanneauDestinataires';
import { PanneauVerification } from './PanneauVerification';
import { Recapitulatif } from './Recapitulatif';
import { SectionDestinataires } from './SectionDestinataires';
import { SectionMessage } from './SectionMessage';
import styles from './CampagneApp.module.scss';

export interface CampagneAppProps {
  config: ConfigCampagne;
  /** Lecture des collaborateurs (SharePoint, ou données de démo). */
  chargerCollaborateurs: () => Promise<Collaborateur[]>;
  /** Lecture du modèle unique de carte Teams (fichier JSON, chargé à l'exécution). */
  chargerModele: () => Promise<unknown>;
  /** Transmission au flow Power Automate (ou faux flow en démo). Renvoie une référence. */
  transmettre: (payload: PayloadFlow, criteres: string[]) => Promise<string>;
}

type Chargement =
  | { statut: 'enCours' }
  | { statut: 'erreur'; titre: string; message: string }
  | { statut: 'pret'; collaborateurs: Collaborateur[]; modele: unknown };

function messageErreur(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Relance l'erreur en précisant ce qui n'a pas pu être chargé. */
function echec(titre: string): (e: unknown) => never {
  return e => {
    throw Object.assign(new Error(messageErreur(e)), { titre });
  };
}

export function CampagneApp({ config, chargerCollaborateurs, chargerModele, transmettre }: CampagneAppProps): JSX.Element {
  const [chargement, setChargement] = React.useState<Chargement>({ statut: 'enCours' });
  const [etat, dispatch] = React.useReducer(reducer, etatInitial);
  const [panneauListe, setPanneauListe] = React.useState(false);
  const [numeroCampagne, setNumeroCampagne] = React.useState(0);

  const charger = React.useCallback((): void => {
    setChargement({ statut: 'enCours' });
    Promise.all([
      chargerCollaborateurs().catch(echec('Erreur SharePoint.')),
      chargerModele().catch(echec('Modèle de carte introuvable.'))
    ])
      .then(([collaborateurs, modele]) => setChargement({ statut: 'pret', collaborateurs, modele }))
      .catch((e: Error & { titre?: string }) => setChargement({ statut: 'erreur', titre: e.titre ?? 'Erreur.', message: e.message }));
  }, [chargerCollaborateurs, chargerModele]);

  React.useEffect(charger, [charger]);

  const collaborateurs = chargement.statut === 'pret' ? chargement.collaborateurs : [];
  const modele = chargement.statut === 'pret' ? chargement.modele : null;

  const ciblage = React.useMemo(
    () => calculerCiblage(collaborateurs, { grades: etat.grades, complementaires: etat.complementaires, estCdm: etat.estCdm, cdms: etat.cdms }, etat.retraits, config),
    [collaborateurs, etat.grades, etat.complementaires, etat.estCdm, etat.cdms, etat.retraits, config]
  );
  const compteParGrade = React.useMemo(() => compterParGrade(collaborateurs, config.grades), [collaborateurs, config]);
  const cdms = React.useMemo(() => optionsCdm(collaborateurs, config), [collaborateurs, config]);
  const carte = React.useMemo(() => (modele === null ? null : carteDeLaCampagne(etat.contenu, modele)), [etat.contenu, modele]);

  const nb = ciblage.destinataires.length;
  const criteres = decrireCriteres(etat, config, cdms);
  const controles = controlerCampagne(etat.contenu, nb, config);
  const pret = campagnePrete(etat.contenu, nb, config) && carte !== null && carte.ok;

  const confirmer = (): void => {
    const preparation = preparerEnvoi(etat, ciblage.destinataires, modele, config, cdms);
    if (!preparation.ok) {
      dispatch({ type: 'ENVOI_REFUSE', raison: preparation.raison });
      return;
    }
    dispatch({ type: 'ENVOI_DEMARRE' });
    transmettre(preparation.payload, preparation.criteres)
      .then(reference => dispatch({ type: 'ENVOI_REUSSI', reference }))
      .catch((e: unknown) => dispatch({ type: 'ENVOI_ECHOUE', message: messageErreur(e) }));
  };

  const nouvelleCampagne = (): void => {
    dispatch({ type: 'NOUVELLE_CAMPAGNE' });
    setNumeroCampagne(n => n + 1);
  };

  const entete = (
    <header className={styles.entete}>
      <h1>Campagne de cooptation</h1>
      <p>Un message Teams individuel aux collaborateurs que vous ciblez.</p>
    </header>
  );

  if (chargement.statut === 'enCours') {
    return (
      <div className={styles.app}>
        {entete}
        <div className={styles.etatCentre}><Spinner size={SpinnerSize.large} label="Chargement des collaborateurs…" /></div>
      </div>
    );
  }

  if (chargement.statut === 'erreur') {
    return (
      <div className={styles.app}>
        {entete}
        <MessageBar messageBarType={MessageBarType.error} isMultiline actions={<DefaultButton onClick={charger} text="Réessayer" />}>
          <strong>{chargement.titre}</strong> {chargement.message}
        </MessageBar>
      </div>
    );
  }

  if (collaborateurs.length === 0) {
    return (
      <div className={styles.app}>
        {entete}
        <MessageBar messageBarType={MessageBarType.warning}>
          La liste des collaborateurs est vide, ou vos droits ne permettent pas de la lire.
        </MessageBar>
      </div>
    );
  }

  if (etat.envoi.statut === 'succes') {
    const reference = etat.envoi.reference;
    return (
      <div className={styles.app}>
        {entete}
        <div className={styles.succes}>
          <span className={styles.succesIcone} aria-hidden="true"><Icon iconName="CheckMark" /></span>
          <h2>Campagne transmise</h2>
          <p>
            Le flow va envoyer la carte « {etat.contenu.titre.trim()} » à {nb} collaborateur{nb > 1 ? 's' : ''}, un message chacun.
            {reference !== '' ? ` Référence ${reference}.` : ''} Le suivi est visible dans la liste « {config.listeCampagnes.titre} ».
          </p>
          <PrimaryButton onClick={nouvelleCampagne} text="Nouvelle campagne" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      {entete}
      {etat.envoi.statut === 'erreur' && etat.etape === 'edition' && (
        <MessageBar messageBarType={MessageBarType.error} isMultiline styles={{ root: { marginBottom: 16 } }}>
          <strong>Rien n’a été envoyé.</strong> {etat.envoi.message}
        </MessageBar>
      )}
      <div className={styles.disposition}>
        <div className={styles.colonne}>
          <SectionDestinataires
            config={config}
            etat={etat}
            ciblage={ciblage}
            compteParGrade={compteParGrade}
            cdms={cdms}
            dispatch={dispatch}
            onGererListe={() => setPanneauListe(true)}
          />
          <SectionMessage
            config={config}
            contenu={etat.contenu}
            carte={carte}
            cleEditeur={numeroCampagne}
            onChange={contenu => dispatch({ type: 'MODIFIER_CONTENU', contenu })}
          />
        </div>
        <Recapitulatif
          nbDestinataires={nb}
          criteres={criteres}
          controles={controles}
          pret={pret}
          onVerifier={() => dispatch({ type: 'OUVRIR_VERIFICATION', nbDestinataires: nb, config })}
        />
      </div>

      <PanneauDestinataires ouvert={panneauListe} ciblage={ciblage} dispatch={dispatch} onFermer={() => setPanneauListe(false)} />

      <PanneauVerification
        ouvert={etat.etape === 'verification'}
        destinataires={ciblage.destinataires}
        criteres={criteres}
        carte={carte}
        envoi={etat.envoi}
        confirmationOuverte={etat.confirmationOuverte}
        onModifier={() => dispatch({ type: 'FERMER_VERIFICATION' })}
        onEnvoyer={() => dispatch({ type: 'OUVRIR_CONFIRMATION', nbDestinataires: nb, config })}
      />

      <ConfirmationDialog
        ouverte={etat.confirmationOuverte}
        nbDestinataires={nb}
        enCours={etat.envoi.statut === 'enCours'}
        onRetour={() => dispatch({ type: 'FERMER_CONFIRMATION' })}
        onConfirmer={confirmer}
      />
    </div>
  );
}
