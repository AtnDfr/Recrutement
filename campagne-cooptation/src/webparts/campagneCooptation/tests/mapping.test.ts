import { construireRequeteActeurs, versCollaborateurs } from '../core/mapping';
import { configTest } from './fixtures';

describe('lecture de la liste SharePoint', () => {
  const config = configTest();

  it('demande Title et EMail des colonnes Person, le Grade, et expand les colonnes Person', () => {
    const requete = construireRequeteActeurs(config, 500);
    expect(requete).toBe(
      '$select=Id,Acteurs/Title,Acteurs/EMail,Grade,CDM/Title,CDM/EMail,statut,TypeEntretien&$expand=Acteurs,CDM&$top=500'
    );
    expect(requete).not.toContain('JobTitle');
  });

  it('utilise l\'email fourni par SharePoint, sans le reconstruire, et garde l\'email du CDM', () => {
    const [c] = versCollaborateurs(
      {
        Id: 7,
        Acteurs: { Title: 'NOM Prénom', EMail: 'adresse.reelle@exemple.com' },
        Grade: 'Consultant',
        CDM: { Title: 'CDM X', EMail: 'cdm.x@exemple.com' },
        statut: 'Actif',
        TypeEntretien: 'CS (maker)'
      },
      config
    );
    expect(c).toEqual({
      id: '7',
      nom: 'NOM Prénom',
      email: 'adresse.reelle@exemple.com',
      grade: 'Consultant',
      champs: { cdm: 'CDM X', statut: 'Actif', typeEntretien: 'CS (maker)' },
      personnes: { cdm: [{ nom: 'CDM X', email: 'cdm.x@exemple.com' }] }
    });
  });

  it('laisse l\'email à null s\'il est absent', () => {
    const [c] = versCollaborateurs({ Id: 1, Acteurs: { Title: 'Sans Mail', EMail: '' }, Grade: 'Analyst' }, config);
    expect(c.email).toBeNull();
    expect(c.personnes.cdm).toEqual([]);
  });

  it('produit un collaborateur par personne si la colonne Person est multiple', () => {
    const liste = versCollaborateurs(
      { Id: 3, Acteurs: [{ Title: 'A', EMail: 'a@x.com' }, { Title: 'B', EMail: 'b@x.com' }], Grade: 'Manager' },
      config
    );
    expect(liste.map(c => [c.id, c.email])).toEqual([['3-0', 'a@x.com'], ['3-1', 'b@x.com']]);
  });

  it('ignore un élément sans personne', () => {
    expect(versCollaborateurs({ Id: 4, Acteurs: null, Grade: 'Manager' }, config)).toEqual([]);
  });
});
