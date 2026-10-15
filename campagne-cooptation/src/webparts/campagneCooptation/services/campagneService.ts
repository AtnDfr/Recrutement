import { ConfigCampagne } from '../config/types';
import { PayloadFlow } from '../core/types';
import { ENTETES, erreurSharePoint, SPHttpClient, urlListe } from './sharepoint';

/**
 * Transmet la campagne au flow Power Automate en créant un élément dans la liste « Campagnes cooptation ».
 * Le flow démarre sur « Lorsqu'un élément est créé » et se charge seul de l'envoi Teams.
 * Cette fonction n'envoie AUCUN message Teams.
 */
export async function transmettreCampagne(
  client: SPHttpClient,
  config: ConfigCampagne,
  payload: PayloadFlow,
  criteres: string[]
): Promise<string> {
  const { champs, statutInitial, titre } = config.listeCampagnes;
  const corps: Record<string, string | number> = {
    [champs.titre]: `Campagne de cooptation — ${payload.destinataires.length} destinataire(s)`,
    [champs.payload]: JSON.stringify(payload),
    [champs.nombreDestinataires]: payload.destinataires.length,
    [champs.criteres]: criteres.join('\n'),
    [champs.statut]: statutInitial
  };

  const reponse = await client.post(`${urlListe(config.siteUrl, titre)}/items`, SPHttpClient.configurations.v1, {
    headers: ENTETES,
    body: JSON.stringify(corps)
  });
  if (!reponse.ok) throw await erreurSharePoint(reponse, 'La campagne n\'a pas pu être transmise au flow');
  const element: { Id?: number } = await reponse.json();
  return element.Id !== undefined ? String(element.Id) : '';
}
