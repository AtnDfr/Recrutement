import { ConfigCampagne } from '../config/types';
import { lienValide } from './editeur';
import { messageVide } from './message';
import { DonneesCarte } from './modeleCarte';
import { Contenu } from './types';

export const contenuVide: Contenu = { titre: '', message: '', avecBouton: false, ctaLibelle: '', ctaUrl: '' };

export type CleControle = 'destinataires' | 'titre' | 'message' | 'bouton';

export interface Controle {
  cle: CleControle;
  libelle: string;
  ok: boolean;
  /** Ce qu'il manque, quand ok = false. */
  aide: string;
}

/** Liste de contrôle affichée dans le récapitulatif. Une campagne est prête quand tout est ok. */
export function controlerCampagne(contenu: Contenu, nbDestinataires: number, config: ConfigCampagne): Controle[] {
  const titre = contenu.titre.trim();
  const libelle = contenu.ctaLibelle.trim();
  const controles: Controle[] = [
    {
      cle: 'destinataires',
      libelle: nbDestinataires > 0 ? `${nbDestinataires} destinataire${nbDestinataires > 1 ? 's' : ''}` : 'Destinataires',
      ok: nbDestinataires > 0,
      aide: 'Choisissez au moins un grade qui contient des collaborateurs.'
    },
    {
      cle: 'titre',
      libelle: 'Titre',
      ok: titre !== '' && titre.length <= config.limites.titre,
      aide: titre === '' ? 'Ajoutez un titre.' : `Le titre dépasse ${config.limites.titre} caractères.`
    },
    { cle: 'message', libelle: 'Message', ok: !messageVide(contenu.message), aide: 'Rédigez le message.' }
  ];
  if (contenu.avecBouton) {
    const okLibelle = libelle !== '' && libelle.length <= config.limites.ctaLibelle;
    const okUrl = lienValide(contenu.ctaUrl);
    controles.push({
      cle: 'bouton',
      libelle: 'Bouton',
      ok: okLibelle && okUrl,
      aide: !okLibelle
        ? libelle === '' ? 'Donnez un libellé au bouton.' : `Le libellé dépasse ${config.limites.ctaLibelle} caractères.`
        : 'L\'adresse du bouton doit commencer par https://'
    });
  }
  return controles;
}

export function campagnePrete(contenu: Contenu, nbDestinataires: number, config: ConfigCampagne): boolean {
  return controlerCampagne(contenu, nbDestinataires, config).every(c => c.ok);
}

/** Variables injectées dans le modèle de carte. Bouton désactivé = variables du bouton vides. */
export function donneesCarte(contenu: Contenu): DonneesCarte {
  return {
    titre: contenu.titre.trim(),
    message: contenu.message.trim(),
    ctaLibelle: contenu.avecBouton ? contenu.ctaLibelle.trim() : null,
    ctaUrl: contenu.avecBouton ? contenu.ctaUrl.trim() : null
  };
}
