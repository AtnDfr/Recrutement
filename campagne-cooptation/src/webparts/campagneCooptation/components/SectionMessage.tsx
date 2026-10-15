import * as React from 'react';
import { TextField, Toggle } from '@fluentui/react';
import { ConfigCampagne } from '../config/types';
import { lienValide } from '../core/editeur';
import { ResultatModele } from '../core/modeleCarte';
import { Contenu } from '../core/types';
import { ApercuCarte } from './ApercuCarte';
import { EditeurRiche } from './EditeurRiche';
import styles from './CampagneApp.module.scss';

interface Props {
  config: ConfigCampagne;
  contenu: Contenu;
  carte: ResultatModele | null;
  /** Change à chaque nouvelle campagne : vide l'éditeur. */
  cleEditeur: number;
  onChange: (contenu: Partial<Contenu>) => void;
}

export function SectionMessage({ config, contenu, carte, cleEditeur, onChange }: Props): JSX.Element {
  const urlSaisie = contenu.ctaUrl.trim() !== '' && contenu.ctaUrl.trim() !== 'https://';

  return (
    <section className={styles.section} aria-labelledby="titre-message">
      <div className={styles.sectionTitre}>
        <h2 id="titre-message">Message</h2>
        <span className={styles.aide}>Envoyé en carte Teams, individuellement</span>
      </div>
      <div className={styles.message}>
        <div className={styles.formulaire}>
          <TextField
            label="Titre"
            value={contenu.titre}
            onChange={(_, v) => onChange({ titre: v ?? '' })}
            maxLength={config.limites.titre}
            placeholder="Ex. On recrute en Data & IA : pensez à vos contacts"
            autoComplete="off"
          />
          <div>
            <label className={styles.champLibelle} htmlFor="editeur-message">Message</label>
            <EditeurRiche
              key={cleEditeur}
              id="editeur-message"
              placeholder="Rédigez votre message…"
              onChange={message => onChange({ message })}
            />
          </div>
          <Toggle
            label="Ajouter un bouton"
            inlineLabel
            checked={contenu.avecBouton}
            onChange={(_, v) => onChange({ avecBouton: !!v, ctaUrl: v && contenu.ctaUrl === '' ? 'https://' : contenu.ctaUrl })}
          />
          {contenu.avecBouton && (
            <div className={styles.bouton}>
              <TextField
                label="Libellé du bouton"
                value={contenu.ctaLibelle}
                onChange={(_, v) => onChange({ ctaLibelle: v ?? '' })}
                maxLength={config.limites.ctaLibelle}
                placeholder="Ex. Je coopte"
              />
              <TextField
                label="Lien du bouton"
                value={contenu.ctaUrl}
                onChange={(_, v) => onChange({ ctaUrl: v ?? '' })}
                placeholder="https://…"
                errorMessage={urlSaisie && !lienValide(contenu.ctaUrl) ? 'L\'adresse doit commencer par https://' : undefined}
              />
            </div>
          )}
        </div>
        <div>
          <p className={styles.etiquette}>Aperçu dans Teams</p>
          <ApercuCarte resultat={carte} />
        </div>
      </div>
    </section>
  );
}
