import * as React from 'react';
import { ComboBox, Facepile, IComboBoxOption, OverflowButtonType, PersonaSize } from '@fluentui/react';
import { ConfigCampagne } from '../config/types';
import { Action, EtatCampagne } from '../core/etat';
import { critereActif, OptionCdm } from '../core/filtres';
import { ResultatCiblage } from '../core/types';
import styles from './CampagneApp.module.scss';

interface Props {
  config: ConfigCampagne;
  etat: EtatCampagne;
  ciblage: ResultatCiblage;
  compteParGrade: Record<string, number>;
  gradesHorsConfig: string[];
  cdms: OptionCdm[];
  dispatch: (action: Action) => void;
  onGererListe: () => void;
}

const VISAGES = 8;

export function SectionDestinataires(props: Props): JSX.Element {
  const { config, etat, ciblage, compteParGrade, gradesHorsConfig, cdms, dispatch, onGererListe } = props;
  const tousCoches = etat.grades.length === config.grades.length;
  const nb = ciblage.destinataires.length;

  const criteres = config.criteresComplementaires.filter(critereActif);
  const groupes: { nom: string | undefined; criteres: typeof criteres }[] = [];
  for (const c of criteres) {
    const existant = c.groupe !== undefined ? groupes.find(g => g.nom === c.groupe) : undefined;
    if (existant) existant.criteres.push(c);
    else groupes.push({ nom: c.groupe, criteres: [c] });
  }

  const optionsCdm: IComboBoxOption[] = cdms.map(o => ({ key: o.email, text: `${o.nom} (${o.nbCollaborateurs})` }));

  return (
    <section className={styles.section} aria-labelledby="titre-destinataires">
      <div className={styles.sectionTitre}>
        <h2 id="titre-destinataires">Destinataires</h2>
        <button
          type="button"
          className={styles.lienBouton}
          onClick={() => dispatch({ type: 'DEFINIR_GRADES', grades: tousCoches ? [] : config.grades })}
        >
          {tousCoches ? 'Désélectionner tous les grades' : 'Tous les grades'}
        </button>
      </div>

      <div>
        <p className={styles.etiquette} id="libelle-grades">Grades</p>
        <div className={styles.pastilles} role="group" aria-labelledby="libelle-grades">
          {config.grades.map(grade => {
            const effectif = compteParGrade[grade] ?? 0;
            return (
              <button
                key={grade}
                type="button"
                className={`${styles.pastille} ${effectif === 0 ? styles.pastilleVide : ''}`}
                aria-pressed={etat.grades.indexOf(grade) !== -1}
                onClick={() => dispatch({ type: 'BASCULER_GRADE', grade })}
              >
                {grade}
                <span className={styles.compteurPastille}>{effectif}</span>
              </button>
            );
          })}
        </div>
        {gradesHorsConfig.length > 0 && (
          <p className={styles.aide} style={{ marginTop: 8 }}>Non ciblables : {gradesHorsConfig.join(', ')}.</p>
        )}
      </div>

      <div>
        <p className={styles.etiquette}>Affiner (facultatif)</p>
        <div className={styles.affiner}>
          {groupes.map(g => (
            <React.Fragment key={g.nom ?? g.criteres[0].id}>
              <span className={styles.affinerLibelle}>{g.nom === 'profil' ? 'Profil' : g.criteres[0].libelle}</span>
              <div className={styles.pastilles}>
                {g.criteres.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={styles.pastille}
                    aria-pressed={etat.complementaires.indexOf(c.id) !== -1}
                    onClick={() => dispatch({ type: 'BASCULER_CRITERE', id: c.id })}
                  >
                    {g.nom === undefined ? 'Oui' : c.libelle}
                  </button>
                ))}
              </div>
            </React.Fragment>
          ))}
          <span className={styles.affinerLibelle}>Est CDM</span>
          <div className={styles.pastilles}>
            <button
              type="button"
              className={styles.pastille}
              aria-pressed={etat.estCdm}
              onClick={() => dispatch({ type: 'BASCULER_EST_CDM' })}
            >
              Oui
            </button>
          </div>
          <span className={styles.affinerLibelle}>Collaborateurs de</span>
          <ComboBox
            multiSelect
            autoComplete="on"
            allowFreeform={false}
            placeholder={cdms.length > 0 ? 'Choisir un ou plusieurs CDM' : 'Aucun CDM avec email dans la liste'}
            disabled={cdms.length === 0}
            options={optionsCdm}
            selectedKey={etat.cdms}
            ariaLabel="Collaborateurs de (CDM)"
            onChange={(_, option) => {
              if (!option) return;
              const email = String(option.key);
              const emails = option.selected ? etat.cdms.concat(email) : etat.cdms.filter(e => e !== email);
              dispatch({ type: 'DEFINIR_CDMS', emails });
            }}
            styles={{ root: { maxWidth: 420 } }}
          />
        </div>
      </div>

      <div className={styles.resultat} aria-live="polite">
        {etat.grades.length === 0 ? (
          <p className={styles.vide}>Choisissez au moins un grade pour constituer la liste.</p>
        ) : ciblage.cibles.length === 0 ? (
          <p className={styles.vide}>Personne ne correspond à ces critères.</p>
        ) : (
          <>
            <div className={styles.resultatTexte}>
              {nb > 0 && (
                <Facepile
                  personas={ciblage.destinataires.slice(0, VISAGES).map(c => ({ personaName: c.nom }))}
                  personaSize={PersonaSize.size32}
                  maxDisplayablePersonas={VISAGES}
                  overflowButtonType={nb > VISAGES ? OverflowButtonType.descriptive : OverflowButtonType.none}
                  overflowButtonProps={{ ariaLabel: `et ${nb - VISAGES} autres`, onClick: onGererListe }}
                  overflowPersonas={nb > VISAGES ? ciblage.destinataires.slice(VISAGES).map(c => ({ personaName: c.nom })) : []}
                />
              )}
              <strong>{nb} destinataire{nb > 1 ? 's' : ''}</strong>
              {ciblage.retires.length > 0 && <span className={styles.signal}>{ciblage.retires.length} retiré{ciblage.retires.length > 1 ? 's' : ''}</span>}
              {ciblage.sansEmail.length > 0 && <span className={styles.signal}>{ciblage.sansEmail.length} sans email, exclu{ciblage.sansEmail.length > 1 ? 's' : ''}</span>}
            </div>
            <button type="button" className={styles.lienBouton} onClick={onGererListe}>Gérer la liste</button>
          </>
        )}
      </div>
    </section>
  );
}
