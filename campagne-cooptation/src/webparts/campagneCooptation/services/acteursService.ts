import { ConfigCampagne } from '../config/types';
import { construireRequeteActeurs, ElementSharePoint, versCollaborateurs } from '../core/mapping';
import { Collaborateur } from '../core/types';
import { ENTETES, erreurSharePoint, SPHttpClient, urlListe, urlListeParId } from './sharepoint';

const TAILLE_PAGE = 2000;

/** Lit toute la liste des collaborateurs (pagination incluse), avec les droits de l'utilisateur connecté. */
export async function chargerCollaborateurs(client: SPHttpClient, config: ConfigCampagne): Promise<Collaborateur[]> {
  let url: string | undefined =
    `${config.listeActeurs.id ? urlListeParId(config.siteUrl, config.listeActeurs.id) : urlListe(config.siteUrl, config.listeActeurs.titre)}/items?${construireRequeteActeurs(config, TAILLE_PAGE)}`;
  const collaborateurs: Collaborateur[] = [];

  while (url !== undefined) {
    const reponse = await client.get(url, SPHttpClient.configurations.v1, { headers: ENTETES });
    if (!reponse.ok) throw await erreurSharePoint(reponse, 'Lecture de la liste des collaborateurs impossible');
    const page: { value: ElementSharePoint[]; 'odata.nextLink'?: string } = await reponse.json();
    for (const element of page.value) collaborateurs.push(...versCollaborateurs(element, config));
    url = page['odata.nextLink'];
  }
  return collaborateurs;
}
