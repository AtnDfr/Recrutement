import { ConfigCampagne } from '../config/types';
import { lienValide } from './editeur';
import { messageVide } from './message';
import { DonneesCarte } from './modeleCarte';
import { Contenu } from './types';

export const contenuVide: Contenu = {
  titre: '', message: '', avecBouton: false, ctaLibelle: '', ctaUrl: '', avecImage: false, imageUrl: ''
};

export type CleControle = 'destinataires' | 'titre' | 'message' | 'bouton' | 'image';

export interface Controle {
  cle: CleControle;
  libelle: string;
  ok: boolean;
  /** Ce qu'il manque, quand ok = false. */
  aide: string;
}

/**
 * État de chargement de l'image, vérifié dans le navigateur de l'expéditeur :
 * null = en cours, true = affichable, false = introuvable.
 * Une image qui ne s'affiche pas chez l'expéditeur ne s'affichera pas chez les destinataires.
 */
export type ImageLisible = boolean | null;

/** Liste de contrôle affichée dans le récapitulatif. Une campagne est prête quand tout est ok. */
export function controlerCampagne(
  contenu: Contenu,
  nbDestinataires: number,
  config: ConfigCampagne,
  imageLisible: ImageLisible = true
): Controle[] {
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
  if (contenu.avecImage) {
    const okUrl = lienValide(contenu.imageUrl);
    controles.push({
      cle: 'image',
      libelle: 'Image',
      ok: okUrl && imageLisible === true,
      aide: !okUrl
        ? 'Choisissez une image ou saisissez une adresse en https://'
        : imageLisible === null ? 'Chargement de l\'image…' : 'Image introuvable : vérifiez l\'adresse.'
    });
  }
  return controles;
}

export function campagnePrete(
  contenu: Contenu,
  nbDestinataires: number,
  config: ConfigCampagne,
  imageLisible: ImageLisible = true
): boolean {
  return controlerCampagne(contenu, nbDestinataires, config, imageLisible).every(c => c.ok);
}

/** Variables injectées dans le modèle de carte. Bouton désactivé = variables du bouton vides. */
export function donneesCarte(contenu: Contenu): DonneesCarte {
  return {
    titre: contenu.titre.trim(),
    message: contenu.message.trim(),
    ctaLibelle: contenu.avecBouton ? contenu.ctaLibelle.trim() : null,
    ctaUrl: contenu.avecBouton ? contenu.ctaUrl.trim() : null,
    imageUrl: contenu.avecImage ? contenu.imageUrl.trim() : null
  };
}
