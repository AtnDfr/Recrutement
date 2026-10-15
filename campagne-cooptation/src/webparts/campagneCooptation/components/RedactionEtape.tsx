import * as React from 'react';
import { DefaultButton, ITextField, TextField } from '@fluentui/react';
import { appliquerFormat, Format } from '../core/message';
import { ApercuMessage } from './ApercuMessage';
import styles from './CampagneApp.module.scss';

const OUTILS: { format: Format; libelle: string; icone: string }[] = [
  { format: 'gras', libelle: 'Gras', icone: 'Bold' },
  { format: 'italique', libelle: 'Italique', icone: 'Italic' },
  { format: 'puces', libelle: 'Liste à puces', icone: 'BulletedList' },
  { format: 'numeros', libelle: 'Liste numérotée', icone: 'NumberedList' },
  { format: 'lien', libelle: 'Lien', icone: 'Link' }
];

interface Props {
  message: string;
  onChange: (message: string) => void;
}

export function RedactionEtape({ message, onChange }: Props): JSX.Element {
  const champ = React.useRef<ITextField>(null);
  const selectionAVenir = React.useRef<[number, number] | null>(null);

  React.useEffect(() => {
    if (selectionAVenir.current !== null && champ.current) {
      champ.current.focus();
      champ.current.setSelectionRange(selectionAVenir.current[0], selectionAVenir.current[1]);
      selectionAVenir.current = null;
    }
  }, [message]);

  const formater = (format: Format): void => {
    const debut = champ.current?.selectionStart ?? message.length;
    const fin = champ.current?.selectionEnd ?? message.length;
    const edition = appliquerFormat(message, debut, fin, format);
    selectionAVenir.current = [edition.debut, edition.fin];
    onChange(edition.texte);
  };

  return (
    <div className={styles.grilleEgale}>
      <section className={styles.carte} aria-labelledby="titre-message">
        <h2 id="titre-message">Message Teams</h2>
        <div className={styles.barreOutils} role="toolbar" aria-label="Mise en forme">
          {OUTILS.map(o => (
            <DefaultButton
              key={o.format}
              iconProps={{ iconName: o.icone }}
              title={o.libelle}
              ariaLabel={o.libelle}
              onClick={() => formater(o.format)}
              styles={{ root: { minWidth: 36, padding: '0 6px' } }}
            />
          ))}
        </div>
        <TextField
          componentRef={champ}
          multiline
          rows={14}
          resizable
          value={message}
          onChange={(_, v) => onChange(v ?? '')}
          ariaLabel="Message"
          placeholder="Bonjour, …"
        />
        <p className={styles.aide}>
          Mise en forme : **gras**, *italique*, « - » pour une puce, « 1. » pour une liste numérotée,
          [texte](https://lien). Une ligne vide sépare deux paragraphes.
        </p>
      </section>
      <section className={styles.carte} aria-labelledby="titre-apercu">
        <h2 id="titre-apercu">Aperçu</h2>
        <ApercuMessage message={message} />
      </section>
    </div>
  );
}
