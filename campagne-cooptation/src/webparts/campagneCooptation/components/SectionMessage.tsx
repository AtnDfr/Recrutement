import * as React from 'react';
import { ITextField, MessageBar, MessageBarType, TextField, Toggle } from '@fluentui/react';
import { ConfigCampagne } from '../config/types';
import { lienValide } from '../core/editeur';
import { ImageLisible } from '../core/contenu';
import { ResultatModele } from '../core/modeleCarte';
import { Contenu } from '../core/types';
import { ApercuCarte } from './ApercuCarte';
import { EditeurRiche } from './EditeurRiche';
import { SelecteurEmoji } from './SelecteurEmoji';
import styles from './CampagneApp.module.scss';

interface Props {
  config: ConfigCampagne;
  contenu: Contenu;
  carte: ResultatModele | null;
  imageLisible: ImageLisible;
  /** Texte d'aide propre à l'hébergement (ex. limite de la démo). */
  aideImage?: string;
  /** Change à chaque nouvelle campagne : vide l'éditeur. */
  cleEditeur: number;
  onChange: (contenu: Partial<Contenu>) => void;
}

export function SectionMessage({ config, contenu, carte, imageLisible, aideImage, cleEditeur, onChange }: Props): JSX.Element {
  const urlSaisie = contenu.ctaUrl.trim() !== '' && contenu.ctaUrl.trim() !== 'https://';
  const imageSaisie = contenu.imageUrl.trim() !== '' && contenu.imageUrl.trim() !== 'https://';
  const champTitre = React.useRef<ITextField>(null);
  const curseurTitre = React.useRef<[number, number] | null>(null);

  const memoriserCurseurTitre = (): void => {
    const c = champTitre.current;
    curseurTitre.current = c && c.selectionStart !== null && c.selectionEnd !== null ? [c.selectionStart, c.selectionEnd] : null;
  };

  const emojiDansTitre = (emoji: string): void => {
    const [debut, fin] = curseurTitre.current ?? [contenu.titre.length, contenu.titre.length];
    const avant = contenu.titre.slice(0, debut);
    // Un espace sépare l'emoji du mot qui précède.
    const insertion = avant !== '' && !/\s$/.test(avant) ? ` ${emoji}` : emoji;
    const titre = (avant + insertion + contenu.titre.slice(fin)).slice(0, config.limites.titre);
    onChange({ titre });
    const position = Math.min(debut + insertion.length, titre.length);
    curseurTitre.current = [position, position];
    setTimeout(() => {
      champTitre.current?.focus();
      champTitre.current?.setSelectionRange(position, position);
    }, 0);
  };

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
            componentRef={champTitre}
            value={contenu.titre}
            onChange={(_, v) => onChange({ titre: v ?? '' })}
            onBlur={memoriserCurseurTitre}
            maxLength={config.limites.titre}
            placeholder="Ex. On recrute en Data & IA : pensez à vos contacts"
            autoComplete="off"
            onRenderSuffix={() => (
              <SelecteurEmoji id="emoji-titre" emojis={config.emojis} onOuvrir={memoriserCurseurTitre} onChoisir={emojiDansTitre} />
            )}
            styles={{ suffix: { padding: 0, background: 'transparent' } }}
          />
          <div>
            <label className={styles.champLibelle} htmlFor="editeur-message">Message</label>
            <EditeurRiche
              key={cleEditeur}
              id="editeur-message"
              placeholder="Rédigez votre message…"
              emojis={config.emojis}
              onChange={message => onChange({ message })}
            />
          </div>
          <Toggle
            label="Ajouter une image ou un GIF"
            inlineLabel
            checked={contenu.avecImage}
            onChange={(_, v) => onChange({
              avecImage: !!v,
              imageUrl: v && contenu.imageUrl === '' ? (config.galerieImages[0]?.url ?? 'https://') : contenu.imageUrl
            })}
          />
          {contenu.avecImage && (
            <div className={styles.image}>
              {config.galerieImages.length > 0 && (
                <div className={styles.galerie} role="radiogroup" aria-label="Visuels disponibles">
                  {config.galerieImages.map(visuel => (
                    <button
                      key={visuel.url}
                      type="button"
                      role="radio"
                      aria-checked={contenu.imageUrl === visuel.url}
                      className={styles.vignette}
                      title={visuel.libelle}
                      onClick={() => onChange({ imageUrl: visuel.url })}
                    >
                      <img src={visuel.url} alt={visuel.libelle} />
                    </button>
                  ))}
                </div>
              )}
              <TextField
                label="Adresse de l'image ou du GIF"
                value={contenu.imageUrl}
                onChange={(_, v) => onChange({ imageUrl: v ?? '' })}
                placeholder="https://…/banniere.gif"
                errorMessage={imageSaisie && !lienValide(contenu.imageUrl) ? 'L\'adresse doit commencer par https://' : undefined}
              />
              {imageSaisie && lienValide(contenu.imageUrl) && imageLisible === false && (
                <MessageBar messageBarType={MessageBarType.error}>
                  Image introuvable à cette adresse : elle ne s’afficherait pas non plus chez les destinataires.
                </MessageBar>
              )}
              <p className={styles.aide}>
                L’image doit être accessible à tous les destinataires (adresse https sans connexion). PNG, JPG ou GIF animé, format bannière conseillé.
                {aideImage ? ` ${aideImage}` : ''}
              </p>
            </div>
          )}
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
