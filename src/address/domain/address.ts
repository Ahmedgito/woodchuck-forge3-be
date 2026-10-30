export class Address {
  id: number;
  addressFull: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
  placeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
