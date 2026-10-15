/**
 * Démo navigable : la VRAIE interface de la web part (components/ + core/), branchée sur des données
 * fictives et un FAUX flow. Aucun appel SharePoint, Power Automate ou Teams : rien ne peut être envoyé.
 * Seul le modèle de carte est lu (fichier publié à côté de la page), comme la web part le lira dans SharePoint.
 */
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { ChoiceGroup, registerIcons } from '@fluentui/react';
import {
  BlockedIcon, Blocked2Icon, BoldIcon, BulletedListIcon, CancelIcon, CheckMarkIcon, ChevronDownIcon, ChevronLeftIcon,
  ChevronRightIcon, ChevronUpIcon, CircleRingIcon, ClearIcon, CompletedIcon, ContactIcon, ErrorBadgeIcon, InfoIcon,
  ItalicIcon, LinkIcon, MoreIcon, NumberedListIcon, SearchIcon, SendIcon, StatusCircleCheckmarkIcon, UndoIcon, WarningIcon
} from '@fluentui/react-icons-mdl2';

import { CampagneApp } from '../lib/webparts/campagneCooptation/components/CampagneApp';
import { configCampagne } from '../lib/webparts/campagneCooptation/config/campagne.config';
import { versCollaborateurs } from '../lib/webparts/campagneCooptation/core/mapping';
import { Collaborateur, PayloadFlow } from '../lib/webparts/campagneCooptation/core/types';
import { elementsDemo } from './donneesDemo';

// Icônes en SVG : la police d'icônes Microsoft n'est pas chargée hors SharePoint.
registerIcons({
  icons: {
    Blocked: <BlockedIcon />, Blocked2: <Blocked2Icon />, Bold: <BoldIcon />, BulletedList: <BulletedListIcon />,
    Cancel: <CancelIcon />, CheckMark: <CheckMarkIcon />, ChevronDown: <ChevronDownIcon />, ChevronLeft: <ChevronLeftIcon />,
    ChevronRight: <ChevronRightIcon />, ChevronUp: <ChevronUpIcon />, CircleRing: <CircleRingIcon />, Clear: <ClearIcon />,
    Completed: <CompletedIcon />, Contact: <ContactIcon />, ErrorBadge: <ErrorBadgeIcon />, Info: <InfoIcon />,
    Italic: <ItalicIcon />, Link: <LinkIcon />, More: <MoreIcon />, NumberedList: <NumberedListIcon />, Search: <SearchIcon />,
    Send: <SendIcon />, StatusCircleCheckmark: <StatusCircleCheckmarkIcon />, Undo: <UndoIcon />, Warning: <WarningIcon />
  }
});

/**
 * Galerie de démo : visuels fictifs publiés avec la page. Les adresses sont rendues absolues,
 * comme le seront les vraies (https), pour que l'aperçu et la carte transmise soient identiques.
 */
const configDemo = {
  ...configCampagne,
  galerieImages: [
    { libelle: 'On recrute', fichier: 'banniere-on-recrute.png' },
    { libelle: 'Cooptation', fichier: 'banniere-cooptation.png' },
    { libelle: 'Data & IA', fichier: 'banniere-data-ia.png' },
    { libelle: 'Merci (GIF animé)', fichier: 'confettis.gif' }
  ].map(v => ({ libelle: v.libelle, url: new URL(`images/${v.fichier}`, document.baseURI).href }))
};

const AIDE_IMAGE_DEMO = 'Dans la démo, la sécurité de la page bloque les images externes : seules celles de la galerie s’affichent.';

type Scenario = 'normal' | 'erreurSharePoint' | 'erreurFlow' | 'listeVide';

const SCENARIOS = [
  { key: 'normal', text: 'Tout fonctionne' },
  { key: 'erreurSharePoint', text: 'Erreur de lecture SharePoint' },
  { key: 'erreurFlow', text: 'Erreur au déclenchement du flow' },
  { key: 'listeVide', text: 'Liste vide' }
];

const attendre = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

function Demo(): JSX.Element {
  const [scenario, setScenario] = React.useState<Scenario>('normal');
  const [payload, setPayload] = React.useState<PayloadFlow | null>(null);

  const charger = React.useCallback(async (): Promise<Collaborateur[]> => {
    await attendre(500);
    if (scenario === 'erreurSharePoint') {
      throw new Error('Lecture de la liste des collaborateurs impossible (HTTP 404). Vérifier le titre de la liste dans la configuration.');
    }
    if (scenario === 'listeVide') return [];
    const liste: Collaborateur[] = [];
    for (const element of elementsDemo(configCampagne)) liste.push(...versCollaborateurs(element, configCampagne));
    return liste;
  }, [scenario]);

  const chargerModele = React.useCallback(async (): Promise<unknown> => {
    const reponse = await fetch('carte-cooptation.json', { cache: 'no-store' });
    if (!reponse.ok) throw new Error(`carte-cooptation.json illisible (HTTP ${reponse.status}).`);
    return reponse.json();
  }, []);

  // FAUX flow : ne fait qu'afficher ce qui serait transmis.
  const transmettre = React.useCallback(async (p: PayloadFlow): Promise<string> => {
    await attendre(900);
    if (scenario === 'erreurFlow') {
      throw new Error('La campagne n\'a pas pu être transmise au flow (HTTP 403). Vérifier vos droits sur la liste.');
    }
    setPayload(p);
    return 'DEMO-1';
  }, [scenario]);

  return (
    <>
      <div className="demo-bandeau" role="note">
        <strong>Démo</strong> — données fictives, faux flow : aucun message ne peut être envoyé.
      </div>
      <main className="demo-app">
        <CampagneApp
          key={scenario}
          config={configDemo}
          aideImage={AIDE_IMAGE_DEMO}
          chargerCollaborateurs={charger}
          chargerModele={chargerModele}
          transmettre={transmettre}
        />
      </main>
      <aside className="demo-outils">
        <details>
          <summary>Simuler une situation</summary>
          <ChoiceGroup
            selectedKey={scenario}
            options={SCENARIOS}
            onChange={(_, o) => { if (o) { setPayload(null); setScenario(o.key as Scenario); } }}
          />
        </details>
        {payload !== null && (
          <details open>
            <summary>Ce que reçoit le flow Power Automate</summary>
            <pre>{JSON.stringify(payload, null, 2)}</pre>
          </details>
        )}
      </aside>
    </>
  );
}

ReactDom.render(<Demo />, document.getElementById('root'));
