import { App, reactive } from "vue";
import {
    AdvertisementResultV3,
    CafeResultV3,
    CategoryResultV3,
    DishResultV3,
    MenuResultV3,
    TagResultV3
} from "./types";

export * from "./types";

export interface StorinkaOptions {
    apiUrl?: string;
    apiVersion?: string;
    domain?: string;
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

export class Storinka {
    options: StorinkaOptions;

    state: {
        isLoading: boolean;
        id?: string;
        cafe?: CafeResultV3;
    };

    constructor(options: StorinkaOptions) {
        this.options = options;
        if (!this.options.apiUrl) {
            this.options.apiUrl = "https://api.storinka.menu"
        }
        if (!this.options.apiVersion) {
            this.options.apiVersion = "3";
        }
        if (!this.options.domain) {
            this.options.domain = location.hostname;
        }

        this.state = reactive({
            isLoading: false,
        });
    }

    install(app: App): void {
        // @ts-ignore
        app.provide("storinka", this);

        // eslint-disable-next-line no-param-reassign
        app.config.globalProperties.$storinka = this;
    }

    setCafe(id: string, language: string): Promise<CafeResultV3> {
        this.state.isLoading = true;
        this.state.id = id;

        return this.invoke("getCafe", {
            id,
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

    setLanguage(language: string): Promise<CafeResultV3> {
        this.state.isLoading = true;

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

    invoke(name: string, params: any = {}): Promise<any> {
        return fetch(
            `${this.options.apiUrl}/invoke/${this.options.apiVersion}/${name}`,
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

    getMenu(menuId: number): MenuResultV3 | undefined {
        return this.state.cafe?.menus.find(menu => menu.id === menuId);
    }

    getCategory(categoryId: number): CategoryResultV3 | undefined {
        return this.state.cafe?.categories.find(category => category.id === categoryId);
    }

    getDish(dishId: number): DishResultV3 | undefined {
        return this.state.cafe?.dishes.find(dish => dish.id === dishId);
    }

    getOption(optionId: number) {
        return this.state.cafe?.options.find(option => option.id === optionId);
    }

    getTag(tagId: number) {
        return this.state.cafe?.tags.find(tag => tag.id === tagId);
    }

    getDiscount(discountId: number) {
        return this.state.cafe?.discounts.find(discount => discount.id === discountId);
    }

    getAdvertisement(advertisementId: number) {
        return this.state.cafe?.advertisements.find(advertisement => advertisement.id === advertisementId);
    }

    getSet(setId: number) {
        return this.state.cafe?.sets.find(set => set.id === setId);
    }

    getMenuCategories(menuId: number): CategoryResultV3[] {
        const menu = this.getMenu(menuId);

        if (!menu) {
            return [];
        }

        return menu.categories_ids
            .map(categoryId => this.getCategory(categoryId))
            .filter(category => category) as CategoryResultV3[];
    }

    getCategoryDishes(categoryId: number): DishResultV3[] {
        const category = this.getCategory(categoryId);

        if (!category) {
            return [];
        }

        return category.dishes_ids
            .map(dishId => this.getDish(dishId))
            .filter(dish => dish) as DishResultV3[];
    }

    getDishTags(dishId: number): TagResultV3[] {
        if (!this.state.cafe) {
            return [];
        }

        return this.state.cafe.tags
            .filter((tag: TagResultV3) => tag.dishes_ids.includes(dishId));
    }

    getAppUrl(path: string): string {
        if (this.isCustomDomain()) {
            return `${this.options.domain}/${path}`;
        }

        return `${this.options.domain}/${this.state.id}/${path}`
    }

    getMenuUrl(menu: MenuResultV3) {
        return this.getAppUrl(`${this.getItemProperId(menu)}`)
    }

    getCategoryUrl(menu: MenuResultV3, category: CategoryResultV3) {
        return this.getAppUrl(`${this.getItemProperId(menu)}/${this.getItemProperId(category)}`)
    }

    getDishUrl(menu: MenuResultV3, category: CategoryResultV3, dish: DishResultV3) {
        return this.getAppUrl(`${this.getItemProperId(menu)}/${this.getItemProperId(category)}/${this.getItemProperId(dish)}`)
    }

    getItemProperId(item: MenuResultV3 | CategoryResultV3 | DishResultV3 | TagResultV3 | AdvertisementResultV3) {
        return item.slug || item.hash_id || item.id;
    }

    isCustomDomain(domain?: string) {
        if (!domain) {
            domain = this.options.domain || "";
        }

        return !(["storinka.menu", "storinka.delivery"].includes(domain));
    }
}

export function createStorinka(options: StorinkaOptions = {}): Storinka {
    return new Storinka(options);
}

declare module '@vue/runtime-core' {
    export interface ComponentCustomProperties {
        $storinka: Storinka;
    }
}
