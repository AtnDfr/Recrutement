import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

export const ENTETES = {
  Accept: 'application/json;odata=nometadata',
  'Content-Type': 'application/json;odata=nometadata',
  'odata-version': ''
};

/** Liste désignée par son identifiant (stable même si elle est renommée). */
export function urlListeParId(siteUrl: string, id: string): string {
  return `${siteUrl.replace(/\/$/, '')}/_api/web/lists(guid'${id.replace(/[{}]/g, '')}')`;
}

export function urlListe(siteUrl: string, titre: string): string {
  return `${siteUrl.replace(/\/$/, '')}/_api/web/lists/getbytitle('${encodeURIComponent(titre.replace(/'/g, "''"))}')`;
}

/** Erreur SharePoint lisible : statut HTTP + message renvoyé par l'API (colonne inconnue, liste introuvable…). */
export async function erreurSharePoint(reponse: SPHttpClientResponse, contexte: string): Promise<Error> {
  let detail = '';
  try {
    const corps = await reponse.json();
    detail = corps?.['odata.error']?.message?.value ?? corps?.error?.message?.value ?? corps?.error?.message ?? '';
  } catch {
    // corps non JSON : on garde le statut seul
  }
  const indice =
    reponse.status === 404 ? ' Vérifier le titre de la liste dans la configuration.' :
    reponse.status === 403 || reponse.status === 401 ? ' Vérifier vos droits sur la liste.' :
    reponse.status === 400 ? ' Vérifier les noms internes des colonnes dans la configuration.' : '';
  return new Error(`${contexte} (HTTP ${reponse.status}). ${detail}${indice}`.trim());
}

export { SPHttpClient };
