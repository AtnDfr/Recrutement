import * as React from 'react';
import { DefaultButton, Dialog, DialogFooter, DialogType, PrimaryButton, Spinner, SpinnerSize } from '@fluentui/react';

interface Props {
  ouverte: boolean;
  nbDestinataires: number;
  enCours: boolean;
  onRetour: () => void;
  onConfirmer: () => void;
}

export function ConfirmationDialog({ ouverte, nbDestinataires, enCours, onRetour, onConfirmer }: Props): JSX.Element {
  return (
    <Dialog
      hidden={!ouverte}
      onDismiss={enCours ? undefined : onRetour}
      dialogContentProps={{
        type: DialogType.normal,
        title: 'Confirmer l\'envoi',
        subText: `Vous êtes sur le point d'envoyer ce message individuellement à ${nbDestinataires} collaborateur${nbDestinataires > 1 ? 's' : ''}.`
      }}
      modalProps={{ isBlocking: true }}
      minWidth={340}
      maxWidth={480}
    >
      {enCours && <Spinner size={SpinnerSize.medium} label="Transmission au flow Power Automate…" />}
      <DialogFooter>
        <DefaultButton onClick={onRetour} disabled={enCours} text="Retour / Modifier" />
        <PrimaryButton onClick={onConfirmer} disabled={enCours || nbDestinataires === 0} text="Confirmer l'envoi" />
      </DialogFooter>
    </Dialog>
  );
}
