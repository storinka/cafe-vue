import { App, reactive, ref, ToRef, watch } from "vue";
import {
    AdvertisementResultV3,
    CafeResultV3,
    CartItem,
    CartSubitem,
    CategoryResultV3,
    DeliveryZoneResultV2,
    DiscountResultV3,
    DishResultV3,
    DishVariantResultV3,
    MadeOrderResultV2,
    MenuResultV3,
    OptionItemResultV3,
    OptionResultV3,
    OrderResultV2,
    ReviewResultV3,
    SendReviewParams,
    SetResultV3,
    SupportedLanguageV2,
    TagResultV3
} from "./types";
import Cart, { OrderItemInputV3 } from "@storinka/cart";
import { StorinkaAnalytics, StorinkaAnalyticsOptions } from "./analytics";

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
    keepOrders?: boolean;
    keepReviews?: boolean;

    loadSkinConfig?: boolean;

    imagePlaceholders?: StorinkaImagePlaceholdersOption;

    analytics?: StorinkaAnalyticsOptions;
}

export class ApiError extends Error {
    code: number;
    name: string;
    message: string;

    constructor(code: number, name: string, message: string) {
        super(message);

        this.code = code;
        this.name = name;
        this.message = message;
    }
}

type JSONValue = number | string | boolean | null | { [key: string]: JSONValue; } | JSONValue[];

export interface StorinkaStorage {
    setItem(key: string, value: any): void;

    removeItem(key: string): void;

    getItem<T = JSONValue>(key: string, defaultValue?: T): T | null;
}

export class StorinkaLocalStorage implements StorinkaStorage {
    static KEY_PREFIX = "__strk_";

    getItem<T = JSONValue>(key: string, defaultValue?: T): T | null {
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

interface StorinkaIndices {
    dishById: Map<number | string, DishResultV3>;
    categoryById: Map<number | string, CategoryResultV3>;
    variantById: Map<number | string, DishVariantResultV3>;

    categoriesByMenu: Map<MenuResultV3, CategoryResultV3[]>;
    dishesByCategory: Map<CategoryResultV3, DishResultV3[]>;

    dishByVariant: Map<DishVariantResultV3, DishResultV3>;
}

export class Storinka {
    private indexed: boolean;
    private indices: StorinkaIndices;

    options: StorinkaOptions;

    state: {
        isLoading: boolean;
        id?: string;
        cafe?: CafeResultV3;
        language: string;
        skinConfig?: any;
        loadingError?: Error | ApiError | any;
    };

    cart: Cart;
    orders: ToRef<OrderResultV2[]>;
    reviews: ToRef<ReviewResultV3[]>;

    storage: StorinkaStorage;

    analytics: StorinkaAnalytics;

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
        if (this.options.keepOrders === undefined) {
            this.options.keepOrders = true;
        }
        if (this.options.keepReviews === undefined) {
            this.options.keepReviews = true;
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
        if (!this.options.analytics) {
            this.options.analytics = {};
        }

        this.state = reactive({
            isLoading: false,
            language: this.getBrowserLanguage(),
        });

        this.cart = reactive(new Cart());
        this.orders = ref<OrderResultV2[]>([]);
        this.reviews = ref<ReviewResultV3[]>([]);

        this.storage = new StorinkaLocalStorage();

        this.analytics = new StorinkaAnalytics(this.options.analytics);

        if (this.options.keepCart) {
            watch(this.cart, cart => {
                this.storage.setItem(this.storageKey("cart"), cart);
            }, { deep: true });
        }

        if (this.options.keepOrders) {
            watch(this.orders, orders => {
                this.storage.setItem(this.storageKey("orders"), orders);
            }, { deep: true });
        }

        if (this.options.keepReviews) {
            watch(this.reviews, reviews => {
                this.storage.setItem(this.storageKey("reviews"), reviews);
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

        this.indexed = false;
        this.indices = this.reindex();
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

        this.state.loadingError = undefined;

        this.indexed = false;

        return this.invoke("getCafe", {
            id,
            language,
        })
            .catch(error => {
                this.state.loadingError = error;

                throw error;
            })
            .then(async (cafe) => {
                this.state.cafe = cafe;

                this.reindex();

                if (this.options.loadSkinConfig) {
                    await this.loadSkinConfig();
                }

                if (this.options.keepCart) {
                    this.hydrateCart();
                }

                if (this.options.keepOrders) {
                    this.hydrateOrders();
                }

                if (this.options.keepReviews) {
                    this.hydrateReviews();
                }

                return cafe;
            })
            .finally(() => {
                this.state.isLoading = false;
            })
    }

    setLanguage(language: string): Promise<CafeResultV3> {
        this.state.isLoading = true;

        this.state.language = language;
        this.storage.setItem("language", language);

        this.state.loadingError = undefined;

        this.indexed = false;

        return this.invoke("getCafe", {
            id: this.state.id,
            language,
        })
            .catch(error => {
                this.state.loadingError = error;

                throw error;
            })
            .then((cafe) => {
                this.state.cafe = cafe;

                this.reindex();

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
        if (this.indexed) {
            return this.indices.categoryById.get(categoryId);
        }

        return (this.state.cafe?.categories ?? [])
            .find(category => this.checkItemId(category, categoryId));
    }

    getDish(dishId: number | string): DishResultV3 | undefined {
        if (this.indexed) {
            return this.indices.dishById.get(dishId);
        }

        return (this.state.cafe?.dishes ?? [])
            .find(dish => this.checkItemId(dish, dishId));
    }

    getDishByVariant(variantId: number): DishResultV3 | undefined {
        if (variantId === 0) {
            throw new Error("Variant id cannot be zero.")
        }

        if (this.indexed) {
            const variant = this.getVariant(variantId);
            if (!variant) {
                return undefined;
            }

            return this.indices.dishByVariant.get(variant);
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

        if (this.indexed) {
            return this.indices.variantById.get(variantId);
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

        if (this.indexed) {
            return this.indices.categoriesByMenu.get(menu) ?? [];
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

        if (this.indexed) {
            return this.indices.dishesByCategory.get(category) ?? [];
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
        }).then((review: ReviewResultV3) => {
            this.reviews.value = [review, ...this.reviews.value];

            return review;
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

    checkDeliveryAddress(lat: number, lng: number): Promise<DeliveryZoneResultV2 | null> {
        return this.invoke("getDeliveryZoneByCoordinates", {
            cafe_id: this.state.cafe?.id,
            lat,
            lng
        }).then(deliveryZone => {
            return deliveryZone as DeliveryZoneResultV2;
        }).catch(error => {
            if (error instanceof ApiError) {
                if (error.name === "DELIVERY_ZONE_NOT_FOUND") {
                    return null;
                }
            }

            throw error;
        });
    }

    checkout(cleanItems: boolean = true): Promise<MadeOrderResultV2> {
        return this.invoke("makeOrder", {
            cafe_id: this.state.cafe?.id,
            order: this.cart.buildOrder(),
        }).then((madeOrder: MadeOrderResultV2) => {
            if (cleanItems) {
                this.cart.items = [];
            }

            this.orders.value = [madeOrder.order, ...this.orders.value];

            return madeOrder;
        });
    }

    getLocalOrders(): OrderResultV2[] {
        return this.orders.value;
    }

    getLocalReviews(): ReviewResultV3[] {
        return this.reviews.value;
    }

    getSupportedLanguages(): Promise<SupportedLanguageV2[]> {
        return this.invoke("getSupportedLanguages");
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

    private hydrateOrders(): void {
        const ordersFromStorage: OrderResultV2[] = this.storage.getItem(this.storageKey("orders")) ?? [];
        if (!ordersFromStorage) {
            return;
        }

        try {
            this.orders.value = ordersFromStorage;
        } catch (e) {
            console.error(e);
        }
    }

    private hydrateReviews(): void {
        const reviewsFromStorage: ReviewResultV3[] = this.storage.getItem(this.storageKey("reviews")) ?? [];
        if (!reviewsFromStorage) {
            return;
        }

        try {
            this.reviews.value = reviewsFromStorage;
        } catch (e) {
            console.error(e);
        }
    }

    private storageKey(key: string) {
        const cafeId = this.state.cafe?.id;

        return `${cafeId}_${key}`;
    }

    private reindex(): StorinkaIndices {
        const cafe = this.state.cafe;
        if (!cafe) {
            this.indexed = false;

            return {
                categoryById: new Map(),
                dishById: new Map(),
                variantById: new Map(),

                categoriesByMenu: new Map(),
                dishesByCategory: new Map(),

                dishByVariant: new Map(),
            }
        }

        const categoriesById: Map<number | string, CategoryResultV3> = new Map();
        cafe.categories.forEach(category => {
            categoriesById.set(category.id, category);
            categoriesById.set(category.hash_id, category);

            if (category.slug) {
                categoriesById.set(category.slug, category);
            }
        });

        const dishesById: Map<number | string, DishResultV3> = new Map();
        cafe.dishes.forEach(dish => {
            dishesById.set(dish.id, dish);
            dishesById.set(dish.hash_id, dish);

            if (dish.slug) {
                dishesById.set(dish.slug, dish);
            }
        });

        const variantsById: Map<number | string, DishVariantResultV3> = new Map();
        cafe.dishes
            .flatMap(dish => dish.variants)
            .filter(variant => variant.id !== 0)
            .forEach(variant => {
                variantsById.set(variant.id, variant);
            });

        const categoriesByMenu: Map<MenuResultV3, CategoryResultV3[]> = new Map();
        cafe.menus.forEach(menu => {
            categoriesByMenu.set(menu, this.getMenuCategories(menu));
        });

        const dishesByCategory: Map<CategoryResultV3, DishResultV3[]> = new Map();
        cafe.categories.forEach(category => {
            dishesByCategory.set(category, this.getCategoryDishes(category));
        });

        const dishByVariant: Map<DishVariantResultV3, DishResultV3> = new Map();
        cafe.dishes
            .flatMap(dish => dish.variants.map(variant => ({ variant, dish })))
            .filter(({ variant }) => variant.id !== 0)
            .forEach(({ variant, dish }) => {
                dishByVariant.set(variant, dish);
            });

        this.indexed = true;

        return this.indices = {
            categoryById: categoriesById,
            dishById: dishesById,
            variantById: variantsById,

            categoriesByMenu,
            dishesByCategory,

            dishByVariant,
        };
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


// search

export interface SearchResultCategory {
    id: number;
    dishes: number[];
}

export interface SearchResult {
    categoriesCount: number;
    dishesCount: number;

    categories: SearchResultCategory[];
}

function words(text: string): string[] {
    return text
        .split(" ")
        .map((str) => str.trim());
}

function wordsIntersect(textA: string[], textB: string[]): boolean {
    for (const wordA of textA) {
        for (const wordB of textB) {
            if (wordA.includes(wordB) || wordB.includes(wordA)) {
                return true;
            }
        }
    }

    return false;
}

export function search(cafe: CafeResultV3, query: string): SearchResult {
    query = query.toLowerCase();

    const queryWords = words(query);

    const categories = cafe.categories.filter((category) => {
        const nameWords = words(category.name.toLowerCase());

        return wordsIntersect(queryWords, nameWords);
    });

    const mappedCategories = categories.map((category) => {
        const dishes: DishResultV3[] = category.dishes_ids
            .map((dishId) => cafe.dishes.find((dish) => dish.id === dishId))
            .filter((dish) => dish) as DishResultV3[];

        const dishesIds = dishes
            .filter((dish) => {
                const nameWords = words(dish.name.toLowerCase());

                return wordsIntersect(queryWords, nameWords);
            })
            .map((dish) => dish.id);

        return {
            id: category.id,
            dishes: dishesIds,
        };
    });

    return {
        categoriesCount: mappedCategories.length,
        dishesCount: mappedCategories
            .map((category) => category.dishes.length)
            .reduce((a, b) => a + b, 0),

        categories: mappedCategories,
    };
}


// analytics
