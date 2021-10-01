export interface CafeResultV3 {
  id: number;
  hash_id: string;
  update_version: number;
  name: string;
  logo?: null | string;
  cover?: null | string;
  description?: null | string;
  slug?: null | string;
  domain?: null | string;
  settings: CafeSettingsResultV3;
  extensions: CafeExtensionsResultV3;
  menus: Array<MenuResultV3>;
  categories: Array<CategoryResultV3>;
  dishes: Array<DishResultV3>;
  sets: Array<SetResultV3>;
  options: Array<OptionResultV3>;
  tags: Array<TagResultV3>;
  discounts: Array<DiscountResultV3>;
  advertisements: Array<AdvertisementResultV3>;
  languages: Array<string>;
}

export interface CafeSettingsResultV3 {
  default_language: string;
  currency: string;
  skin: string;
}

export interface CafeExtensionsResultV3 {
  orders?: null | any;
  cart?: null | any;
  feedback?: null | any;
}

export interface MenuResultV3 {
  id: number;
  name: string;
  description?: null | string;
  categories_ids: Array<number>;
}

export interface CategoryResultV3 {
  id: number;
  name: string;
  description?: null | string;
  dishes_ids: Array<number>;
}

export interface DishResultV3 {
  id: number;
  name: string;
  description?: null | string;
  ingredients?: null | string;
  image?: null | string;
  preparing_time?: null | number;
  variants: Array<DishVariantResultV3>;
  options: Array<DishOptionResultV3>;
  settings: any;
}

export interface DishVariantResultV3 {
  id: number;
  name: string;
  price: number;
}

export interface DishOptionResultV3 {
  id: number;
  option_id: number;
  type: string;
  min_items?: null | number;
  max_items?: null | number;
}

export interface SetResultV3 {
  id: number;
  name: string;
  description?: null | string;
  price?: null | number;
  dishes_ids: Array<number>;
  categories_ids: Array<number>;
}

export interface OptionResultV3 {
  id: number;
  name: string;
  items: Array<OptionItemResultV3>;
}

export interface OptionItemResultV3 {
  id: number;
  name: string;
  price: number;
}

export interface TagResultV3 {
  id: number;
  label: string;
  color: string;
  dishes_ids: Array<number>;
}

export interface DiscountResultV3 {
  id: number;
  type: string;
  value: number;
  round?: null | string;
  tag_id?: null | number;
  included_dishes_ids: Array<number>;
}

export interface AdvertisementResultV3 {
  id: number;
  title: string;
  short: string;
  full?: null | string;
  color: string;
}
