import { SPHttpClient } from './sharepoint';

/**
 * Lit le modèle unique de carte Teams depuis SharePoint, à l'exécution.
 * Remplacer ce fichier dans la bibliothèque suffit à changer la carte : aucun redéploiement SPFx.
 */
export async function chargerModeleCarte(client: SPHttpClient, urlFichier: string): Promise<unknown> {
  const reponse = await client.get(urlFichier, SPHttpClient.configurations.v1);
  if (!reponse.ok) throw new Error(`Fichier ${urlFichier} illisible (HTTP ${reponse.status}).`);
  return reponse.json();
}
