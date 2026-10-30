export class DumpsterStatus {
  id?: number;
  jobSiteId?: number | null;
  dumpsterLocationId?: number | null;
  dumspterSize?: number | null;
  dumspterCount?: number | null;
  miles?: number | null;
  waste?: number | null;
  createdAt: Date;
  updatedAt: Date;
}
