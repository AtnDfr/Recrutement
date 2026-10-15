import * as React from 'react';
import { Checkbox, Link, MessageBar, MessageBarType } from '@fluentui/react';
import { ConfigCampagne } from '../config/types';
import { critereActif } from '../core/filtres';
import { Action, EtatCampagne } from '../core/etat';
import { ResultatCiblage } from '../core/types';
import { ListeDestinataires } from './ListeDestinataires';
import styles from './CampagneApp.module.scss';

interface Props {
  config: ConfigCampagne;
  etat: EtatCampagne;
  ciblage: ResultatCiblage;
  compteParGrade: Record<string, number>;
  gradesHorsConfig: string[];
  dispatch: (action: Action) => void;
}

export function CiblageEtape({ config, etat, ciblage, compteParGrade, gradesHorsConfig, dispatch }: Props): JSX.Element {
  const tousCoches = etat.grades.length === config.grades.length;

  return (
    <div className={styles.grille}>
      <section className={styles.carte} aria-labelledby="titre-population">
        <h2 id="titre-population">Population cible</h2>
        <div className={styles.actionsLigne} style={{ marginBottom: 8 }}>
          <Link onClick={() => dispatch({ type: 'DEFINIR_GRADES', grades: tousCoches ? [] : config.grades })}>
            {tousCoches ? 'Tout décocher' : 'Tout cocher'}
          </Link>
        </div>
        <div className={styles.pile}>
          {config.grades.map(grade => (
            <div key={grade} className={styles.ligneGrade}>
              <Checkbox
                label={grade}
                checked={etat.grades.indexOf(grade) !== -1}
                onChange={() => dispatch({ type: 'BASCULER_GRADE', grade })}
              />
              <span className={styles.nombre}>{compteParGrade[grade] ?? 0}</span>
            </div>
          ))}
        </div>
        {gradesHorsConfig.length > 0 && (
          <p className={styles.aide}>Grades présents dans la liste mais non ciblables : {gradesHorsConfig.join(', ')}.</p>
        )}

        <h3>Critères complémentaires</h3>
        <div className={styles.pile}>
          {config.criteresComplementaires.map(critere => {
            const actif = critereActif(critere);
            return (
              <Checkbox
                key={critere.id}
                label={actif ? critere.libelle : `${critere.libelle} — règle à préciser`}
                disabled={!actif}
                checked={actif && etat.complementaires.indexOf(critere.id) !== -1}
                onChange={() => dispatch({ type: 'BASCULER_CRITERE', id: critere.id })}
              />
            );
          })}
        </div>
        <p className={styles.aide}>Les critères cochés se cumulent avec le grade.</p>
      </section>

      <section className={styles.carte} aria-labelledby="titre-resultat" aria-live="polite">
        <h2 id="titre-resultat">Résultat du ciblage : {ciblage.destinataires.length} destinataire(s)</h2>
        {etat.grades.length === 0 ? (
          <p className={styles.etatCentre}>Sélectionnez au moins un grade pour constituer la population.</p>
        ) : ciblage.cibles.length === 0 ? (
          <p className={styles.etatCentre}>Aucune personne ne correspond à ces critères.</p>
        ) : (
          <div className={styles.pile}>
            {ciblage.sansEmail.length > 0 && (
              <MessageBar messageBarType={MessageBarType.warning}>
                {ciblage.sansEmail.length} personne(s) ciblée(s) sans email dans SharePoint, exclue(s) :{' '}
                {ciblage.sansEmail.map(c => c.nom).join(', ')}.
              </MessageBar>
            )}
            {ciblage.doublons > 0 && (
              <MessageBar>{ciblage.doublons} doublon(s) d’email ignoré(s) : chaque personne ne reçoit qu’un message.</MessageBar>
            )}
            <ListeDestinataires
              collaborateurs={ciblage.destinataires}
              colonnes={config.colonnes}
              action={{ libelle: 'Retirer', icone: 'Cancel', onClic: email => dispatch({ type: 'RETIRER', email }) }}
            />
            {ciblage.retires.length > 0 && (
              <>
                <div className={styles.actionsLigne} style={{ justifyContent: 'space-between' }}>
                  <h3>Retirés manuellement ({ciblage.retires.length})</h3>
                  <Link onClick={() => dispatch({ type: 'REINTEGRER_TOUS' })}>Tout réintégrer</Link>
                </div>
                <ListeDestinataires
                  collaborateurs={ciblage.retires}
                  colonnes={config.colonnes}
                  courte
                  action={{ libelle: 'Réintégrer', icone: 'Undo', onClic: email => dispatch({ type: 'REINTEGRER', email }) }}
                />
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
