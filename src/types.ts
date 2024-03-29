import { OrderItemInputV3, OrderSubitemInputV3 } from "@storinka/cart";

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
    addresses: Array<CafeAddressResultV3>;
    workdays: Array<CafeWorkdayResultV3>;
    contacts: Array<CafeContactResultV3>;
    popups: Array<PopupResultV3>;
}

export interface PopupResultV3 {
    buttons: Array<PopupButtonResultV3>;
    id: number;
    position: number;
    closable: boolean;
    new_visitors_only: boolean;
    once_per_user: boolean;
    image?: null | string;
    title: string;
    text: string;
}

export interface PopupButtonResultV3 {
    id: number;
    position: number;
    action?: null | string;
    action_data?: null | any;
    text: string;
    color: string;
}

export interface CafeSettingsResultV3 {
    default_language: string;
    currency: string;
    skin: string;
}

export interface MenuResultV3 {
    id: number;
    hash_id: string;
    slug?: null | string;
    name: string;
    description?: null | string;
    image?: null | string;
    categories_ids: Array<number>;
}

export interface CategoryResultV3 {
    id: number;
    hash_id: string;
    slug?: null | string;
    name: string;
    description?: null | string;
    image?: null | string;
    dishes_ids: Array<number>;
}

export interface DishResultV3 {
    id: number;
    hash_id: string;
    slug?: null | string;
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
    hash_id: string;
    slug?: null | string;
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
    hash_id: string;
    slug?: null | string;
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
    hash_id: string;
    slug?: null | string;
    title: string;
    short: string;
    full?: null | string;
    color: string;
}

export interface CafeExtensionResultV3 {
    version: string;
}

export interface CafeAddressResultV3 {
    id: number;
    hash_id: string;
    name: string;
    address: string;
    slug: string;
    lat: number;
    lng: number;
}

export interface CafeWorkdayResultV3 {
    day: string;
    open: boolean;
    start_h: number;
    start_m: number;
    end_h: number;
    end_m: number;
}

export interface CafeContactResultV3 {
    type: string;
    value: string;
}

export interface ReviewResultV3 {
    id: number;
    name: string;
    contact: string;
    stars: number;
    message: string;
}

export interface CafeExtensionsResultV3 {
    orders?: null | OrdersCafeExtensionResultV3;
    cart?: null | CafeExtensionResultV3;
    feedback?: null | CafeExtensionResultV3;
    machine_translations?: null | CafeExtensionResultV3;
}

export interface OrdersCafeExtensionResultV3 {
    is_enabled_in_menu: boolean;
    payment: OrdersCafeExtensionPaymentResultV3;
    delivery: OrdersCafeExtensionDeliveryResultV3;
    takeout: OrdersCafeExtensionTakeoutResultV3;
    version: string;
}

export interface OrdersCafeExtensionPaymentResultV3 {
    terminal: OrdersCafeExtensionPaymentPreferencesResultV3;
    cash: OrdersCafeExtensionPaymentPreferencesResultV3;
    fondy: OrdersCafeExtensionPaymentPreferencesResultV3;
}

export interface OrdersCafeExtensionPaymentPreferencesResultV3 {
    is_enabled: boolean;
}

export interface OrdersCafeExtensionPaymentPreferencesResultV3 {
    is_enabled: boolean;
}

export interface OrdersCafeExtensionPaymentPreferencesResultV3 {
    is_enabled: boolean;
}

export interface OrdersCafeExtensionDeliveryResultV3 {
    is_enabled: boolean;
}

export interface OrdersCafeExtensionTakeoutResultV3 {
    is_enabled: boolean;
    addresses: Array<OrdersCafeExtensionTakeoutAddressResultV3>;
}

export interface OrdersCafeExtensionTakeoutAddressResultV3 {
    id: number;
    name: string;
    lat: number;
    lng: number;
}

export interface MadeOrderResultV3 {
    redirect?: null | RedirectResultV2;
    order: OrderResultV3;
}

export interface RedirectResultV2 {
    method: "get" | "post";
    url: string;
    params?: any;
}

export interface SupportedLanguageV2 {
    code: string;
    name: string;
    machine_translations: boolean;
}

export interface OrderResultV3 {
    id: number;
    hash_id: string;
    created_at: number;
    accepted_at?: null | number;
    cafe_id: number;
    cafe_name: string;
    type: string;
    payment_type: string;
    customer: OrderCustomerResultV3;
    customer_note?: null | string;
    status: string;
    cancellation_reason?: null | string;
    delivery_price: number;
    delivery_zone?: null | DeliveryZoneResultV3;
    delivery_address?: null | DeliveryAddressResultV3;
    takeout_address?: null | TakeoutAddressResultV3;
    expected_time?: null | number;
    currency: string;
    total: number;
    items: Array<OrderItemResultV3>;
}

export interface OrderCustomerResultV3 {
    id: number;
    name: string;
    phone: string;
}

export interface DeliveryZoneResultV3 {
    id: number;
    name: string;
    price?: null | number;
    free_delivery_after?: null | number;
    approximate_time: number;
    coordinates: number[][];
}

export interface DeliveryAddressResultV3 {
    short: string;
    details?: null | string;
    lat?: null | number;
    lng?: null | number;
}

export interface TakeoutAddressResultV3 {
    id: number;
    name: string;
    lat?: null | number;
    lng?: null | number;
}

export interface OrderItemResultV3 {
    id: number;
    name: string;
    price: number;
    quantity: number;
    total: number;
    subitems: Array<OrderSubItemResultV3>;
}

export interface OrderSubItemResultV3 {
    id: number;
    name: string;
    price: number;
    quantity: number;
    total: number;
}

export interface CartSubitem {
    option: OptionResultV3;
    optionItem: OptionItemResultV3;
    total: number;

    orderSubitem: OrderSubitemInputV3;
}

export interface CartItem {
    dish?: DishResultV3;
    variant?: DishVariantResultV3;
    set?: SetResultV3;
    quantity: number;
    total: number;
    totalAfterDiscounts: number;
    subitems: CartSubitem[];

    orderItem: OrderItemInputV3;
}

export interface SendReviewParams {
    private: boolean;
    name: string;
    contact: string;
    message: string;
    stars: number;
}
