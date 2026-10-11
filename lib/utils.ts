export type AssetRecord = {
  id: string;
  name: string;
  classType: string;
  country: string;
  stage: string;
  status: string;
  owner: string;
  createdAt: string;
};

export function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(' ');
}
