export enum RoleEnum {
  'admin' = 1,
  'general_contractor' = 2,
  'power_plant' = 3,
  'end_client' = 4,
  'manufacturer' = 5,
  'cms' = 6,
  'wood_processing' = 7,
}

export const Roles: Record<RoleEnum, string> = {
  [RoleEnum.admin]: 'Admin',
  [RoleEnum.general_contractor]: 'Construction Company',
  [RoleEnum.power_plant]: 'Power Plant',
  [RoleEnum.end_client]: 'End Client',
  [RoleEnum.manufacturer]: 'Manufacturer',
  [RoleEnum.cms]: 'Cms',
  [RoleEnum.wood_processing]: 'Wood Processing',
};
