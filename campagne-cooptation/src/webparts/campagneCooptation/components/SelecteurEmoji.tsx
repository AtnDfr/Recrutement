import * as React from 'react';
import { Callout, DirectionalHint, IconButton } from '@fluentui/react';
import styles from './CampagneApp.module.scss';

interface Props {
  /** Identifiant unique du bouton (ancre de la bulle). */
  id: string;
  emojis: readonly string[];
  /** Appelé avant l'ouverture : permet de mémoriser la position du curseur. */
  onOuvrir?: () => void;
  onChoisir: (emoji: string) => void;
}

/** Bouton qui ouvre une grille d'emojis. Les emojis sont du texte : ils s'affichent partout dans Teams. */
export function SelecteurEmoji({ id, emojis, onOuvrir, onChoisir }: Props): JSX.Element {
  const [ouvert, setOuvert] = React.useState(false);

  return (
    <>
      <IconButton
        id={id}
        title="Emoji"
        ariaLabel="Insérer un emoji"
        // Garde la sélection dans la zone de saisie.
        onMouseDown={e => { e.preventDefault(); onOuvrir?.(); }}
        onClick={() => setOuvert(o => !o)}
        onRenderIcon={() => <span className={styles.iconeEmoji} aria-hidden="true">😊</span>}
      />
      {ouvert && (
        <Callout
          target={`#${id}`}
          onDismiss={() => setOuvert(false)}
          directionalHint={DirectionalHint.bottomLeftEdge}
          role="dialog"
          ariaLabel="Choisir un emoji"
          setInitialFocus
        >
          <div className={styles.grilleEmojis} role="listbox" aria-label="Emojis">
            {emojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                role="option"
                aria-selected={false}
                className={styles.emoji}
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onChoisir(emoji); setOuvert(false); }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Callout>
      )}
    </>
  );
}
