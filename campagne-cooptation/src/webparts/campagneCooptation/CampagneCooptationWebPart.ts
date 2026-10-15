import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import { CampagneApp, CampagneAppProps } from './components/CampagneApp';
import { configCampagne } from './config/campagne.config';
import { Collaborateur, PayloadFlow } from './core/types';
import { chargerCollaborateurs } from './services/acteursService';
import { transmettreCampagne } from './services/campagneService';
import { chargerModeleCarte } from './services/modeleService';

/**
 * Point d'entrée SPFx : branche les services SharePoint sur l'interface.
 * Aucune logique métier ici.
 */
export default class CampagneCooptationWebPart extends BaseClientSideWebPart<Record<string, never>> {
  private _charger!: () => Promise<Collaborateur[]>;
  private _chargerModele!: () => Promise<unknown>;
  private _transmettre!: (payload: PayloadFlow, criteres: string[]) => Promise<string>;

  protected onInit(): Promise<void> {
    const client = this.context.spHttpClient;
    this._charger = () => chargerCollaborateurs(client, configCampagne);
    this._chargerModele = () => chargerModeleCarte(client, configCampagne.urlModeleCarte);
    this._transmettre = (payload, criteres) => transmettreCampagne(client, configCampagne, payload, criteres);
    return Promise.resolve();
  }

  public render(): void {
    const element = React.createElement<CampagneAppProps>(CampagneApp, {
      config: configCampagne,
      chargerCollaborateurs: this._charger,
      chargerModele: this._chargerModele,
      transmettre: this._transmettre
    });
    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
