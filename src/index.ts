import { App, reactive, watch } from "vue";
import {
    AdvertisementResultV3,
    CafeResultV3,
    CartItem,
    CartSubitem,
    CategoryResultV3,
    DiscountResultV3,
    DishResultV3,
    DishVariantResultV3,
    MenuResultV3,
    OptionItemResultV3,
    OptionResultV3,
    ReviewResultV3,
    SendReviewParams,
    SetResultV3,
    TagResultV3
} from "./types";
import Cart, { OrderItemInputV3 } from "@storinka/cart";

export * from "./types";

export interface StorinkaImagePlaceholdersOption {
    dish: string;
    category: string;
    menu: string;
}

export interface StorinkaOptions {
    apiUrl?: string;
    apiVersion?: string;
    skinsApiUrl?: string;
    skinsApiVersion?: string;

    domain?: string;
    domains?: string[];

    keepCart?: boolean;
    keepLanguage?: boolean;

    loadSkinConfig?: boolean;

    imagePlaceholders?: StorinkaImagePlaceholdersOption;
}

export class ApiError {
    code: number;
    name: string;
    message: string;

    constructor(code: number, name: string, message: string) {
        this.code = code;
        this.name = name;
        this.message = message;
    }
}

type JSONValue = number | string | boolean | null | { [key: string]: JSONValue; };

export interface StorinkaStorage {
    setItem(key: string, value: any): void;

    removeItem(key: string): void;

    getItem(key: string, defaultValue?: JSONValue): JSONValue;
}

export class StorinkaLocalStorage implements StorinkaStorage {
    static KEY_PREFIX = "__strk_";

    getItem(key: string, defaultValue?: JSONValue): JSONValue {
        key = StorinkaLocalStorage.key(key);

        const item = localStorage.getItem(key);

        if (item == null) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }

            return null;
        }

        if (item === "undefined") {
            return null;
        }

        if (!item.startsWith("\"") && !item.startsWith("{") && item.startsWith("[")) {
            return item;
        }

        return JSON.parse(item);
    }

    removeItem(key: string): void {
        key = StorinkaLocalStorage.key(key);

        localStorage.removeItem(key);
    }

    setItem(key: string, value: any): void {
        key = StorinkaLocalStorage.key(key);

        localStorage.setItem(key, JSON.stringify(value));
    }

    static key(key: string): string {
        return StorinkaLocalStorage.KEY_PREFIX + key;
    }
}

export class Storinka {
    options: StorinkaOptions;

    state: {
        isLoading: boolean;
        id?: string;
        cafe?: CafeResultV3;
        language: string;
        skinConfig?: any;
    };

    cart: Cart;

    storage: StorinkaStorage;

    constructor(options: StorinkaOptions) {
        this.options = options;
        if (!this.options.apiUrl) {
            this.options.apiUrl = "https://api.storinka.menu"
        }
        if (!this.options.apiVersion) {
            this.options.apiVersion = "3";
        }
        if (!this.options.skinsApiUrl) {
            this.options.skinsApiUrl = "https://skins.storinka.menu"
        }
        if (!this.options.skinsApiVersion) {
            this.options.skinsApiVersion = "1";
        }
        if (!this.options.domain) {
            this.options.domain = location.hostname;
        }
        if (!this.options.domains) {
            this.options.domains = [];
        }
        if (this.options.keepCart === undefined) {
            this.options.keepCart = true;
        }
        if (this.options.keepLanguage === undefined) {
            this.options.keepLanguage = true;
        }
        if (this.options.loadSkinConfig === undefined) {
            this.options.loadSkinConfig = true;
        }
        if (this.options.imagePlaceholders === undefined) {
            this.options.imagePlaceholders = {
                dish: "",
                category: "",
                menu: "",
            } as StorinkaImagePlaceholdersOption;
        }

        this.state = reactive({
            isLoading: false,
            language: this.getBrowserLanguage(),
        });

        this.cart = reactive(new Cart());

        this.storage = new StorinkaLocalStorage();

        if (this.options.keepCart) {
            watch(this.cart, cart => {
                this.storage.setItem(this.storageKey("cart"), cart);
            }, { deep: true });
        }

        if (this.options.keepLanguage) {
            const languageFromStorage = this.storage.getItem("language");

            if (typeof languageFromStorage === "string" && languageFromStorage.length === 2) {
                this.state.language = languageFromStorage;
            } else {
                this.storage.removeItem("language");
            }
        }
    }

    install(app: App): void {
        // @ts-ignore
        app.provide("storinka", this);

        // eslint-disable-next-line no-param-reassign
        app.config.globalProperties.$storinka = this;
    }

    setCafe(id: string, language?: string): Promise<CafeResultV3> {
        if (!language) {
            language = this.state.language;
        }

        this.state.isLoading = true;
        this.state.id = id;

        this.state.language = language;
        this.storage.setItem("language", language);

        return this.invoke("getCafe", {
            id,
            language,
        })
            .then(async (cafe) => {
                this.state.cafe = cafe;

                if (this.options.loadSkinConfig) {
                    await this.loadSkinConfig();
                }

                if (this.options.keepCart) {
                    this.hydrateCart();
                }

                return cafe;
            })
            .finally(() => {
                this.state.isLoading = false;
            });
    }

    setLanguage(language: string): Promise<CafeResultV3> {
        this.state.isLoading = true;

        this.state.language = language;
        this.storage.setItem("language", language);

        return this.invoke("getCafe", {
            id: this.state.id,
            language,
        })
            .then((cafe) => {
                this.state.cafe = cafe;

                return cafe;
            })
            .finally(() => {
                this.state.isLoading = false;
            });
    }

    loadSkinConfig(): Promise<any> {
        return this.invokeSkins("getSkinCafeConfig", {
            cafe_id: this.state.cafe?.id,
            skin_slug: this.state.cafe?.settings.skin,
        }).then(skinConfig => {
            this.state.skinConfig = skinConfig;

            return skinConfig;
        });
    }

    protected generalInvoke(url: string, version: string, name: string, params: any = {}): Promise<any> {
        return fetch(
            `${url}/invoke/${version}/${name}`,
            {
                method: "post",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(params),
            },
        )
            .then(async r => {
                if (!r.ok) {
                    const response = await r.json();

                    throw new ApiError(r.status, response.error, response.message);
                }

                return r;
            })
            .then((r) => r.json())
            .then((r) => r.result);
    }

    invoke(name: string, params: any = {}): Promise<any> {
        return this.generalInvoke(this.options.apiUrl as string, this.options.apiVersion as string, name, params);
    }

    invokeSkins(name: string, params: any = {}): Promise<any> {
        return this.generalInvoke(this.options.skinsApiUrl as string, this.options.skinsApiVersion as string, name, params);
    }

    getMenu(menuId: number | string): MenuResultV3 | undefined {
        return (this.state.cafe?.menus ?? [])
            .find(menu => this.checkItemId(menu, menuId));
    }

    getCategory(categoryId: number | string): CategoryResultV3 | undefined {
        return (this.state.cafe?.categories ?? [])
            .find(category => this.checkItemId(category, categoryId));
    }

    getDish(dishId: number | string): DishResultV3 | undefined {
        return (this.state.cafe?.dishes ?? [])
            .find(dish => this.checkItemId(dish, dishId));
    }

    getDishByVariant(variantId: number): DishResultV3 | undefined {
        if (variantId === 0) {
            throw new Error("Variant id cannot be zero.")
        }

        return (this.state.cafe?.dishes ?? [])
            .find(dish => dish.variants.find(variant => variant.id === variantId));
    }

    getDishDefaultVariant(dishOrId: number | DishResultV3): DishVariantResultV3 | undefined {
        const dish = typeof dishOrId === "number" ? this.getDish(dishOrId) : dishOrId;

        return (dish?.variants ?? [])
            .find(variant => variant.id === 0);
    }

    getDishDiscount(dishOrId: DishResultV3 | number): DiscountResultV3 | null | undefined {
        const dish = typeof dishOrId === "number" ? this.getDish(dishOrId) : dishOrId;

        if (!dish) {
            return null;
        }

        return (this.state.cafe?.discounts ?? []).find((discount: DiscountResultV3) => {
            return discount.included_dishes_ids.includes(dish.id);
        });
    }

    getVariant(variantId: number): DishVariantResultV3 | undefined {
        if (variantId === 0) {
            throw new Error("Variant id cannot be zero.")
        }

        return this.state.cafe?.dishes
            .flatMap(dish => dish.variants)
            .find(variant => variant.id === variantId);
    }

    getOption(optionId: number): OptionResultV3 | undefined {
        return (this.state.cafe?.options ?? [])
            .find(option => option.id === optionId);
    }

    getOptionByItem(optionItemId: number): OptionResultV3 | undefined {
        return (this.state.cafe?.options ?? [])
            .find(option => option.items.find(optionItem => optionItem.id === optionItemId));
    }

    getOptionItem(optionItemId: number): OptionItemResultV3 | undefined {
        return this.state.cafe?.options
            .flatMap(option => option.items)
            .find(optionItem => optionItem.id === optionItemId);
    }

    getTag(tagId: number | string): TagResultV3 | undefined {
        return (this.state.cafe?.tags ?? [])
            .find(tag => this.checkItemId(tag, tagId));
    }

    getDiscount(discountId: number): DiscountResultV3 | undefined {
        return (this.state.cafe?.discounts ?? [])
            .find(discount => discount.id === discountId);
    }

    getAdvertisement(advertisementId: number | string): AdvertisementResultV3 | undefined {
        return (this.state.cafe?.advertisements ?? [])
            .find(advertisement => this.checkItemId(advertisement, advertisementId));
    }

    getSet(setId: number): SetResultV3 | undefined {
        return (this.state.cafe?.sets ?? [])
            .find(set => this.checkItemId(set, setId));
    }

    getMenuCategories(menuOrId: number | MenuResultV3): CategoryResultV3[] {
        const menu = typeof menuOrId === "number" ? this.getMenu(menuOrId) : menuOrId;

        if (!menu) {
            return [];
        }

        return menu.categories_ids
            .map(categoryId => this.getCategory(categoryId))
            .filter(category => category) as CategoryResultV3[];
    }

    getCategoryDishes(categoryOrId: number | CategoryResultV3): DishResultV3[] {
        const category = typeof categoryOrId === "number" ? this.getCategory(categoryOrId) : categoryOrId;

        if (!category) {
            return [];
        }

        return category.dishes_ids
            .map(dishId => this.getDish(dishId))
            .filter(dish => dish) as DishResultV3[];
    }

    getDishTags(dishOrId: number | DishResultV3): TagResultV3[] {
        if (!this.state.cafe) {
            return [];
        }

        const dishId = typeof dishOrId === "number" ? dishOrId : dishOrId.id;

        return this.state.cafe.tags
            .filter((tag: TagResultV3) => tag.dishes_ids.includes(dishId));
    }

    getAppPath(path: string): string {
        path = path.trim();
        if (path.startsWith("/")) {
            path = path.substr(1);
        }
        if (path.endsWith("/")) {
            path = path.substr(0, path.length - 1);
        }

        if (this.isCustomDomain()) {
            return `/${path}`;
        }

        if (!path.length) {
            return `/${this.state.id}`;
        }

        return `/${this.state.id}/${path}`
    }

    getMenuPath(menu: MenuResultV3) {
        return this.getAppPath(`${this.getItemProperId(menu)}`)
    }

    getCategoryPath(menu: MenuResultV3, category: CategoryResultV3) {
        return this.getAppPath(`${this.getItemProperId(menu)}/${this.getItemProperId(category)}`)
    }

    getDishPath(menu: MenuResultV3, category: CategoryResultV3, dish: DishResultV3) {
        return this.getAppPath(`${this.getItemProperId(menu)}/${this.getItemProperId(category)}/${this.getItemProperId(dish)}`)
    }

    getItemProperId(item: ItemWithSlugOrHashId): string {
        return item.slug || item.hash_id;
    }

    checkItemId(item: ItemWithSlugOrHashId, id: string | number): boolean {
        return item.hash_id === id || item.slug === id || item.id === id;
    }

    isCustomDomain(domain?: string) {
        if (!domain) {
            domain = this.options.domain || "";
        }

        return !(["storinka.menu", "storinka.delivery"]
            .concat(...(this.options.domains ?? []))
            .includes(domain));
    }

    getCartTotal(): number {
        return this.getCartItems()
            .map(item => item.total)
            .reduce((p, c) => p + c, 0);
    }

    getCartTotalAfterDiscounts(): number {
        return this.getCartItems()
            .map(item => item.totalAfterDiscounts)
            .reduce((p, c) => p + c, 0);
    }

    getCartItems(): CartItem[] {
        return this.cart.items.map(orderItem => this.makeCartItem(orderItem));
    }

    makeCartItem(orderItem: OrderItemInputV3): CartItem {
        const dish = orderItem.item_type === "dish" ? this.getDish(orderItem.item_id) : this.getDishByVariant(orderItem.item_id);
        if (!dish) {
            throw new Error(`Dish ${orderItem.item_id} not found!`);
        }

        const variant = orderItem.item_type === "dish" ? this.getDishDefaultVariant(orderItem.item_id) : this.getVariant(orderItem.item_id);
        if (!variant) {
            throw new Error(`Variant ${orderItem.item_id} not found!`);
        }

        const subitems = orderItem.subitems.map(orderSubitem => {
            const option = this.getOptionByItem(orderSubitem.item_id);
            if (!option) {
                throw new Error(`Option for item ${orderSubitem.item_id} not found!`);
            }

            const optionItem = this.getOptionItem(orderSubitem.item_id);
            if (!optionItem) {
                throw new Error(`Option item ${orderSubitem.item_id} not found!`);
            }

            return {
                option,
                optionItem,

                total: optionItem.price,

                orderSubitem,
            } as CartSubitem;
        });

        const subitemsTotal: number = subitems.map(subitem => subitem.total)
            .reduce((p, c) => p + c, 0);

        const quantity = orderItem.quantity;
        const total = (subitemsTotal + variant.price) * quantity;
        let totalAfterDiscounts = total;

        const discount = this.getDishDiscount(dish);
        if (discount) {
            totalAfterDiscounts = this.getPriceAfterDiscount(total, discount);
        }

        return {
            dish,
            variant,

            quantity,
            total,
            totalAfterDiscounts,

            subitems,

            orderItem,
        } as CartItem;
    }

    isDishInCart(dish: DishResultV3): boolean {
        const dishInCart = this.cart.items.find(
            (item) => item.item_type === 'dish' && item.item_id === dish.id,
        );

        const variantInCart = this.cart.items.find(
            (item) => item.item_type === 'variant' && dish.variants.map((v) => v.id)
                .includes(item.item_id),
        );

        return Boolean(dishInCart || variantInCart);
    }

    getBrowserLanguage(): string {
        let language: string = "en";

        if (navigator.language) {
            language = navigator.language.slice(0, 2);
        }

        return language;
    }

    getPriceAfterDiscount(price: number, discount: DiscountResultV3): number {
        let newPrice = price;

        if (discount.type === "percentage") {
            newPrice = price - (price * discount.value / 100);
        } else if (discount.type === "absolute" || discount.type === "diff") {
            newPrice = price - discount.value;
        } else if (discount.type === "value") {
            newPrice = discount.value;
        }

        if (discount.round === "small") {
            return Math.floor(newPrice);
        }

        if (discount.round === "large") {
            return Math.ceil(newPrice);
        }

        return newPrice;
    }

    sendReview(params: SendReviewParams): Promise<ReviewResultV3> {
        return this.invoke("sendReview", {
            id: this.state.id,

            private: params.private,
            name: params.name,
            contact: params.contact,
            message: params.message,
            stars: params.stars,
        });
    }

    getDishImageUrl(dishOrId: DishResultV3 | number, size?: number): string {
        const placeholder = this.options.imagePlaceholders?.dish ?? "";

        const dish = typeof dishOrId === "number" ? this.getDish(dishOrId) : dishOrId;
        if (!dish) {
            return this.getSizedImageUrl(placeholder, size);
        }

        if (!dish.image) {
            return this.getSizedImageUrl(placeholder, size);
        }

        return this.getSizedImageUrl(dish.image, size);
    }

    getCategoryImageUrl(categoryOrId: CategoryResultV3 | number, size?: number): string {
        const placeholder = this.options.imagePlaceholders?.category ?? "";

        const category = typeof categoryOrId === "number" ? this.getCategory(categoryOrId) : categoryOrId;
        if (!category) {
            return this.getSizedImageUrl(placeholder, size);
        }

        if (!category.image) {
            let image = placeholder;

            // find first dish with image
            for (const dish of this.getCategoryDishes(category)) {
                if (dish.image) {
                    image = dish.image;
                    break
                }
            }

            return this.getSizedImageUrl(image, size);
        }

        return this.getSizedImageUrl(category.image, size);
    }

    getMenuImageUrl(menuOrId: MenuResultV3 | number, size?: number): string {
        const placeholder = this.options.imagePlaceholders?.menu ?? "";

        const menu = typeof menuOrId === "number" ? this.getMenu(menuOrId) : menuOrId;
        if (!menu) {
            return this.getSizedImageUrl(placeholder, size);
        }

        if (!menu.image) {
            return this.getSizedImageUrl(placeholder, size);
        }

        return this.getSizedImageUrl(menu.image, size);
    }

    getSizedImageUrl(url: string, size?: number): string {
        if (size) {
            return `${url}?s=${size}`;
        }

        return url;
    }

    private hydrateCart(): void {
        const cartStateFromStorage = this.storage.getItem(this.storageKey("cart"));
        if (!cartStateFromStorage) {
            return;
        }

        try {
            Object.assign(this.cart, cartStateFromStorage);
        } catch (e) {
            console.error(e);

            this.storage.removeItem(this.storageKey("cart"));
        }
    }

    private storageKey(key: string) {
        const cafeId = this.state.cafe?.id;

        return `${cafeId}_${key}`;
    }
}

type ItemWithSlugOrHashId = MenuResultV3 | CategoryResultV3 | DishResultV3 | TagResultV3 | AdvertisementResultV3;

export function createStorinka(options: StorinkaOptions = {}): Storinka {
    return new Storinka(options);
}

declare module '@vue/runtime-core' {
    export interface ComponentCustomProperties {
        $storinka: Storinka;
    }
}
