import * as React from 'react';
import { Callout, DefaultButton, DirectionalHint, IconButton, PrimaryButton, TextField } from '@fluentui/react';
import { domVersMarkdown, lienValide } from '../core/editeur';
import styles from './CampagneApp.module.scss';

/**
 * Éditeur léger (contentEditable) limité à ce que Teams affiche dans une carte :
 * gras, italique, listes, liens https. Le contenu est converti en markdown par core/editeur.ts.
 * Le collage est toujours en texte brut. Non contrôlé : changer sa `key` pour le vider.
 */

type Commande = 'bold' | 'italic' | 'insertUnorderedList' | 'insertOrderedList';

const OUTILS: { commande: Commande; libelle: string; icone: string; raccourci?: string }[] = [
  { commande: 'bold', libelle: 'Gras', icone: 'Bold', raccourci: 'Ctrl+B' },
  { commande: 'italic', libelle: 'Italique', icone: 'Italic', raccourci: 'Ctrl+I' },
  { commande: 'insertUnorderedList', libelle: 'Liste à puces', icone: 'BulletedList' },
  { commande: 'insertOrderedList', libelle: 'Liste numérotée', icone: 'NumberedList' }
];

interface Props {
  id: string;
  placeholder: string;
  onChange: (markdown: string) => void;
}

export function EditeurRiche({ id, placeholder, onChange }: Props): JSX.Element {
  const zone = React.useRef<HTMLDivElement>(null);
  const plage = React.useRef<Range | null>(null);
  const [actifs, setActifs] = React.useState<Commande[]>([]);
  const [vide, setVide] = React.useState(true);
  const [lienOuvert, setLienOuvert] = React.useState(false);
  const [url, setUrl] = React.useState('https://');

  const publier = (): void => {
    if (!zone.current) return;
    const markdown = domVersMarkdown(zone.current);
    setVide(markdown === '' && !zone.current.querySelector('li'));
    onChange(markdown);
  };

  const majEtatOutils = React.useCallback((): void => {
    const selection = document.getSelection();
    if (!zone.current || !selection || !zone.current.contains(selection.anchorNode)) return;
    setActifs(OUTILS.map(o => o.commande).filter(c => document.queryCommandState(c)));
  }, []);

  React.useEffect(() => {
    document.addEventListener('selectionchange', majEtatOutils);
    return () => document.removeEventListener('selectionchange', majEtatOutils);
  }, [majEtatOutils]);

  const memoriserSelection = (): void => {
    const selection = document.getSelection();
    if (selection && selection.rangeCount > 0 && zone.current?.contains(selection.anchorNode)) {
      plage.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restaurerSelection = (): void => {
    zone.current?.focus();
    const selection = document.getSelection();
    if (selection && plage.current) {
      selection.removeAllRanges();
      selection.addRange(plage.current);
    }
  };

  const executer = (commande: Commande): void => {
    zone.current?.focus();
    document.execCommand(commande, false);
    publier();
    majEtatOutils();
  };

  const insererLien = (): void => {
    if (!lienValide(url)) return;
    restaurerSelection();
    const selection = document.getSelection();
    if (selection && selection.isCollapsed) {
      document.execCommand('insertText', false, url);
      const fin = selection.anchorOffset;
      const noeud = selection.anchorNode;
      if (noeud) {
        const r = document.createRange();
        r.setStart(noeud, Math.max(0, fin - url.length));
        r.setEnd(noeud, fin);
        selection.removeAllRanges();
        selection.addRange(r);
      }
    }
    document.execCommand('createLink', false, url.trim());
    setLienOuvert(false);
    setUrl('https://');
    publier();
  };

  return (
    <div className={styles.editeur}>
      <div className={styles.barreOutils} role="toolbar" aria-label="Mise en forme" aria-controls={id}>
        {OUTILS.map((o, i) => (
          <React.Fragment key={o.commande}>
            {i === 2 && <span className={styles.separateurOutils} aria-hidden="true" />}
            <IconButton
              iconProps={{ iconName: o.icone }}
              title={o.raccourci ? `${o.libelle} (${o.raccourci})` : o.libelle}
              ariaLabel={o.libelle}
              checked={actifs.indexOf(o.commande) !== -1}
              // Empêche le bouton de prendre le focus : la sélection reste dans la zone de saisie.
              onMouseDown={e => e.preventDefault()}
              onClick={() => executer(o.commande)}
            />
          </React.Fragment>
        ))}
        <span className={styles.separateurOutils} aria-hidden="true" />
        <IconButton
          id={`${id}-lien`}
          iconProps={{ iconName: 'Link' }}
          title="Lien"
          ariaLabel="Insérer un lien"
          onMouseDown={e => { e.preventDefault(); memoriserSelection(); }}
          onClick={() => setLienOuvert(true)}
        />
      </div>
      <div
        id={id}
        ref={zone}
        className={`${styles.zoneSaisie} ${vide ? styles.zoneVide : ''}`}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Message"
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={publier}
        onBlur={publier}
        onPaste={e => {
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        }}
        onDrop={e => e.preventDefault()}
      />
      {lienOuvert && (
        <Callout
          target={`#${id}-lien`}
          onDismiss={() => setLienOuvert(false)}
          directionalHint={DirectionalHint.bottomLeftEdge}
          setInitialFocus
          role="dialog"
          ariaLabel="Insérer un lien"
        >
          <div style={{ padding: 16, width: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextField
              label="Adresse du lien"
              value={url}
              onChange={(_, v) => setUrl(v ?? '')}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); insererLien(); } }}
              errorMessage={url !== 'https://' && !lienValide(url) ? 'L\'adresse doit commencer par https://' : undefined}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <DefaultButton text="Annuler" onClick={() => setLienOuvert(false)} />
              <PrimaryButton text="Insérer" disabled={!lienValide(url)} onClick={insererLien} />
            </div>
          </div>
        </Callout>
      )}
    </div>
  );
}
